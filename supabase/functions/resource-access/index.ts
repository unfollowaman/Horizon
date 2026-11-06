import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

export const ALLOWED_ORIGINS = [
  "https://unfollowaman.tech",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:8000",
  "http://127.0.0.1:5173",
];

export function getCorsHeaders(requestOrigin?: string | null): Record<string, string> {
  const envOrigins = Deno.env.get("ALLOWED_ORIGINS")
    ? Deno.env.get("ALLOWED_ORIGINS")!.split(",").map((o) => o.trim()).filter(Boolean)
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
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

export const corsHeaders = getCorsHeaders();

export function extractBearerToken(authHeader: string | null): { token: string | null; error?: string } {
  if (!authHeader || typeof authHeader !== "string") {
    return { token: null, error: "Missing Authorization header" };
  }

  const trimmed = authHeader.trim();
  if (!trimmed) {
    return { token: null, error: "Empty Authorization header" };
  }

  const match = /^Bearer\s+(.+)$/i.exec(trimmed);
  if (!match || !match[1] || !match[1].trim()) {
    return { token: null, error: "Invalid Authorization header format. Must be 'Bearer <token>'" };
  }

  return { token: match[1].trim() };
}

/**
 * Extracts the `session_id` UUID claim from a Supabase Auth JWT access token.
 * Returns null if the token is malformed, the claim is absent, or the value
 * is not a valid UUID string.
 */
export function extractSessionId(accessToken: string): string | null {
  try {
    const parts = accessToken.split(".");
    if (parts.length !== 3) return null;

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

export interface HandlerDeps {
  // Optional mock client injector for unit/integration tests
  // deno-lint-ignore no-explicit-any
  supabaseUserClient?: any;
  // deno-lint-ignore no-explicit-any
  supabaseAdminClient?: any;
}

export async function handleRequest(req: Request, deps?: HandlerDeps): Promise<Response> {
  const requestOrigin = req.headers.get("origin") ?? req.headers.get("Origin");
  const requestCorsHeaders = getCorsHeaders(requestOrigin);

  // 1. Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: requestCorsHeaders });
  }

  // 2. Only accept POST requests
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ success: false, error: "Method not allowed" }), {
      status: 405,
      headers: { ...requestCorsHeaders, "Content-Type": "application/json" },
    });
  }

  // 3. Extract Bearer token from Authorization header
  const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization");
  const bearerResult = extractBearerToken(authHeader);
  if (!bearerResult.token) {
    return new Response(JSON.stringify({ success: false, error: bearerResult.error || "Unauthorized" }), {
      status: 401,
      headers: { ...requestCorsHeaders, "Content-Type": "application/json" },
    });
  }

  const accessToken = bearerResult.token;

  // 4. Parse request body
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch (_e) { // eslint-disable-line @typescript-eslint/no-unused-vars
    return new Response(JSON.stringify({ success: false, error: "Invalid JSON" }), {
      status: 400,
      headers: { ...requestCorsHeaders, "Content-Type": "application/json" },
    });
  }

  const { resource_id } = body;
  if (
    resource_id === undefined ||
    resource_id === null ||
    (typeof resource_id !== "number" && typeof resource_id !== "string") ||
    (typeof resource_id === "string" && resource_id.trim() === "")
  ) {
    return new Response(JSON.stringify({ success: false, error: "Missing or invalid resource_id" }), {
      status: 400,
      headers: { ...requestCorsHeaders, "Content-Type": "application/json" },
    });
  }

  const numericId = typeof resource_id === "number" ? resource_id : parseInt(String(resource_id), 10);
  if (isNaN(numericId)) {
    return new Response(JSON.stringify({ success: false, error: "Missing or invalid resource_id" }), {
      status: 400,
      headers: { ...requestCorsHeaders, "Content-Type": "application/json" },
    });
  }

  // 5. Initialize Supabase clients
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  const supabase = deps?.supabaseUserClient ?? createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });

  const supabaseAdmin = deps?.supabaseAdminClient ?? createClient(supabaseUrl, supabaseServiceRoleKey);

  // 6. Cryptographically validate user identity via Supabase Auth
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(accessToken);

  if (authError || !user) {
    console.error("Auth error:", authError);
    return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
      status: 401,
      headers: { ...requestCorsHeaders, "Content-Type": "application/json" },
    });
  }

  // 7. Single active device session enforcement (Phase 1.2.3)
  // Extract and validate the Auth-issued JWT session_id claim
  const sessionId = extractSessionId(accessToken);
  if (!sessionId) {
    return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
      status: 401,
      headers: { ...requestCorsHeaders, "Content-Type": "application/json" },
    });
  }

  // Verify session against authoritative registry via service-role parameterized RPC
  const { data: isActive, error: sessionRpcError } = await supabaseAdmin.rpc("is_active_session", {
    p_user_id: user.id,
    p_session_id: sessionId,
  });

  if (sessionRpcError || isActive !== true) {
    return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
      status: 401,
      headers: { ...requestCorsHeaders, "Content-Type": "application/json" },
    });
  }

  // 8. Query learning_resources table using user-scoped client
  const { data: resource, error: resourceError } = await supabase
    .from("learning_resources")
    .select("id, resource_type, storage_bucket, file_path, allow_download, is_active")
    .eq("id", numericId)
    .single();

  if (resourceError || !resource) {
    return new Response(JSON.stringify({ success: false, error: "Resource not found" }), {
      status: 404,
      headers: { ...requestCorsHeaders, "Content-Type": "application/json" },
    });
  }

  const isValid =
    resource.id !== null &&
    resource.id !== undefined &&
    resource.storage_bucket !== null &&
    resource.storage_bucket !== undefined &&
    resource.file_path !== null &&
    resource.file_path !== undefined &&
    resource.resource_type !== null &&
    resource.resource_type !== undefined &&
    resource.is_active === true &&
    resource.allow_download !== null &&
    resource.allow_download !== undefined;

  if (!isValid) {
    return new Response(JSON.stringify({ success: false, error: "Resource not found" }), {
      status: 404,
      headers: { ...requestCorsHeaders, "Content-Type": "application/json" },
    });
  }

  // 9. Generate Signed URL using service-role Storage client (lifetime 60 seconds)
  const { data: storageData, error: storageError } = await supabaseAdmin.storage
    .from(resource.storage_bucket)
    .createSignedUrl(resource.file_path, 60);

  if (storageError || !storageData) {
    console.error("Storage error:", storageError);
    return new Response(JSON.stringify({ success: false, error: "Storage failure" }), {
      status: 500,
      headers: { ...requestCorsHeaders, "Content-Type": "application/json" },
    });
  }

  // 10. Return signed URL only
  return new Response(
    JSON.stringify({
      success: true,
      signed_url: storageData.signedUrl,
      expires_in: 60,
    }),
    {
      status: 200,
      headers: { ...requestCorsHeaders, "Content-Type": "application/json" },
    }
  );
}

Deno.serve((req) => handleRequest(req));
