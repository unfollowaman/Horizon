/**
 * auth-login Edge Function — Unit Tests
 *
 * Tests use dependency injection (HandlerDeps) to avoid live Supabase connections.
 * The pattern follows supabase/functions/subscribe-push/test.ts.
 *
 * Run with: deno test --allow-env supabase/functions/auth-login/test.ts
 */

import { assertEquals } from "jsr:@std/assert";
import {
  buildDeviceInfo,
  extractSessionId,
  getCorsHeaders,
  handleRequest,
  isValidEmail,
  MAX_BODY_BYTES,
  MAX_EMAIL_LENGTH,
  MAX_PASSWORD_LENGTH,
  type SessionReplacedPayload,
} from "./index.ts";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/** Encodes a JWT payload (without signing — only for extractSessionId tests). */
function makeJwtWithPayload(payload: Record<string, unknown>): string {
  const encoded = btoa(JSON.stringify(payload))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
  return `header.${encoded}.signature`;
}

/** Creates a minimal valid auth session mock. */
function makeSession(sessionId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890") {
  const payload = {
    sub: "user-uuid-1234",
    session_id: sessionId,
    exp: Math.floor(Date.now() / 1000) + 3600,
  };
  const accessToken = makeJwtWithPayload(payload);
  return {
    access_token: accessToken,
    refresh_token: "test-refresh-token",
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: "bearer",
  };
}

/** Creates a minimal valid user mock. */
function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: "user-uuid-1234",
    email: "student@example.com",
    email_confirmed_at: "2026-01-01T00:00:00Z",
    app_metadata: { role: "student" },
    user_metadata: {},
    ...overrides,
  };
}

/** Creates a mock auth client that returns the given outcome. */
function makeAuthClient(
  outcome:
    | { session: ReturnType<typeof makeSession>; user: ReturnType<typeof makeUser> }
    | { error: { status: number; message: string } }
    | null,
) {
  return {
    auth: {
      signInWithPassword: async () => {
        if (!outcome) {
          return { data: { session: null, user: null }, error: null };
        }
        if ("error" in outcome) {
          return { data: { session: null, user: null }, error: outcome.error };
        }
        return { data: outcome, error: null };
      },
    },
  };
}

/** Creates a mock admin client that returns the given RPC outcome. */
function makeAdminClient(
  rpcData: Record<string, unknown> | null,
  rpcError: { code?: string; message?: string } | null = null,
) {
  return {
    rpc: async (
      _fn: string,
      _args: Record<string, unknown>,
    ) => ({ data: rpcData, error: rpcError }),
  };
}

/** No-op broadcast function. */
const noBroadcast = async (
  _url: string,
  _key: string,
  _userId: string,
  _payload: SessionReplacedPayload,
) => {};

/** Creates a standard successful POST request with valid credentials. */
function makeLoginRequest(
  body: Record<string, unknown> = {
    email: "student@example.com",
    password: "correct-password",
  },
  extraHeaders: Record<string, string> = {},
): Request {
  return new Request("https://edge.supabase.co/functions/v1/auth-login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Origin": "https://unfollowaman.tech",
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// Pure utility tests
// ---------------------------------------------------------------------------

Deno.test("isValidEmail — accepts valid addresses", () => {
  assertEquals(isValidEmail("user@example.com"), true);
  assertEquals(isValidEmail("a.b+tag@sub.domain.co.uk"), true);
});

Deno.test("isValidEmail — rejects invalid values", () => {
  assertEquals(isValidEmail(""), false);
  assertEquals(isValidEmail("notanemail"), false);
  assertEquals(isValidEmail("missing@tld"), false);
  assertEquals(isValidEmail("@nodomain.com"), false);
  assertEquals(isValidEmail(null), false);
  assertEquals(isValidEmail(123), false);
  assertEquals(isValidEmail("a".repeat(MAX_EMAIL_LENGTH + 1) + "@b.com"), false);
});

Deno.test("extractSessionId — returns UUID from valid JWT payload", () => {
  const uuid = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
  const token = makeJwtWithPayload({ session_id: uuid, sub: "user-1" });
  assertEquals(extractSessionId(token), uuid);
});

Deno.test("extractSessionId — accepts uppercase UUID", () => {
  const uuid = "A1B2C3D4-E5F6-7890-ABCD-EF1234567890";
  const token = makeJwtWithPayload({ session_id: uuid });
  assertEquals(extractSessionId(token), uuid);
});

Deno.test("extractSessionId — returns null when session_id absent", () => {
  const token = makeJwtWithPayload({ sub: "user-1" });
  assertEquals(extractSessionId(token), null);
});

Deno.test("extractSessionId — returns null when session_id is not a UUID", () => {
  const token = makeJwtWithPayload({ session_id: "not-a-uuid" });
  assertEquals(extractSessionId(token), null);
});

Deno.test("extractSessionId — returns null when session_id is empty string", () => {
  const token = makeJwtWithPayload({ session_id: "" });
  assertEquals(extractSessionId(token), null);
});

Deno.test("extractSessionId — returns null for token with wrong number of parts", () => {
  assertEquals(extractSessionId("only.two"), null);
  assertEquals(extractSessionId("too.many.parts.here"), null);
  assertEquals(extractSessionId(""), null);
});

Deno.test("extractSessionId — returns null for malformed base64 payload", () => {
  assertEquals(extractSessionId("header.!!!invalid_base64!!!.sig"), null);
});

Deno.test("buildDeviceInfo — truncates User-Agent to 512 characters", () => {
  const longUA = "X".repeat(1000);
  const req = new Request("https://example.com", {
    method: "POST",
    headers: { "user-agent": longUA },
  });
  const info = buildDeviceInfo(req);
  assertEquals(typeof info.ua, "string");
  assertEquals((info.ua as string).length, 512);
});

Deno.test("buildDeviceInfo — returns empty string when User-Agent header absent", () => {
  const req = new Request("https://example.com", { method: "POST" });
  const info = buildDeviceInfo(req);
  assertEquals(info.ua, "");
});

Deno.test("getCorsHeaders — returns matched origin for production domain", () => {
  const headers = getCorsHeaders("https://unfollowaman.tech");
  assertEquals(headers["Access-Control-Allow-Origin"], "https://unfollowaman.tech");
  assertEquals(headers["Vary"], "Origin");
});

Deno.test("getCorsHeaders — returns matched origin for localhost:5173", () => {
  const headers = getCorsHeaders("http://localhost:5173");
  assertEquals(headers["Access-Control-Allow-Origin"], "http://localhost:5173");
});

Deno.test("getCorsHeaders — falls back to production domain for untrusted origin", () => {
  const headers = getCorsHeaders("https://evil-attacker.com");
  assertEquals(headers["Access-Control-Allow-Origin"], "https://unfollowaman.tech");
  assertEquals(headers["Access-Control-Allow-Origin"] !== "*", true);
});

Deno.test("getCorsHeaders — falls back when origin is null", () => {
  assertEquals(
    getCorsHeaders(null)["Access-Control-Allow-Origin"],
    "https://unfollowaman.tech",
  );
});

Deno.test("getCorsHeaders — does not expose authorization header (unauthenticated endpoint)", () => {
  const headers = getCorsHeaders("https://unfollowaman.tech");
  assertEquals(
    headers["Access-Control-Allow-Headers"].includes("authorization"),
    false,
  );
});

// ---------------------------------------------------------------------------
// handleRequest — HTTP method and content-type enforcement
// ---------------------------------------------------------------------------

Deno.test("OPTIONS request returns 200 with CORS headers for allowed origin", async () => {
  const req = new Request("https://edge.supabase.co/functions/v1/auth-login", {
    method: "OPTIONS",
    headers: { "Origin": "http://localhost:5173" },
  });
  const res = await handleRequest(req);
  assertEquals(res.status, 200);
  assertEquals(
    res.headers.get("Access-Control-Allow-Origin"),
    "http://localhost:5173",
  );
  assertEquals(res.headers.get("Access-Control-Allow-Methods"), "POST, OPTIONS");
  assertEquals(res.headers.get("Vary"), "Origin");
});

Deno.test("OPTIONS request with untrusted origin falls back to production domain", async () => {
  const req = new Request("https://edge.supabase.co/functions/v1/auth-login", {
    method: "OPTIONS",
    headers: { "Origin": "https://malicious-site.com" },
  });
  const res = await handleRequest(req);
  assertEquals(res.status, 200);
  assertEquals(
    res.headers.get("Access-Control-Allow-Origin"),
    "https://unfollowaman.tech",
  );
});

Deno.test("GET request returns 405 Method Not Allowed", async () => {
  const req = new Request("https://edge.supabase.co/functions/v1/auth-login", {
    method: "GET",
  });
  const res = await handleRequest(req);
  assertEquals(res.status, 405);
  const data = await res.json();
  assertEquals(data.success, false);
  assertEquals(data.error, "Method not allowed");
});

Deno.test("PUT request returns 405 Method Not Allowed", async () => {
  const req = new Request("https://edge.supabase.co/functions/v1/auth-login", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  const res = await handleRequest(req);
  assertEquals(res.status, 405);
});

Deno.test("Missing Content-Type returns 415 Unsupported Media Type", async () => {
  const req = new Request("https://edge.supabase.co/functions/v1/auth-login", {
    method: "POST",
    body: JSON.stringify({ email: "a@b.com", password: "pass" }),
  });
  const res = await handleRequest(req);
  assertEquals(res.status, 415);
  const data = await res.json();
  assertEquals(data.success, false);
});

Deno.test("text/plain Content-Type returns 415 Unsupported Media Type", async () => {
  const req = new Request("https://edge.supabase.co/functions/v1/auth-login", {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: "not json",
  });
  const res = await handleRequest(req);
  assertEquals(res.status, 415);
});

// ---------------------------------------------------------------------------
// handleRequest — body size enforcement
// ---------------------------------------------------------------------------

Deno.test("Content-Length header exceeding limit returns 413", async () => {
  const req = new Request("https://edge.supabase.co/functions/v1/auth-login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": String(MAX_BODY_BYTES + 1),
    },
    body: JSON.stringify({ email: "a@b.com", password: "p" }),
  });
  const res = await handleRequest(req);
  assertEquals(res.status, 413);
  const data = await res.json();
  assertEquals(data.success, false);
  assertEquals(data.error, "Request payload too large");
});

Deno.test("Body text exceeding MAX_BODY_BYTES returns 413", async () => {
  const oversizedBody = JSON.stringify({
    email: "a@b.com",
    password: "p",
    extra: "X".repeat(MAX_BODY_BYTES + 1),
  });
  const req = new Request("https://edge.supabase.co/functions/v1/auth-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: oversizedBody,
  });
  const res = await handleRequest(req);
  assertEquals(res.status, 413);
});

// ---------------------------------------------------------------------------
// handleRequest — input validation
// ---------------------------------------------------------------------------

Deno.test("Malformed JSON body returns 400", async () => {
  const req = new Request("https://edge.supabase.co/functions/v1/auth-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{not valid json",
  });
  const res = await handleRequest(req);
  assertEquals(res.status, 400);
  const data = await res.json();
  assertEquals(data.success, false);
  assertEquals(data.error, "Invalid JSON payload");
});

Deno.test("JSON array body returns 400", async () => {
  const req = new Request("https://edge.supabase.co/functions/v1/auth-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "[1, 2, 3]",
  });
  const res = await handleRequest(req);
  assertEquals(res.status, 400);
});

Deno.test("Missing email field returns 400 with generic error", async () => {
  const req = makeLoginRequest({ password: "password123" });
  const res = await handleRequest(req);
  assertEquals(res.status, 400);
  const data = await res.json();
  assertEquals(data.success, false);
  assertEquals(data.error, "Invalid request");
});

Deno.test("Invalid email format returns 400 with generic error", async () => {
  const req = makeLoginRequest({ email: "notanemail", password: "password123" });
  const res = await handleRequest(req);
  assertEquals(res.status, 400);
  const data = await res.json();
  assertEquals(data.error, "Invalid request");
});

Deno.test("Missing password field returns 400 with generic error", async () => {
  const req = makeLoginRequest({ email: "a@b.com" });
  const res = await handleRequest(req);
  assertEquals(res.status, 400);
  const data = await res.json();
  assertEquals(data.error, "Invalid request");
});

Deno.test("Empty password returns 400 with generic error", async () => {
  const req = makeLoginRequest({ email: "a@b.com", password: "" });
  const res = await handleRequest(req);
  assertEquals(res.status, 400);
});

Deno.test("Password exceeding MAX_PASSWORD_LENGTH returns 400", async () => {
  const req = makeLoginRequest({
    email: "a@b.com",
    password: "X".repeat(MAX_PASSWORD_LENGTH + 1),
  });
  const res = await handleRequest(req);
  assertEquals(res.status, 400);
  const data = await res.json();
  assertEquals(data.error, "Invalid request");
});

Deno.test("Email exceeding MAX_EMAIL_LENGTH returns 400", async () => {
  const req = makeLoginRequest({
    email: "a".repeat(MAX_EMAIL_LENGTH) + "@b.com",
    password: "password123",
  });
  const res = await handleRequest(req);
  assertEquals(res.status, 400);
});

// ---------------------------------------------------------------------------
// handleRequest — authentication failures
// ---------------------------------------------------------------------------

Deno.test("signInWithPassword error returns 401 with generic message (no account enumeration)", async () => {
  const req = makeLoginRequest();
  const res = await handleRequest(req, {
    authClient: makeAuthClient({ error: { status: 400, message: "Invalid login credentials" } }),
    adminClient: makeAdminClient(null),
    broadcastFn: noBroadcast,
  });
  assertEquals(res.status, 401);
  const data = await res.json();
  assertEquals(data.success, false);
  assertEquals(data.error, "Invalid email or password");
  // Must not reveal whether the account exists
  assertEquals(data.error.includes("account"), false);
  assertEquals(data.error.includes("email"), false);
});

Deno.test("signInWithPassword returning null session returns 401", async () => {
  const req = makeLoginRequest();
  const res = await handleRequest(req, {
    authClient: makeAuthClient(null),
    adminClient: makeAdminClient(null),
    broadcastFn: noBroadcast,
  });
  assertEquals(res.status, 401);
  const data = await res.json();
  assertEquals(data.success, false);
});

// ---------------------------------------------------------------------------
// handleRequest — email confirmation gate
// ---------------------------------------------------------------------------

Deno.test("Unconfirmed email returns 403 with EMAIL_NOT_CONFIRMED error_code", async () => {
  const session = makeSession();
  const user = makeUser({ email_confirmed_at: null });
  const req = makeLoginRequest();
  const res = await handleRequest(req, {
    authClient: makeAuthClient({ session, user }),
    adminClient: makeAdminClient(null),
    broadcastFn: noBroadcast,
  });
  assertEquals(res.status, 403);
  const data = await res.json();
  assertEquals(data.success, false);
  assertEquals(data.error_code, "EMAIL_NOT_CONFIRMED");
  // Message must guide the user, not reveal internal implementation
  assertEquals(typeof data.error, "string");
  assertEquals(data.error.length > 0, true);
  // Tokens must NOT be returned
  assertEquals(data.access_token, undefined);
  assertEquals(data.refresh_token, undefined);
});

// ---------------------------------------------------------------------------
// handleRequest — JWT session_id extraction failure
// ---------------------------------------------------------------------------

Deno.test("JWT without session_id claim returns 500 and no tokens", async () => {
  // Craft a session with a JWT that lacks session_id
  const badPayload = { sub: "user-1", exp: 9999999999 };
  const badToken = makeJwtWithPayload(badPayload);
  const session = { ...makeSession(), access_token: badToken };
  const user = makeUser();

  const req = makeLoginRequest();
  const res = await handleRequest(req, {
    authClient: makeAuthClient({ session, user }),
    adminClient: makeAdminClient(null),
    broadcastFn: noBroadcast,
  });
  assertEquals(res.status, 500);
  const data = await res.json();
  assertEquals(data.success, false);
  assertEquals(data.access_token, undefined);
  assertEquals(data.refresh_token, undefined);
});

Deno.test("JWT with non-UUID session_id returns 500 and no tokens", async () => {
  const badPayload = { sub: "user-1", session_id: "not-a-uuid", exp: 9999999999 };
  const badToken = makeJwtWithPayload(badPayload);
  const session = { ...makeSession(), access_token: badToken };
  const user = makeUser();

  const req = makeLoginRequest();
  const res = await handleRequest(req, {
    authClient: makeAuthClient({ session, user }),
    adminClient: makeAdminClient(null),
    broadcastFn: noBroadcast,
  });
  assertEquals(res.status, 500);
  const data = await res.json();
  assertEquals(data.access_token, undefined);
});

// ---------------------------------------------------------------------------
// handleRequest — RPC transport error
// ---------------------------------------------------------------------------

Deno.test("RPC transport error returns 500 and no tokens", async () => {
  const session = makeSession();
  const user = makeUser();
  const req = makeLoginRequest();
  const res = await handleRequest(req, {
    authClient: makeAuthClient({ session, user }),
    adminClient: makeAdminClient(null, { code: "PGRST301", message: "timeout" }),
    broadcastFn: noBroadcast,
  });
  assertEquals(res.status, 500);
  const data = await res.json();
  assertEquals(data.success, false);
  assertEquals(data.access_token, undefined);
  assertEquals(data.refresh_token, undefined);
});

// ---------------------------------------------------------------------------
// handleRequest — all documented RPC error_code outcomes
// ---------------------------------------------------------------------------

Deno.test("RPC CONCURRENT_LOGIN_LOST returns 409 with CONCURRENT_LOGIN error_code", async () => {
  const session = makeSession();
  const user = makeUser();
  const req = makeLoginRequest();
  const res = await handleRequest(req, {
    authClient: makeAuthClient({ session, user }),
    adminClient: makeAdminClient({
      success: false,
      error_code: "CONCURRENT_LOGIN_LOST",
      active_session_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      session_epoch: 1,
    }),
    broadcastFn: noBroadcast,
  });
  assertEquals(res.status, 409);
  const data = await res.json();
  assertEquals(data.success, false);
  assertEquals(data.error_code, "CONCURRENT_LOGIN");
  assertEquals(data.access_token, undefined);
});

Deno.test("RPC INVALID_ARGUMENTS returns 500 and no tokens", async () => {
  const session = makeSession();
  const user = makeUser();
  const req = makeLoginRequest();
  const res = await handleRequest(req, {
    authClient: makeAuthClient({ session, user }),
    adminClient: makeAdminClient({ success: false, error_code: "INVALID_ARGUMENTS" }),
    broadcastFn: noBroadcast,
  });
  assertEquals(res.status, 500);
  const data = await res.json();
  assertEquals(data.success, false);
  assertEquals(data.access_token, undefined);
});

Deno.test("RPC DATABASE_ERROR returns 500 and no tokens", async () => {
  const session = makeSession();
  const user = makeUser();
  const req = makeLoginRequest();
  const res = await handleRequest(req, {
    authClient: makeAuthClient({ session, user }),
    adminClient: makeAdminClient({ success: false, error_code: "DATABASE_ERROR" }),
    broadcastFn: noBroadcast,
  });
  assertEquals(res.status, 500);
  const data = await res.json();
  assertEquals(data.success, false);
  assertEquals(data.access_token, undefined);
});

Deno.test("Unexpected RPC error_code returns 500 and no tokens", async () => {
  const session = makeSession();
  const user = makeUser();
  const req = makeLoginRequest();
  const res = await handleRequest(req, {
    authClient: makeAuthClient({ session, user }),
    adminClient: makeAdminClient({ success: false, error_code: "FUTURE_UNKNOWN_CODE" }),
    broadcastFn: noBroadcast,
  });
  assertEquals(res.status, 500);
  const data = await res.json();
  assertEquals(data.success, false);
  assertEquals(data.access_token, undefined);
});

Deno.test("RPC returning unexpected shape returns 500 and no tokens", async () => {
  const session = makeSession();
  const user = makeUser();
  const req = makeLoginRequest();
  const res = await handleRequest(req, {
    authClient: makeAuthClient({ session, user }),
    adminClient: makeAdminClient("unexpected_string" as unknown as Record<string, unknown>),
    broadcastFn: noBroadcast,
  });
  assertEquals(res.status, 500);
  const data = await res.json();
  assertEquals(data.success, false);
  assertEquals(data.access_token, undefined);
});

Deno.test("RPC returning null returns 500 and no tokens", async () => {
  const session = makeSession();
  const user = makeUser();
  const req = makeLoginRequest();
  const res = await handleRequest(req, {
    authClient: makeAuthClient({ session, user }),
    adminClient: makeAdminClient(null),
    broadcastFn: noBroadcast,
  });
  assertEquals(res.status, 500);
  const data = await res.json();
  assertEquals(data.success, false);
});

// ---------------------------------------------------------------------------
// handleRequest — successful login (no previous session)
// ---------------------------------------------------------------------------

Deno.test("Successful login with no prior session returns 200 with tokens and session_epoch", async () => {
  const session = makeSession();
  const user = makeUser();
  const req = makeLoginRequest();
  const res = await handleRequest(req, {
    authClient: makeAuthClient({ session, user }),
    adminClient: makeAdminClient({
      success: true,
      replaced_session_id: null,
      session_epoch: 1,
    }),
    broadcastFn: noBroadcast,
  });
  assertEquals(res.status, 200);
  const data = await res.json();
  assertEquals(data.success, true);
  assertEquals(typeof data.access_token, "string");
  assertEquals(typeof data.refresh_token, "string");
  assertEquals(data.session_epoch, 1);
  assertEquals(data.user.id, user.id);
  assertEquals(data.user.app_metadata, user.app_metadata);
  // Password must not appear in response
  assertEquals(JSON.stringify(data).includes("correct-password"), false);
});

Deno.test("Successful idempotent re-registration returns 200", async () => {
  const session = makeSession();
  const user = makeUser();
  const req = makeLoginRequest();
  const res = await handleRequest(req, {
    authClient: makeAuthClient({ session, user }),
    adminClient: makeAdminClient({
      success: true,
      replaced_session_id: null,
      session_epoch: 2,
      is_idempotent: true,
    }),
    broadcastFn: noBroadcast,
  });
  assertEquals(res.status, 200);
  const data = await res.json();
  assertEquals(data.success, true);
  assertEquals(data.session_epoch, 2);
});

// ---------------------------------------------------------------------------
// handleRequest — successful login with session replacement
// ---------------------------------------------------------------------------

Deno.test("Successful login replacing a prior session triggers broadcast and returns 200", async () => {
  const session = makeSession();
  const user = makeUser();
  const replacedId = "00000000-1111-2222-3333-444444444444";

  let broadcastCalled = false;
  let capturedPayload: SessionReplacedPayload | null = null;
  let capturedUserId = "";

  const mockBroadcast = async (
    _url: string,
    _key: string,
    userId: string,
    payload: SessionReplacedPayload,
  ) => {
    broadcastCalled = true;
    capturedUserId = userId;
    capturedPayload = payload;
  };

  const req = makeLoginRequest();
  const res = await handleRequest(req, {
    authClient: makeAuthClient({ session, user }),
    adminClient: makeAdminClient({
      success: true,
      replaced_session_id: replacedId,
      session_epoch: 3,
    }),
    broadcastFn: mockBroadcast,
  });

  assertEquals(res.status, 200);
  const data = await res.json();
  assertEquals(data.success, true);
  assertEquals(data.session_epoch, 3);

  assertEquals(broadcastCalled, true);
  assertEquals(capturedUserId, user.id);
  assertEquals(capturedPayload!.replaced_session_id, replacedId);
  assertEquals(capturedPayload!.session_epoch, 3);
  assertEquals(
    capturedPayload!.message,
    "You've been logged out because your account was signed in on another device or browser.",
  );
});

Deno.test("Broadcast failure is non-fatal — login still returns 200", async () => {
  const session = makeSession();
  const user = makeUser();

  const failingBroadcast = async () => {
    throw new Error("Realtime service unavailable");
  };

  const req = makeLoginRequest();
  const res = await handleRequest(req, {
    authClient: makeAuthClient({ session, user }),
    adminClient: makeAdminClient({
      success: true,
      replaced_session_id: "00000000-1111-2222-3333-444444444444",
      session_epoch: 4,
    }),
    broadcastFn: failingBroadcast,
  });

  assertEquals(res.status, 200);
  const data = await res.json();
  assertEquals(data.success, true);
});

Deno.test("No broadcast when replaced_session_id is null", async () => {
  const session = makeSession();
  const user = makeUser();

  let broadcastCalled = false;
  const trackingBroadcast = async () => {
    broadcastCalled = true;
  };

  const req = makeLoginRequest();
  await handleRequest(req, {
    authClient: makeAuthClient({ session, user }),
    adminClient: makeAdminClient({
      success: true,
      replaced_session_id: null,
      session_epoch: 1,
    }),
    broadcastFn: trackingBroadcast,
  });

  assertEquals(broadcastCalled, false);
});

// ---------------------------------------------------------------------------
// handleRequest — security: tokens must not appear in error responses
// ---------------------------------------------------------------------------

Deno.test("Error responses must never include access_token or refresh_token", async () => {
  const errorCases: Array<[string, ReturnType<typeof makeAdminClient>]> = [
    ["CONCURRENT_LOGIN_LOST", makeAdminClient({ success: false, error_code: "CONCURRENT_LOGIN_LOST" })],
    ["DATABASE_ERROR", makeAdminClient({ success: false, error_code: "DATABASE_ERROR" })],
    ["INVALID_ARGUMENTS", makeAdminClient({ success: false, error_code: "INVALID_ARGUMENTS" })],
  ];

  const session = makeSession();
  const user = makeUser();

  for (const [label, adminClient] of errorCases) {
    const req = makeLoginRequest();
    const res = await handleRequest(req, {
      authClient: makeAuthClient({ session, user }),
      adminClient,
      broadcastFn: noBroadcast,
    });
    const data = await res.json();
    assertEquals(
      data.access_token,
      undefined,
      `${label}: access_token must not appear in error response`,
    );
    assertEquals(
      data.refresh_token,
      undefined,
      `${label}: refresh_token must not appear in error response`,
    );
  }
});

// ---------------------------------------------------------------------------
// handleRequest — admin role preservation
// ---------------------------------------------------------------------------

Deno.test("admin app_metadata is included in success response user object", async () => {
  const session = makeSession();
  const user = makeUser({ app_metadata: { role: "admin", provider: "email" } });

  const req = makeLoginRequest();
  const res = await handleRequest(req, {
    authClient: makeAuthClient({ session, user }),
    adminClient: makeAdminClient({
      success: true,
      replaced_session_id: null,
      session_epoch: 1,
    }),
    broadcastFn: noBroadcast,
  });
  assertEquals(res.status, 200);
  const data = await res.json();
  assertEquals(data.user.app_metadata.role, "admin");
});
