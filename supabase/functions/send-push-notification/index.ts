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

export function validateContentType(contentTypeHeader: string | null): { valid: boolean; error?: string } {
  if (!contentTypeHeader || typeof contentTypeHeader !== "string") {
    return { valid: false, error: "Missing Content-Type header. Must be 'application/json'" };
  }

  const mediaType = contentTypeHeader.split(";")[0].trim().toLowerCase();

  if (mediaType !== "application/json") {
    return { valid: false, error: "Unsupported Content-Type. Must be 'application/json'" };
  }

  return { valid: true };
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

export function isUserAdmin(user: { app_metadata?: Record<string, unknown> } | null): boolean {
  if (!user || !user.app_metadata) {
    return false;
  }
  return user.app_metadata.role === "admin";
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

export interface SendNotificationPayload {
  title: string;
  message: string;
  target_class: string;
  target_medium: string;
}

export function validateSendNotificationRequest(body: Record<string, unknown>): {
  valid: boolean;
  error?: string;
  payload?: SendNotificationPayload;
} {
  const allowedKeys = new Set(["title", "message", "body", "target_class", "target_medium"]);
  for (const key of Object.keys(body)) {
    if (!allowedKeys.has(key)) {
      return { valid: false, error: `Unexpected field in request body: ${key}` };
    }
  }

  const titleRaw = body.title;
  if (typeof titleRaw !== "string" || !titleRaw.trim()) {
    return { valid: false, error: "Missing or invalid 'title' field (must be a non-empty string)" };
  }
  const title = titleRaw.trim();
  if (title.length > 120) {
    return { valid: false, error: "'title' field exceeds maximum length of 120 characters" };
  }

  const messageRaw = body.message ?? body.body;
  if (typeof messageRaw !== "string" || !messageRaw.trim()) {
    return { valid: false, error: "Missing or invalid 'message' or 'body' field (must be a non-empty string)" };
  }
  const message = messageRaw.trim();
  if (message.length > 500) {
    return { valid: false, error: "'message' field exceeds maximum length of 500 characters" };
  }

  const targetClassRaw = body.target_class;
  if (typeof targetClassRaw !== "string" || !targetClassRaw.trim()) {
    return { valid: false, error: "Missing or invalid 'target_class' field" };
  }
  const target_class = targetClassRaw.trim();

  const targetMediumRaw = body.target_medium;
  if (typeof targetMediumRaw !== "string" || !targetMediumRaw.trim()) {
    return { valid: false, error: "Missing or invalid 'target_medium' field" };
  }
  const target_medium = targetMediumRaw.trim().toLowerCase();

  const validClasses = new Set(["all", "8", "9", "10", "11", "12"]);
  const validMediums = new Set(["all", "english", "hindi"]);

  if (!validClasses.has(target_class)) {
    return { valid: false, error: "Invalid 'target_class'. Must be 'all', '8', '9', '10', '11', or '12'" };
  }

  if (!validMediums.has(target_medium)) {
    return { valid: false, error: "Invalid 'target_medium'. Must be 'all', 'english', or 'hindi'" };
  }

  // Enforce paired Option A targeting rules
  const isGeneral = target_class === "all" && target_medium === "all";
  const isRestricted = target_class !== "all" && target_medium !== "all";

  if (!isGeneral && !isRestricted) {
    return {
      valid: false,
      error: "Invalid targeting pair: 'target_class' and 'target_medium' must both be 'all' for general announcements, or both specific values for restricted announcements",
    };
  }

  return {
    valid: true,
    payload: {
      title,
      message,
      target_class,
      target_medium,
    },
  };
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

  // 3. Validate Content-Type header (application/json required)
  const contentTypeHeader = req.headers.get("content-type") ?? req.headers.get("Content-Type");
  const ctValidation = validateContentType(contentTypeHeader);
  if (!ctValidation.valid) {
    return new Response(JSON.stringify({ success: false, error: ctValidation.error }), {
      status: 415,
      headers: { ...requestCorsHeaders, "Content-Type": "application/json" },
    });
  }

  // 4. Authenticate requesting user via Bearer token
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

  // 5. Authorize administrator via trusted app_metadata.role
  if (!isUserAdmin(user)) {
    return new Response(JSON.stringify({ success: false, error: "Forbidden: Administrator role required" }), {
      status: 403,
      headers: { ...requestCorsHeaders, "Content-Type": "application/json" },
    });
  }

  // 6. Enforce request body size limit via bounded stream read & parse JSON
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

  // 7. Validate notification request parameters and Option A targeting rules
  const validationResult = validateSendNotificationRequest(body);
  if (!validationResult.valid || !validationResult.payload) {
    return new Response(JSON.stringify({ success: false, error: validationResult.error }), {
      status: 400,
      headers: { ...requestCorsHeaders, "Content-Type": "application/json" },
    });
  }

  const payload = validationResult.payload;

  // 8. Query active subscribers count using service-role client according to Option A targeting rules
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

  let recipientCount = 0;

  if (payload.target_class === "all" && payload.target_medium === "all") {
    // General announcement: matches all active subscriptions (including general_only)
    const { count, error: countError } = await supabaseAdmin
      .from("push_subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true);

    if (countError) {
      console.error("Database query error:", countError);
      return new Response(JSON.stringify({ success: false, error: "Internal server error" }), {
        status: 500,
        headers: { ...requestCorsHeaders, "Content-Type": "application/json" },
      });
    }
    recipientCount = count ?? 0;
  } else {
    // Restricted announcement: matches active subscriptions where student_class and study_medium match exactly
    // Note: general_only subscriptions are automatically excluded since student_class and study_medium differ
    const { count, error: countError } = await supabaseAdmin
      .from("push_subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .eq("student_class", payload.target_class)
      .eq("study_medium", payload.target_medium);

    if (countError) {
      console.error("Database query error:", countError);
      return new Response(JSON.stringify({ success: false, error: "Internal server error" }), {
        status: 500,
        headers: { ...requestCorsHeaders, "Content-Type": "application/json" },
      });
    }
    recipientCount = count ?? 0;
  }

  return new Response(
    JSON.stringify({
      success: true,
      message: "Push notification request accepted (skeleton mode)",
      recipient_count: recipientCount,
      target: {
        target_class: payload.target_class,
        target_medium: payload.target_medium,
      },
    }),
    {
      status: 200,
      headers: { ...requestCorsHeaders, "Content-Type": "application/json" },
    }
  );
});
