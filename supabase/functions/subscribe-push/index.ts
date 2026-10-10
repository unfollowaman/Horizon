import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

export const ALLOWED_ORIGINS = [
  "https://unfollowaman.tech",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:8000",
  "http://127.0.0.1:5173",
];

export const MAX_BODY_BYTES = 16384; // 16 KB maximum payload size

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

export async function readBoundedBodyStream(
  req: Request,
  maxBytes: number = MAX_BODY_BYTES
): Promise<{ text?: string; oversized?: boolean; error?: string }> {
  if (!req.body) {
    return { text: "" };
  }

  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      if (value) {
        totalBytes += value.byteLength;
        if (totalBytes > maxBytes) {
          try {
            await reader.cancel("Payload exceeds maximum permitted size");
          } catch (_e) {
            // Reader cancel errors are non-fatal
          }
          return { oversized: true };
        }
        chunks.push(value);
      }
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Error reading request body stream" };
  } finally {
    reader.releaseLock();
  }

  const merged = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  const decoded = new TextDecoder().decode(merged);
  return { text: decoded };
}

export function validateJsonObject(parsed: unknown): { valid: boolean; error?: string } {
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { valid: false, error: "Request body must be a JSON object" };
  }
  return { valid: true };
}

export function validatePushEndpoint(endpointStr: unknown): { valid: boolean; error?: string; url?: URL } {
  if (typeof endpointStr !== "string" || !endpointStr.trim()) {
    return { valid: false, error: "Missing or invalid push endpoint" };
  }

  if (endpointStr.length > 2048) {
    return { valid: false, error: "Push endpoint URL exceeds maximum length" };
  }

  let parsed: URL;
  try {
    parsed = new URL(endpointStr);
  } catch (_e) {
    return { valid: false, error: "Push endpoint is not a valid URL" };
  }

  if (parsed.protocol !== "https:") {
    return { valid: false, error: "Push endpoint must use HTTPS" };
  }

  if (parsed.username || parsed.password) {
    return { valid: false, error: "Push endpoint must not contain user credentials" };
  }

  if (parsed.hash) {
    return { valid: false, error: "Push endpoint must not contain URL fragments" };
  }

  if (parsed.port && parsed.port !== "443") {
    return { valid: false, error: "Push endpoint must use standard HTTPS port (443)" };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Reject IP addresses and localhost
  const isIpOrLocal =
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname) ||
    /^\[?[a-fA-F0-9:]+\]?$/.test(hostname);

  if (isIpOrLocal) {
    return { valid: false, error: "Push endpoint host is not allowed" };
  }

  // Approved hostnames and domain suffix rules
  const isExactMatch =
    hostname === "fcm.googleapis.com" ||
    hostname === "updates.push.services.mozilla.com";

  const isAllowedSuffix =
    hostname === "push.apple.com" || hostname.endsWith(".push.apple.com") ||
    hostname === "notify.windows.com" || hostname.endsWith(".notify.windows.com") ||
    hostname === "push.opera.com" || hostname.endsWith(".push.opera.com");

  if (!isExactMatch && !isAllowedSuffix) {
    return { valid: false, error: "Push endpoint host is not in the approved allowlist" };
  }

  return { valid: true, url: parsed };
}

Deno.serve(async (req) => {
  const requestOrigin = req.headers.get("origin") ?? req.headers.get("Origin");
  const requestCorsHeaders = getCorsHeaders(requestOrigin);

  // 1. Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: requestCorsHeaders });
  }

  // 2. Enforce POST HTTP method
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ success: false, error: "Method not allowed" }), {
      status: 405,
      headers: { ...requestCorsHeaders, "Content-Type": "application/json" },
    });
  }

  // 3. Authenticate requesting user via Bearer token
  const authHeader = req.headers.get("Authorization");
  const bearerResult = extractBearerToken(authHeader);
  if (!bearerResult.token) {
    return new Response(JSON.stringify({ success: false, error: bearerResult.error || "Unauthorized" }), {
      status: 401,
      headers: { ...requestCorsHeaders, "Content-Type": "application/json" },
    });
  }

  const accessToken = bearerResult.token;

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });

  const {
    data: { user },
    error: authError,
  } = await supabaseUser.auth.getUser(accessToken);

  if (authError || !user) {
    return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
      status: 401,
      headers: { ...requestCorsHeaders, "Content-Type": "application/json" },
    });
  }

  // 4. Enforce request body size limit via bounded stream read & parse JSON
  const contentLengthHeader = req.headers.get("content-length");
  if (contentLengthHeader) {
    const cl = parseInt(contentLengthHeader, 10);
    if (!isNaN(cl) && cl > MAX_BODY_BYTES) {
      return new Response(JSON.stringify({ success: false, error: "Request payload too large" }), {
        status: 413,
        headers: { ...requestCorsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  const streamResult = await readBoundedBodyStream(req, MAX_BODY_BYTES);
  if (streamResult.oversized) {
    return new Response(JSON.stringify({ success: false, error: "Request payload too large" }), {
      status: 413,
      headers: { ...requestCorsHeaders, "Content-Type": "application/json" },
    });
  }

  if (streamResult.error || streamResult.text === undefined) {
    return new Response(JSON.stringify({ success: false, error: "Failed to read request body stream" }), {
      status: 400,
      headers: { ...requestCorsHeaders, "Content-Type": "application/json" },
    });
  }

  let rawParsed: unknown;
  try {
    rawParsed = JSON.parse(streamResult.text);
  } catch (_e) {
    return new Response(JSON.stringify({ success: false, error: "Invalid JSON payload" }), {
      status: 400,
      headers: { ...requestCorsHeaders, "Content-Type": "application/json" },
    });
  }

  const jsonObjectValidation = validateJsonObject(rawParsed);
  if (!jsonObjectValidation.valid) {
    return new Response(JSON.stringify({ success: false, error: jsonObjectValidation.error }), {
      status: 400,
      headers: { ...requestCorsHeaders, "Content-Type": "application/json" },
    });
  }

  const body = rawParsed as Record<string, unknown>;

  const subObj = (typeof body.subscription === "object" && body.subscription !== null)
    ? (body.subscription as Record<string, unknown>)
    : body;

  const endpointRaw = subObj.endpoint;
  const keysRaw = (typeof subObj.keys === "object" && subObj.keys !== null)
    ? (subObj.keys as Record<string, unknown>)
    : {};

  const p256dh = keysRaw.p256dh;
  const authKey = keysRaw.auth;

  // Validate endpoint URL
  const endpointValidation = validatePushEndpoint(endpointRaw);
  if (!endpointValidation.valid) {
    return new Response(JSON.stringify({ success: false, error: endpointValidation.error }), {
      status: 400,
      headers: { ...requestCorsHeaders, "Content-Type": "application/json" },
    });
  }

  // Validate p256dh key
  if (typeof p256dh !== "string" || !p256dh.trim() || p256dh.length < 20 || p256dh.length > 500) {
    return new Response(JSON.stringify({ success: false, error: "Missing or invalid p256dh key" }), {
      status: 400,
      headers: { ...requestCorsHeaders, "Content-Type": "application/json" },
    });
  }

  // Validate auth key
  if (typeof authKey !== "string" || !authKey.trim() || authKey.length < 10 || authKey.length > 200) {
    return new Response(JSON.stringify({ success: false, error: "Missing or invalid auth key" }), {
      status: 400,
      headers: { ...requestCorsHeaders, "Content-Type": "application/json" },
    });
  }

  const endpoint = endpointRaw as string;
  const userAgentRaw = typeof body.user_agent === "string" ? body.user_agent : req.headers.get("user-agent");
  const userAgent = userAgentRaw ? userAgentRaw.slice(0, 512) : null;

  // 5. Derive targeting from user profile (Option A)
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("student_class, study_medium, onboarding_completed")
    .eq("id", user.id)
    .maybeSingle();

  const validClasses = new Set(["8", "9", "10", "11", "12"]);
  const validMediums = new Set(["english", "hindi"]);

  let studentClass = "general_only";
  let studyMedium = "general_only";

  if (
    profile &&
    profile.onboarding_completed !== false &&
    profile.student_class &&
    profile.study_medium
  ) {
    const clsStr = String(profile.student_class).trim();
    const medStr = String(profile.study_medium).trim().toLowerCase();

    if (validClasses.has(clsStr) && validMediums.has(medStr)) {
      studentClass = clsStr;
      studyMedium = medStr;
    }
  }

  // 6. Check for existing subscription by endpoint
  const { data: existingSub, error: findError } = await supabaseAdmin
    .from("push_subscriptions")
    .select("id, user_id, is_active")
    .eq("endpoint", endpoint)
    .maybeSingle();

  if (findError) {
    console.error("Database query error:", findError);
    return new Response(JSON.stringify({ success: false, error: "Internal server error" }), {
      status: 500,
      headers: { ...requestCorsHeaders, "Content-Type": "application/json" },
    });
  }

  if (existingSub) {
    if (existingSub.user_id !== user.id) {
      // Conflict: endpoint is owned by a different user
      return new Response(JSON.stringify({ success: false, error: "Push subscription endpoint already registered to another account" }), {
        status: 409,
        headers: { ...requestCorsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update existing subscription for the same user
    const { error: updateError } = await supabaseAdmin
      .from("push_subscriptions")
      .update({
        p256dh: p256dh,
        auth: authKey,
        student_class: studentClass,
        study_medium: studyMedium,
        user_agent: userAgent,
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingSub.id);

    if (updateError) {
      console.error("Database update error:", updateError);
      return new Response(JSON.stringify({ success: false, error: "Failed to update subscription" }), {
        status: 500,
        headers: { ...requestCorsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, message: "Push subscription updated successfully" }), {
      status: 200,
      headers: { ...requestCorsHeaders, "Content-Type": "application/json" },
    });
  }

  // Insert new subscription
  const { error: insertError } = await supabaseAdmin
    .from("push_subscriptions")
    .insert({
      user_id: user.id,
      endpoint: endpoint,
      p256dh: p256dh,
      auth: authKey,
      student_class: studentClass,
      study_medium: studyMedium,
      user_agent: userAgent,
      is_active: true,
    });

  if (insertError) {
    console.error("Database insert error:", insertError);
    return new Response(JSON.stringify({ success: false, error: "Failed to create subscription" }), {
      status: 500,
      headers: { ...requestCorsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ success: true, message: "Push subscription created successfully" }), {
    status: 201,
    headers: { ...requestCorsHeaders, "Content-Type": "application/json" },
  });
});
