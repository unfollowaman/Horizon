import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { validateVapidKeys } from "./vapid.ts";
import {
  batchDispatchPushNotifications,
  RecipientSubscription,
} from "./dispatcher.ts";

export const ALLOWED_ORIGINS = [
  "https://unfollowaman.tech",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:8000",
  "http://127.0.0.1:5173",
];

export const MAX_BODY_BYTES = 16384; // 16 KB maximum payload size
export const PAGE_SIZE = 1000; // PostgREST standard page size limit
export const MAX_RECIPIENT_CAP = 10000; // Hard cap on maximum recipients in a single push dispatch call

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

export interface HandlerDeps {
  // deno-lint-ignore no-explicit-any
  supabaseUserClient?: any;
  // deno-lint-ignore no-explicit-any
  supabaseAdminClient?: any;
  fetchFn?: typeof fetch;
  vapidKeys?: {
    publicKey: string;
    privateKey: string;
    subject?: string;
  };
}

export interface FetchActiveSubscriptionsResult {
  subscriptions: RecipientSubscription[];
  exceededCap?: boolean;
  totalCount?: number;
  error?: string;
}

/**
 * Fetches active recipient subscriptions matching Option A targeting rules using page-based range queries.
 * Detects if the total eligible audience exceeds MAX_RECIPIENT_CAP (10,000) and returns exceededCap: true
 * to allow calling code to abort before dispatch or announcement insertion.
 * Fails closed on database query errors during the overflow check.
 */
// deno-lint-ignore no-explicit-any
export async function fetchAllActiveSubscriptions(
  supabaseAdmin: any,
  targetClass: string,
  targetMedium: string
): Promise<FetchActiveSubscriptionsResult> {
  const subscriptions: RecipientSubscription[] = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabaseAdmin
      .from("push_subscriptions")
      .select("id, user_id, endpoint, p256dh, auth")
      .eq("is_active", true);

    if (targetClass !== "all" || targetMedium !== "all") {
      query = query
        .eq("student_class", targetClass)
        .eq("study_medium", targetMedium);
    }

    const { data: pageData, error } = await query
      .order("created_at", { ascending: true })
      .range(from, to);

    if (error) {
      console.error("Database query error on page", page, error);
      return { subscriptions: [], error: "Database query error fetching active push subscriptions" };
    }

    const pageRows = (pageData ?? []) as RecipientSubscription[];
    subscriptions.push(...pageRows);

    if (pageRows.length < PAGE_SIZE) {
      hasMore = false;
    } else {
      page++;
      // If we have accumulated MAX_RECIPIENT_CAP rows, check if a 10,001st row exists
      if (subscriptions.length >= MAX_RECIPIENT_CAP) {
        let checkOverflowQuery = supabaseAdmin
          .from("push_subscriptions")
          .select("id")
          .eq("is_active", true);

        if (targetClass !== "all" || targetMedium !== "all") {
          checkOverflowQuery = checkOverflowQuery
            .eq("student_class", targetClass)
            .eq("study_medium", targetMedium);
        }

        const { data: overflowData, error: overflowError } = await checkOverflowQuery
          .order("created_at", { ascending: true })
          .range(MAX_RECIPIENT_CAP, MAX_RECIPIENT_CAP);

        if (overflowError) {
          console.error("Database query error on recipient cap overflow check:", overflowError);
          return { subscriptions: [], error: "Database query error checking recipient cap limit" };
        }

        if (overflowData && overflowData.length > 0) {
          return { subscriptions: [], exceededCap: true };
        }

        hasMore = false;
      }
    }
  }

  return { subscriptions };
}

export async function handleRequest(req: Request, deps?: HandlerDeps): Promise<Response> {
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

  const supabaseUser = deps?.supabaseUserClient ?? createClient(supabaseUrl, supabaseAnonKey, {
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

  // 8. Validate VAPID server secrets
  const vapidPublicKey = deps?.vapidKeys?.publicKey ?? Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
  const vapidPrivateKey = deps?.vapidKeys?.privateKey ?? Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
  const vapidSubject = deps?.vapidKeys?.subject ?? Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@unfollowaman.tech";

  if (!vapidPublicKey || !vapidPrivateKey) {
    return new Response(JSON.stringify({ success: false, error: "Server VAPID keys are missing or unconfigured" }), {
      status: 500,
      headers: { ...requestCorsHeaders, "Content-Type": "application/json" },
    });
  }

  const vapidValidation = await validateVapidKeys(vapidPublicKey, vapidPrivateKey);
  if (!vapidValidation.valid) {
    return new Response(JSON.stringify({ success: false, error: `Invalid server VAPID configuration: ${vapidValidation.error}` }), {
      status: 500,
      headers: { ...requestCorsHeaders, "Content-Type": "application/json" },
    });
  }

  // 9. Query active subscribers using bounded deterministic pagination under Option A rules
  const supabaseAdmin = deps?.supabaseAdminClient ?? createClient(supabaseUrl, supabaseServiceRoleKey);

  const fetchResult = await fetchAllActiveSubscriptions(supabaseAdmin, payload.target_class, payload.target_medium);
  if (fetchResult.error) {
    return new Response(JSON.stringify({ success: false, error: "Internal server error querying active subscriptions" }), {
      status: 500,
      headers: { ...requestCorsHeaders, "Content-Type": "application/json" },
    });
  }

  if (fetchResult.exceededCap) {
    return new Response(
      JSON.stringify({
        success: false,
        error: `Target recipient count exceeds maximum supported cap of ${MAX_RECIPIENT_CAP}. Notification dispatch aborted.`,
      }),
      {
        status: 400,
        headers: { ...requestCorsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const subscriptions = fetchResult.subscriptions;

  // 10. Persist Announcement in 'sending' state (STRICT persistence boundary)
  let announcementId: string;
  const { data: annData, error: annInsertError } = await supabaseAdmin
    .from("announcements")
    .insert({
      title: payload.title,
      body: payload.message,
      target_class: payload.target_class,
      target_medium: payload.target_medium,
      created_by: user.id,
      status: "sending",
    })
    .select("id")
    .maybeSingle();

  if (annInsertError || !annData?.id) {
    console.error("Failed to insert announcement record:", annInsertError);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Failed to persist announcement record. Notification dispatch aborted.",
      }),
      {
        status: 500,
        headers: { ...requestCorsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  announcementId = annData.id;

  // 11. Execute Batch Push Notification Dispatch
  const dispatchResult = await batchDispatchPushNotifications(
    subscriptions,
    { title: payload.title, message: payload.message },
    {
      vapidPublicKey,
      vapidPrivateKey,
      vapidSubject,
      fetchFn: deps?.fetchFn,
    }
  );

  let persistenceWarning = false;

  // 12. Process Expired/Unregistered Subscription Deactivations (HTTP 404/410)
  if (dispatchResult.deactivatedSubscriptionIds.length > 0) {
    const { error: deactivationError } = await supabaseAdmin
      .from("push_subscriptions")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .in("id", dispatchResult.deactivatedSubscriptionIds)
      .eq("is_active", true);

    if (deactivationError) {
      console.error("Failed to deactivate expired push subscriptions:", deactivationError);
      persistenceWarning = true;
    }
  }

  // 13. Update Announcement status and final counters according to agreed status semantics:
  // "sent" if total_successful > 0; "failed" if total_successful === 0 (including zero recipients)
  const isSent = dispatchResult.successful > 0;
  const finalStatus = isSent ? "sent" : "failed";
  const sentAtTimestamp = isSent ? new Date().toISOString() : null;

  const { error: annUpdateError } = await supabaseAdmin
    .from("announcements")
    .update({
      status: finalStatus,
      total_sent: dispatchResult.total,
      total_successful: dispatchResult.successful,
      total_failed: dispatchResult.failed,
      sent_at: sentAtTimestamp,
      updated_at: new Date().toISOString(),
    })
    .eq("id", announcementId);

  if (annUpdateError) {
    console.error("Failed to update final announcement status:", annUpdateError);
    persistenceWarning = true;
  }

  // 14. Return Sanitized Response
  return new Response(
    JSON.stringify({
      success: true,
      message: persistenceWarning
        ? "Push notification dispatch complete with persistence warnings"
        : "Push notification dispatch complete",
      recipient_count: dispatchResult.total,
      total_successful: dispatchResult.successful,
      total_failed: dispatchResult.failed,
      deactivated_subscriptions: dispatchResult.deactivatedSubscriptionIds.length,
      announcement_id: announcementId,
      status: finalStatus,
      persistence_warning: persistenceWarning ? true : undefined,
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
}

Deno.serve((req) => handleRequest(req));
