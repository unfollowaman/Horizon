/**
 * auth-login Edge Function — Phase 1.2.2: Login Orchestrator
 *
 * This function is the sole entry point for password-based authentication.
 * It authenticates credentials server-side, registers the resulting session in the
 * authoritative single-device session registry, and only then returns the Auth
 * credentials to the frontend for safe session restoration.
 *
 * Security model:
 *   - verify_jwt = false: This endpoint is unauthenticated by design. It PERFORMS
 *     authentication rather than receiving an already-authenticated request.
 *   - Credentials and tokens are NEVER logged.
 *   - The SUPABASE_SERVICE_ROLE_KEY is never returned to the client.
 *   - Auth credentials are only returned after session registration succeeds.
 *   - Supabase Auth's built-in rate limit (30 sign-ins / 5 min / IP) applies to
 *     the internal signInWithPassword call.
 *
 * Session orphan limitation (documented):
 *   If signInWithPassword succeeds but register_active_session fails, a live but
 *   unregistered Auth session is created. Supabase Auth provides no per-session
 *   revocation API (only global or "others" revocation, both ruled out by
 *   architecture decisions). The orphaned session expires at JWT TTL (≤1 hour).
 *   Because tokens are never returned on failure, no browser can use it.
 */

import "jsr:@supabase/functions-js@^2/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// ---------------------------------------------------------------------------
// CORS configuration — identical to existing project functions
// ---------------------------------------------------------------------------

export const ALLOWED_ORIGINS = [
  "https://unfollowaman.tech",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:8000",
  "http://127.0.0.1:5173",
];

export function getCorsHeaders(
  requestOrigin?: string | null,
): Record<string, string> {
  const envOrigins = Deno.env.get("ALLOWED_ORIGINS")
    ? Deno.env.get("ALLOWED_ORIGINS")!.split(",").map((o) => o.trim()).filter(
      Boolean,
    )
    : [];
  const singleEnvOrigin = Deno.env.get("ALLOWED_ORIGIN")?.trim();
  if (singleEnvOrigin) {
    envOrigins.push(singleEnvOrigin);
  }

  const allowedList = [...ALLOWED_ORIGINS, ...envOrigins];

  let allowedOrigin = "https://unfollowaman.tech";
  if (requestOrigin && allowedList.includes(requestOrigin)) {
    allowedOrigin = requestOrigin;
  }

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    // Note: "authorization" header intentionally excluded — this endpoint does
    // not accept a Bearer token; it authenticates via email/password in the body.
    "Access-Control-Allow-Headers": "content-type, x-client-info, apikey",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

// ---------------------------------------------------------------------------
// Input limits
// ---------------------------------------------------------------------------

/** Maximum login request body in bytes. Login payloads are small. */
export const MAX_BODY_BYTES = 4096;

/** RFC 5321 maximum email address length. */
export const MAX_EMAIL_LENGTH = 320;

/**
 * bcrypt's effective maximum password input length.
 * Inputs beyond this are silently truncated by bcrypt, so accepting longer
 * values provides no security benefit and wastes CPU.
 */
export const MAX_PASSWORD_LENGTH = 72;

// ---------------------------------------------------------------------------
// Pure utility functions (exported for testability)
// ---------------------------------------------------------------------------

/**
 * Validates an email address with a minimal structural check.
 * Intentionally loose — Supabase Auth performs the authoritative validation.
 * This check only prevents obviously malformed values from reaching the Auth API.
 */
export function isValidEmail(email: unknown): boolean {
  if (typeof email !== "string") return false;
  if (email.length === 0 || email.length > MAX_EMAIL_LENGTH) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Extracts the `session_id` UUID from a Supabase Auth JWT access token.
 *
 * The token is NOT cryptographically verified here — we trust it because
 * it was just returned directly by the Supabase Auth server in the same
 * request. We only decode the payload to read the session_id claim.
 *
 * Returns null if the token is malformed, the claim is absent, or the value
 * is not a valid UUID string.
 */
export function extractSessionId(accessToken: string): string | null {
  try {
    const parts = accessToken.split(".");
    if (parts.length !== 3) return null;

    // Base64url → base64 conversion: replace URL-safe chars, add padding
    const base64Payload = parts[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    const padded = base64Payload +
      "=".repeat((4 - base64Payload.length % 4) % 4);

    const decoded = atob(padded);
    const claims = JSON.parse(decoded) as Record<string, unknown>;

    if (typeof claims.session_id !== "string" || !claims.session_id) {
      return null;
    }

    // Validate UUID format (8-4-4-4-12 hex)
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(claims.session_id)) {
      return null;
    }

    return claims.session_id;
  } catch {
    return null;
  }
}

/**
 * Builds a minimal, non-sensitive device info record.
 * Only the User-Agent string is recorded, truncated to 512 characters.
 * No fingerprinting, no IP addresses, no additional PII.
 */
export function buildDeviceInfo(
  req: Request,
): Record<string, unknown> {
  const rawUA = req.headers.get("user-agent") ?? "";
  return { ua: rawUA.slice(0, 512) };
}

// ---------------------------------------------------------------------------
// Realtime broadcast (server-side HTTP API)
// ---------------------------------------------------------------------------

export interface SessionReplacedPayload {
  message: string;
  replaced_session_id: string;
  session_epoch: unknown;
}

/**
 * Broadcasts a session_replaced event to the replaced session's Realtime
 * channel using the Supabase Realtime Broadcast REST API.
 *
 * This is a non-blocking, best-effort notification. The database registry
 * update (register_active_session) is the authoritative security control.
 * Failure here is logged but does not affect the login response.
 *
 * Uses the HTTP API rather than a WebSocket channel to avoid the overhead of
 * establishing a persistent connection in a short-lived Edge Function invocation.
 */
export async function broadcastSessionReplaced(
  supabaseUrl: string,
  serviceRoleKey: string,
  userId: string,
  payload: SessionReplacedPayload,
): Promise<void> {
  const url = `${supabaseUrl}/realtime/v1/api/broadcast`;
  await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${serviceRoleKey}`,
      "apikey": serviceRoleKey,
    },
    body: JSON.stringify({
      messages: [{
        topic: `user:${userId}`,
        event: "session_replaced",
        payload,
        // private: true ensures only authenticated clients subscribed to this
        // topic via the RLS policy receive the message.
        private: true,
      }],
    }),
  });
}

// ---------------------------------------------------------------------------
// RPC result types (matching register_active_session contract exactly)
// ---------------------------------------------------------------------------

/** All documented outcomes of register_active_session(). */
export type RegisterRpcResult =
  | {
    success: true;
    replaced_session_id: string | null;
    session_epoch: number;
    is_idempotent?: true;
  }
  | {
    success: false;
    error_code:
      | "CONCURRENT_LOGIN_LOST"
      | "INVALID_ARGUMENTS"
      | "DATABASE_ERROR";
    active_session_id?: string;
    session_epoch?: number;
  };

// ---------------------------------------------------------------------------
// Handler dependency injection (enables unit testing without live Supabase)
// ---------------------------------------------------------------------------

export interface HandlerDeps {
  // deno-lint-ignore no-explicit-any
  authClient?: any;
  // deno-lint-ignore no-explicit-any
  adminClient?: any;
  broadcastFn?: (
    supabaseUrl: string,
    serviceRoleKey: string,
    userId: string,
    payload: SessionReplacedPayload,
  ) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Request handler
// ---------------------------------------------------------------------------

export async function handleRequest(
  req: Request,
  deps?: HandlerDeps,
): Promise<Response> {
  const requestOrigin = req.headers.get("origin") ??
    req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(requestOrigin);

  // ── 1. CORS preflight ────────────────────────────────────────────────────
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // ── 2. Method enforcement ────────────────────────────────────────────────
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, error: "Method not allowed" }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // ── 3. Content-Type enforcement ──────────────────────────────────────────
  const contentType = req.headers.get("content-type") ??
    req.headers.get("Content-Type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Content-Type must be application/json",
      }),
      {
        status: 415,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // ── 4. Body size enforcement (content-length fast-path) ──────────────────
  const contentLengthHeader = req.headers.get("content-length");
  if (contentLengthHeader) {
    const cl = parseInt(contentLengthHeader, 10);
    if (!isNaN(cl) && cl > MAX_BODY_BYTES) {
      return new Response(
        JSON.stringify({ success: false, error: "Request payload too large" }),
        {
          status: 413,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
  }

  // ── 5. Parse and size-check body ─────────────────────────────────────────
  let body: Record<string, unknown>;
  try {
    const text = await req.text();
    if (text.length > MAX_BODY_BYTES) {
      return new Response(
        JSON.stringify({ success: false, error: "Request payload too large" }),
        {
          status: 413,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    const parsed: unknown = JSON.parse(text);
    if (
      parsed === null || typeof parsed !== "object" || Array.isArray(parsed)
    ) {
      throw new Error("Not a JSON object");
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: "Invalid JSON payload" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // ── 6. Input validation ──────────────────────────────────────────────────
  // Use a generic "Invalid request" message to avoid leaking field details to
  // potential attackers probing the endpoint.
  const { email, password } = body;

  if (!isValidEmail(email)) {
    return new Response(
      JSON.stringify({ success: false, error: "Invalid request" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  if (
    typeof password !== "string" ||
    password.length === 0 ||
    password.length > MAX_PASSWORD_LENGTH
  ) {
    return new Response(
      JSON.stringify({ success: false, error: "Invalid request" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // ── 7. Initialise Supabase clients ───────────────────────────────────────
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
    "";

  // Isolated auth client: no session persistence, no auto-refresh,
  // no shared state across requests.
  const authClient = deps?.authClient ??
    createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });

  // Service-role admin client: used only for register_active_session RPC
  // and Realtime broadcast. Never returned to the client.
  const adminClient = deps?.adminClient ??
    createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

  // Broadcast function: injectable for testing
  const broadcastFn = deps?.broadcastFn ?? broadcastSessionReplaced;

  // ── 8. Authenticate credentials ──────────────────────────────────────────
  // Supabase Auth's built-in rate limiter (sign_in_sign_ups = 30 per 5 min
  // per IP, configured in supabase/config.toml) applies to this call.
  // This is the primary abuse-protection mechanism for this endpoint.
  // Additional edge-level rate limiting (e.g., Deno KV token buckets) would
  // require infrastructure not present in this project and is deferred.
  const { data: authData, error: authError } = await authClient.auth
    .signInWithPassword({
      email: email as string,
      password: password as string,
    });

  if (authError || !authData?.session || !authData?.user) {
    // Log only the status code — never the credentials or any user identifier
    // at this stage, to avoid leaking account existence via log correlation.
    console.error(
      "auth-login: signInWithPassword failed, status:",
      authError?.status ?? "no_session",
    );
    // Deliberate generic message: prevents account-existence enumeration.
    return new Response(
      JSON.stringify({ success: false, error: "Invalid email or password" }),
      {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const { session, user } = authData;

  // ── 9. Email confirmation gate ───────────────────────────────────────────
  // Supabase Auth may issue a session for unconfirmed accounts when
  // enable_confirmations is false (local dev) or if confirmation was disabled
  // in production. We enforce this check explicitly as a security gate.
  //
  // Cleanup limitation: a live but unregistered Auth session now exists.
  // Supabase Auth has no per-session revocation API (auth.admin.signOut revokes
  // all or "others", both excluded by architecture decision §5). The session
  // expires at JWT TTL (≤1 hour). No browser receives the token so it cannot
  // be used.
  if (!user.email_confirmed_at) {
    console.error("auth-login: rejected unconfirmed email, user:", user.id);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Please confirm your email address before signing in.",
        error_code: "EMAIL_NOT_CONFIRMED",
      }),
      {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // ── 10. Extract session_id from JWT ──────────────────────────────────────
  // The token is NOT re-verified here (Supabase Auth verified it server-side).
  // We only decode to read the session_id claim needed for the registry.
  const sessionId = extractSessionId(session.access_token);
  if (!sessionId) {
    // Should never occur with a valid Supabase Auth response.
    console.error(
      "auth-login: failed to extract session_id from JWT, user:",
      user.id,
    );
    // Cleanup limitation applies (same as above).
    return new Response(
      JSON.stringify({
        success: false,
        error: "Authentication error. Please try again.",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // ── 11. Build device info ─────────────────────────────────────────────────
  const deviceInfo = buildDeviceInfo(req);

  // ── 12. Register active session via service-role RPC ─────────────────────
  // This is the authoritative security control. The session is not returned to
  // the client unless this succeeds.
  const { data: rpcData, error: rpcError } = await adminClient.rpc(
    "register_active_session",
    {
      p_user_id: user.id,
      p_session_id: sessionId,
      p_device_info: deviceInfo,
    },
  );

  // ── 13. Handle RPC transport error ───────────────────────────────────────
  if (rpcError) {
    // PostgREST/network-level failure (distinct from a business-logic failure
    // returned inside the JSONB result).
    // Cleanup limitation applies (orphaned Auth session, expires ≤1 hour).
    console.error(
      "auth-login: RPC transport error, user:",
      user.id,
      "code:",
      rpcError.code ?? "unknown",
    );
    return new Response(
      JSON.stringify({
        success: false,
        error: "Service temporarily unavailable. Please try again.",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // ── 14. Validate RPC response shape ──────────────────────────────────────
  if (!rpcData || typeof rpcData !== "object" || Array.isArray(rpcData)) {
    console.error(
      "auth-login: unexpected RPC response shape, user:",
      user.id,
      "shape:",
      typeof rpcData,
    );
    return new Response(
      JSON.stringify({
        success: false,
        error: "Service temporarily unavailable. Please try again.",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const result = rpcData as RegisterRpcResult;

  // ── 15. Handle all documented RPC outcomes explicitly ────────────────────
  if (result.success !== true) {
    const errorCode = "error_code" in result
      ? result.error_code
      : "UNKNOWN_ERROR";

    switch (errorCode) {
      case "CONCURRENT_LOGIN_LOST":
        // Another simultaneous login won the 750ms collision window.
        // The 750ms threshold is an accepted architecture trade-off (§1).
        console.error(
          "auth-login: CONCURRENT_LOGIN_LOST for user:",
          user.id,
        );
        return new Response(
          JSON.stringify({
            success: false,
            error:
              "Login conflict: another sign-in is in progress. Please try again in a moment.",
            error_code: "CONCURRENT_LOGIN",
          }),
          {
            status: 409,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );

      case "INVALID_ARGUMENTS":
        // Indicates a programming error — our validated inputs should never
        // produce INVALID_ARGUMENTS from register_active_session.
        console.error(
          "auth-login: INVALID_ARGUMENTS from RPC — programming error, user:",
          user.id,
        );
        return new Response(
          JSON.stringify({
            success: false,
            error: "Service temporarily unavailable. Please try again.",
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );

      case "DATABASE_ERROR":
        console.error("auth-login: DATABASE_ERROR from RPC, user:", user.id);
        return new Response(
          JSON.stringify({
            success: false,
            error: "Service temporarily unavailable. Please try again.",
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );

      default:
        // Any error_code not in the documented contract.
        console.error(
          "auth-login: unexpected error_code from RPC:",
          errorCode,
          "user:",
          user.id,
        );
        return new Response(
          JSON.stringify({
            success: false,
            error: "Service temporarily unavailable. Please try again.",
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
    }
  }

  // ── 16. Session registered. Broadcast replacement notification if needed ──
  const replacedSessionId = result.replaced_session_id;
  if (replacedSessionId && typeof replacedSessionId === "string") {
    // Non-blocking: broadcast failure does not affect login success.
    // The database registry is already the authoritative security control.
    // Phase 1.2.3 will add server-side enforcement; Phase 1.2.5 adds
    // the frontend Realtime subscription that listens for this event.
    try {
      await broadcastFn(supabaseUrl, supabaseServiceRoleKey, user.id, {
        message:
          "You've been logged out because your account was signed in on another device or browser.",
        replaced_session_id: replacedSessionId,
        session_epoch: result.session_epoch,
      });
    } catch (broadcastErr) {
      console.error(
        "auth-login: Realtime broadcast failed (non-fatal), user:",
        user.id,
        "error:",
        broadcastErr instanceof Error ? broadcastErr.message : "unknown",
      );
    }
  }

  // ── 17. Return Auth credentials to the frontend ───────────────────────────
  // The frontend will call supabase.auth.setSession({ access_token, refresh_token })
  // to restore the session into the Supabase JS SDK, triggering onAuthStateChange.
  //
  // SECURITY: access_token and refresh_token are sensitive. They are intentionally
  // NOT logged anywhere in this function. The console.error calls above log only
  // non-sensitive identifiers (user.id, error codes, status codes).
  return new Response(
    JSON.stringify({
      success: true,
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at,
      token_type: session.token_type ?? "bearer",
      user: {
        id: user.id,
        email: user.email,
        // app_metadata is Auth-server-managed (not user-editable).
        // Included so the frontend can read isAdmin without an extra round-trip.
        app_metadata: user.app_metadata,
        user_metadata: user.user_metadata,
        email_confirmed_at: user.email_confirmed_at,
      },
      session_epoch: result.session_epoch,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}

Deno.serve((req) => handleRequest(req));
