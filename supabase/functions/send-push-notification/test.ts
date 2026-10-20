import { assertEquals, assertMatch } from "jsr:@std/assert";
import {
  extractBearerToken,
  validateContentType,
  isUserAdmin,
  validateJsonObject,
  validateSendNotificationRequest,
  getCorsHeaders,
  readBoundedBodyStream,
  handleRequest,
  fetchAllActiveSubscriptions,
  MAX_BODY_BYTES,
  PAGE_SIZE,
  MAX_RECIPIENT_CAP,
} from "./index.ts";
import {
  dispatchSinglePushNotification,
  batchDispatchPushNotifications,
  RecipientSubscription,
} from "./dispatcher.ts";
import {
  decryptWebPushPayload,
  base64UrlEncode,
} from "./vapid.ts";
import { handleRequest as handleSubscribeRequest } from "../subscribe-push/index.ts";

// Helper to generate a valid test P-256 key pair
async function generateTestVapidKeyPair(): Promise<{ publicKey: string; privateKey: string }> {
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"]
  );

  const pubRaw = new Uint8Array(await crypto.subtle.exportKey("raw", keyPair.publicKey));
  const privPkcs8 = new Uint8Array(await crypto.subtle.exportKey("pkcs8", keyPair.privateKey));

  function b64url(buf: Uint8Array): string {
    let binary = "";
    for (let i = 0; i < buf.byteLength; i++) {
      binary += String.fromCharCode(buf[i]);
    }
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  }

  return {
    publicKey: b64url(pubRaw),
    privateKey: b64url(privPkcs8),
  };
}

// Helper to generate a valid test subscriber key pair
async function generateTestSubscriberKeys(): Promise<{ p256dh: string; auth: string }> {
  const ecdhPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );
  const pubRaw = new Uint8Array(await crypto.subtle.exportKey("raw", ecdhPair.publicKey));
  const auth = crypto.getRandomValues(new Uint8Array(16));

  function b64url(buf: Uint8Array): string {
    let binary = "";
    for (let i = 0; i < buf.byteLength; i++) {
      binary += String.fromCharCode(buf[i]);
    }
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  }

  return {
    p256dh: b64url(pubRaw),
    auth: b64url(auth),
  };
}

Deno.test("extractBearerToken - valid Bearer token", () => {
  const res = extractBearerToken("Bearer sample-token-xyz-123");
  assertEquals(res.token, "sample-token-xyz-123");
});

Deno.test("extractBearerToken - missing header", () => {
  const res = extractBearerToken(null);
  assertEquals(res.token, null);
  assertEquals(res.error, "Missing Authorization header");
});

Deno.test("extractBearerToken - empty header", () => {
  const res = extractBearerToken("   ");
  assertEquals(res.token, null);
  assertEquals(res.error, "Empty Authorization header");
});

Deno.test("extractBearerToken - malformed non-Bearer scheme", () => {
  const res = extractBearerToken("Basic dXNlcjpwYXNz");
  assertEquals(res.token, null);
  assertEquals(res.error, "Invalid Authorization header format. Must be 'Bearer <token>'");
});

Deno.test("validateContentType - accept application/json", () => {
  const res = validateContentType("application/json");
  assertEquals(res.valid, true);
});

Deno.test("validateContentType - accept application/json with parameters and uppercase", () => {
  const res = validateContentType("APPLICATION/JSON; charset=utf-8");
  assertEquals(res.valid, true);
});

Deno.test("validateContentType - reject missing Content-Type header", () => {
  const res = validateContentType(null);
  assertEquals(res.valid, false);
  assertEquals(res.error, "Missing Content-Type header. Must be 'application/json'");
});

Deno.test("validateContentType - reject unsupported Content-Type (text/plain)", () => {
  const res = validateContentType("text/plain");
  assertEquals(res.valid, false);
  assertEquals(res.error, "Unsupported Content-Type. Must be 'application/json'");
});

Deno.test("validateContentType - reject tricky substring match (text/html; application/json)", () => {
  const res = validateContentType("text/html; application/json");
  assertEquals(res.valid, false);
  assertEquals(res.error, "Unsupported Content-Type. Must be 'application/json'");
});

Deno.test("isUserAdmin - true for user with admin role in app_metadata", () => {
  const user = { app_metadata: { role: "admin" } };
  assertEquals(isUserAdmin(user), true);
});

Deno.test("isUserAdmin - false for user with student role in app_metadata", () => {
  const user = { app_metadata: { role: "student" } };
  assertEquals(isUserAdmin(user), false);
});

Deno.test("isUserAdmin - false for user without app_metadata", () => {
  const user = {};
  assertEquals(isUserAdmin(user), false);
});

Deno.test("isUserAdmin - false for null user", () => {
  assertEquals(isUserAdmin(null), false);
});

Deno.test("validateJsonObject - accept valid plain object", () => {
  const res = validateJsonObject({ title: "Test", message: "Msg" });
  assertEquals(res.valid, true);
});

Deno.test("validateJsonObject - reject null", () => {
  const res = validateJsonObject(null);
  assertEquals(res.valid, false);
  assertEquals(res.error, "Request body must be a JSON object");
});

Deno.test("validateJsonObject - reject array", () => {
  const res = validateJsonObject(["title", "message"]);
  assertEquals(res.valid, false);
  assertEquals(res.error, "Request body must be a JSON object");
});

Deno.test("validateJsonObject - reject primitives (number, string, boolean)", () => {
  assertEquals(validateJsonObject(123).valid, false);
  assertEquals(validateJsonObject("a string").valid, false);
  assertEquals(validateJsonObject(true).valid, false);
});

Deno.test("MAX_BODY_BYTES constant value", () => {
  assertEquals(MAX_BODY_BYTES, 16384);
});

Deno.test("validateSendNotificationRequest - valid general announcement", () => {
  const body = {
    title: "General Announcement",
    message: "This is a general announcement for all students.",
    target_class: "all",
    target_medium: "all",
  };
  const res = validateSendNotificationRequest(body);
  assertEquals(res.valid, true);
  assertEquals(res.payload?.title, "General Announcement");
  assertEquals(res.payload?.target_class, "all");
  assertEquals(res.payload?.target_medium, "all");
});

Deno.test("validateSendNotificationRequest - valid restricted announcement", () => {
  const body = {
    title: "Class 10 English Notes Added",
    message: "New science notes have been uploaded.",
    target_class: "10",
    target_medium: "english",
  };
  const res = validateSendNotificationRequest(body);
  assertEquals(res.valid, true);
  assertEquals(res.payload?.target_class, "10");
  assertEquals(res.payload?.target_medium, "english");
});

Deno.test("validateSendNotificationRequest - support 'body' as alias for 'message'", () => {
  const body = {
    title: "Notice",
    body: "Notice body message.",
    target_class: "all",
    target_medium: "all",
  };
  const res = validateSendNotificationRequest(body);
  assertEquals(res.valid, true);
  assertEquals(res.payload?.message, "Notice body message.");
});

Deno.test("validateSendNotificationRequest - reject missing title", () => {
  const body = {
    message: "Some message",
    target_class: "all",
    target_medium: "all",
  };
  const res = validateSendNotificationRequest(body);
  assertEquals(res.valid, false);
  assertEquals(res.error, "Missing or invalid 'title' field (must be a non-empty string)");
});

Deno.test("validateSendNotificationRequest - reject title exceeding 120 characters", () => {
  const body = {
    title: "A".repeat(121),
    message: "Some message",
    target_class: "all",
    target_medium: "all",
  };
  const res = validateSendNotificationRequest(body);
  assertEquals(res.valid, false);
  assertEquals(res.error, "'title' field exceeds maximum length of 120 characters");
});

Deno.test("validateSendNotificationRequest - reject missing message", () => {
  const body = {
    title: "Title",
    target_class: "all",
    target_medium: "all",
  };
  const res = validateSendNotificationRequest(body);
  assertEquals(res.valid, false);
  assertEquals(res.error, "Missing or invalid 'message' or 'body' field (must be a non-empty string)");
});

Deno.test("validateSendNotificationRequest - reject message exceeding 500 characters", () => {
  const body = {
    title: "Title",
    message: "M".repeat(501),
    target_class: "all",
    target_medium: "all",
  };
  const res = validateSendNotificationRequest(body);
  assertEquals(res.valid, false);
  assertEquals(res.error, "'message' field exceeds maximum length of 500 characters");
});

Deno.test("validateSendNotificationRequest - reject invalid class", () => {
  const body = {
    title: "Title",
    message: "Message",
    target_class: "13",
    target_medium: "english",
  };
  const res = validateSendNotificationRequest(body);
  assertEquals(res.valid, false);
  assertEquals(res.error, "Invalid 'target_class'. Must be 'all', '8', '9', '10', '11', or '12'");
});

Deno.test("validateSendNotificationRequest - reject invalid medium", () => {
  const body = {
    title: "Title",
    message: "Message",
    target_class: "10",
    target_medium: "spanish",
  };
  const res = validateSendNotificationRequest(body);
  assertEquals(res.valid, false);
  assertEquals(res.error, "Invalid 'target_medium'. Must be 'all', 'english', or 'hindi'");
});

Deno.test("validateSendNotificationRequest - reject mismatched general class and restricted medium", () => {
  const body = {
    title: "Title",
    message: "Message",
    target_class: "all",
    target_medium: "english",
  };
  const res = validateSendNotificationRequest(body);
  assertEquals(res.valid, false);
  assertEquals(
    res.error,
    "Invalid targeting pair: 'target_class' and 'target_medium' must both be 'all' for general announcements, or both specific values for restricted announcements"
  );
});

Deno.test("validateSendNotificationRequest - reject mismatched restricted class and general medium", () => {
  const body = {
    title: "Title",
    message: "Message",
    target_class: "9",
    target_medium: "all",
  };
  const res = validateSendNotificationRequest(body);
  assertEquals(res.valid, false);
  assertEquals(
    res.error,
    "Invalid targeting pair: 'target_class' and 'target_medium' must both be 'all' for general announcements, or both specific values for restricted announcements"
  );
});

Deno.test("validateSendNotificationRequest - reject unexpected payload fields", () => {
  const body = {
    title: "Title",
    message: "Message",
    target_class: "all",
    target_medium: "all",
    unauthorized_field: "malicious_data",
  };
  const res = validateSendNotificationRequest(body);
  assertEquals(res.valid, false);
  assertEquals(res.error, "Unexpected field in request body: unauthorized_field");
});

Deno.test("readBoundedBodyStream - normal payload within limit", async () => {
  const payload = JSON.stringify({ title: "Test", message: "Msg", target_class: "all", target_medium: "all" });
  const req = new Request("https://unfollowaman.tech/send-push-notification", {
    method: "POST",
    body: payload,
  });

  const res = await readBoundedBodyStream(req, 1024);
  assertEquals(res.oversized, undefined);
  assertEquals(res.text, payload);
});

Deno.test("readBoundedBodyStream - oversized payload stream cancelled", async () => {
  const oversizedData = new Uint8Array(2000);
  oversizedData.fill(65); // 'A's

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(oversizedData);
      controller.close();
    },
  });

  const req = new Request("https://unfollowaman.tech/send-push-notification", {
    method: "POST",
    body: stream,
    // @ts-ignore stream body requires duplex in node fetch
    duplex: "half",
  });

  const res = await readBoundedBodyStream(req, 1000);
  assertEquals(res.oversized, true);
  assertEquals(res.text, undefined);
});

Deno.test("getCorsHeaders - matches allowed origin", () => {
  const headers = getCorsHeaders("http://localhost:5173");
  assertEquals(headers["Access-Control-Allow-Origin"], "http://localhost:5173");
  assertEquals(headers["Access-Control-Allow-Methods"], "POST, OPTIONS");
});

Deno.test("getCorsHeaders - falls back for untrusted origin", () => {
  const headers = getCorsHeaders("https://untrusted-domain.com");
  assertEquals(headers["Access-Control-Allow-Origin"], "https://unfollowaman.tech");
});

// ===================================================================
// UNIT TESTS FOR DISPATCHER & GATEWAY CLASSIFICATION (Unit 2)
// ===================================================================

Deno.test("Dispatcher - HTTP 201 Gateway Acceptance", async () => {
  const vapid = await generateTestVapidKeyPair();
  const subKeys = await generateTestSubscriberKeys();

  const mockSub: RecipientSubscription = {
    id: "sub-123",
    user_id: "user-456",
    endpoint: "https://fcm.googleapis.com/fcm/send/test-endpoint-123",
    p256dh: subKeys.p256dh,
    auth: subKeys.auth,
  };

  const mockFetch = async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
    // Assert Web Push headers
    const reqHeaders = new Headers(init?.headers);
    assertMatch(reqHeaders.get("Authorization") || "", /^vapid t=.+, k=.+$/);
    assertEquals(reqHeaders.get("Content-Encoding"), "aes128gcm");
    assertEquals(reqHeaders.get("Content-Type"), "application/octet-stream");
    assertEquals(reqHeaders.get("TTL"), "86400");

    return new Response(null, { status: 201 });
  };

  const res = await dispatchSinglePushNotification(
    mockSub,
    { title: "Test", message: "Hello World" },
    {
      vapidPublicKey: vapid.publicKey,
      vapidPrivateKey: vapid.privateKey,
      fetchFn: mockFetch as unknown as typeof fetch,
    }
  );

  assertEquals(res.success, true);
  assertEquals(res.statusCode, 201);
  assertEquals(res.deactivate, false);
});

Deno.test("Dispatcher - HTTP 404 / 410 Expired Subscription Deactivation", async () => {
  const vapid = await generateTestVapidKeyPair();
  const subKeys = await generateTestSubscriberKeys();

  const mockSub: RecipientSubscription = {
    id: "sub-404",
    user_id: "user-456",
    endpoint: "https://updates.push.services.mozilla.com/wpush/v2/expired-endpoint",
    p256dh: subKeys.p256dh,
    auth: subKeys.auth,
  };

  const mockFetch404 = async (): Promise<Response> => new Response(null, { status: 404 });
  const mockFetch410 = async (): Promise<Response> => new Response(null, { status: 410 });

  const res404 = await dispatchSinglePushNotification(
    mockSub,
    { title: "Test", message: "Message" },
    {
      vapidPublicKey: vapid.publicKey,
      vapidPrivateKey: vapid.privateKey,
      fetchFn: mockFetch404 as unknown as typeof fetch,
    }
  );

  assertEquals(res404.success, false);
  assertEquals(res404.statusCode, 404);
  assertEquals(res404.deactivate, true);

  const res410 = await dispatchSinglePushNotification(
    mockSub,
    { title: "Test", message: "Message" },
    {
      vapidPublicKey: vapid.publicKey,
      vapidPrivateKey: vapid.privateKey,
      fetchFn: mockFetch410 as unknown as typeof fetch,
    }
  );

  assertEquals(res410.success, false);
  assertEquals(res410.statusCode, 410);
  assertEquals(res410.deactivate, true);
});

Deno.test("Dispatcher - HTTP 429 Rate Limited (keep subscription active)", async () => {
  const vapid = await generateTestVapidKeyPair();
  const subKeys = await generateTestSubscriberKeys();

  const mockSub: RecipientSubscription = {
    id: "sub-429",
    user_id: "user-456",
    endpoint: "https://p01-push.apple.com/send/test-429",
    p256dh: subKeys.p256dh,
    auth: subKeys.auth,
  };

  const mockFetch = async (): Promise<Response> => new Response(null, { status: 429 });

  const res = await dispatchSinglePushNotification(
    mockSub,
    { title: "Test", message: "Message" },
    {
      vapidPublicKey: vapid.publicKey,
      vapidPrivateKey: vapid.privateKey,
      fetchFn: mockFetch as unknown as typeof fetch,
    }
  );

  assertEquals(res.success, false);
  assertEquals(res.statusCode, 429);
  assertEquals(res.deactivate, false);
});

Deno.test("Dispatcher - HTTP 500 / 503 Server Error (keep subscription active)", async () => {
  const vapid = await generateTestVapidKeyPair();
  const subKeys = await generateTestSubscriberKeys();

  const mockSub: RecipientSubscription = {
    id: "sub-500",
    user_id: "user-456",
    endpoint: "https://fcm.googleapis.com/fcm/send/test-500",
    p256dh: subKeys.p256dh,
    auth: subKeys.auth,
  };

  const mockFetch = async (): Promise<Response> => new Response(null, { status: 503 });

  const res = await dispatchSinglePushNotification(
    mockSub,
    { title: "Test", message: "Message" },
    {
      vapidPublicKey: vapid.publicKey,
      vapidPrivateKey: vapid.privateKey,
      fetchFn: mockFetch as unknown as typeof fetch,
    }
  );

  assertEquals(res.success, false);
  assertEquals(res.statusCode, 503);
  assertEquals(res.deactivate, false);
});

Deno.test("Dispatcher - Reject HTTP Redirects and Unapproved Hosts", async () => {
  const vapid = await generateTestVapidKeyPair();
  const subKeys = await generateTestSubscriberKeys();

  const mockSub: RecipientSubscription = {
    id: "sub-unapproved",
    user_id: "user-456",
    endpoint: "https://malicious-domain.com/push",
    p256dh: subKeys.p256dh,
    auth: subKeys.auth,
  };

  const res = await dispatchSinglePushNotification(
    mockSub,
    { title: "Test", message: "Message" },
    {
      vapidPublicKey: vapid.publicKey,
      vapidPrivateKey: vapid.privateKey,
    }
  );

  assertEquals(res.success, false);
  assertEquals(res.deactivate, false);
  assertEquals(res.error, "Push endpoint host is not in the approved allowlist");
});

Deno.test("Dispatcher - Timeout handling triggers failed result without deactivation", async () => {
  const vapid = await generateTestVapidKeyPair();
  const subKeys = await generateTestSubscriberKeys();

  const mockSub: RecipientSubscription = {
    id: "sub-timeout",
    user_id: "user-456",
    endpoint: "https://fcm.googleapis.com/fcm/send/test-timeout",
    p256dh: subKeys.p256dh,
    auth: subKeys.auth,
  };

  const mockFetchHanging = (_url: string | URL | Request, init?: RequestInit): Promise<Response> => {
    return new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => {
        reject(new Error("The operation was aborted"));
      });
    });
  };

  const res = await dispatchSinglePushNotification(
    mockSub,
    { title: "Test", message: "Message" },
    {
      vapidPublicKey: vapid.publicKey,
      vapidPrivateKey: vapid.privateKey,
      requestTimeoutMs: 10, // 10ms test timeout
      fetchFn: mockFetchHanging as unknown as typeof fetch,
    }
  );

  assertEquals(res.success, false);
  assertEquals(res.deactivate, false);
  assertEquals(res.error, "Push request timed out after 10ms");
});

Deno.test("Dispatcher - Bounded Concurrency Limit Execution (50 items <= 25 concurrent)", async () => {
  const vapid = await generateTestVapidKeyPair();
  const subKeys = await generateTestSubscriberKeys();

  const count = 50;
  const mockSubs: RecipientSubscription[] = [];
  for (let i = 0; i < count; i++) {
    mockSubs.push({
      id: `sub-${i}`,
      user_id: `user-${i}`,
      endpoint: `https://fcm.googleapis.com/fcm/send/endpoint-${i}`,
      p256dh: subKeys.p256dh,
      auth: subKeys.auth,
    });
  }

  let activeRequests = 0;
  let maxActiveRequests = 0;

  const mockFetchSlow = async (_url: string | URL | Request): Promise<Response> => {
    activeRequests++;
    if (activeRequests > maxActiveRequests) {
      maxActiveRequests = activeRequests;
    }

    await new Promise((resolve) => setTimeout(resolve, 15));

    activeRequests--;
    return new Response(null, { status: 200 });
  };

  const batchRes = await batchDispatchPushNotifications(
    mockSubs,
    { title: "Batch Test", message: "Hello Batch" },
    {
      vapidPublicKey: vapid.publicKey,
      vapidPrivateKey: vapid.privateKey,
      concurrencyLimit: 25,
      fetchFn: mockFetchSlow as unknown as typeof fetch,
    }
  );

  assertEquals(batchRes.total, 50);
  assertEquals(batchRes.successful, 50);
  assertEquals(batchRes.failed, 0);
  assertEquals(batchRes.deactivatedSubscriptionIds.length, 0);

  // Assert max concurrency never exceeded 25
  assertEquals(maxActiveRequests <= 25, true);
});

Deno.test("Dispatcher - Partial Batch Failure & Deactivation Handling", async () => {
  const vapid = await generateTestVapidKeyPair();
  const subKeys = await generateTestSubscriberKeys();

  const mockSubs: RecipientSubscription[] = [
    { id: "sub-ok-1", user_id: "u1", endpoint: "https://fcm.googleapis.com/fcm/send/ok1", p256dh: subKeys.p256dh, auth: subKeys.auth },
    { id: "sub-gone-2", user_id: "u2", endpoint: "https://updates.push.services.mozilla.com/wpush/v2/gone2", p256dh: subKeys.p256dh, auth: subKeys.auth },
    { id: "sub-500-3", user_id: "u3", endpoint: "https://p01-push.apple.com/send/err3", p256dh: subKeys.p256dh, auth: subKeys.auth },
  ];

  const mockFetchMix = async (url: string | URL | Request): Promise<Response> => {
    const urlStr = typeof url === "string" ? url : url.toString();
    if (urlStr.includes("ok1")) return new Response(null, { status: 200 });
    if (urlStr.includes("gone2")) return new Response(null, { status: 410 });
    return new Response(null, { status: 500 });
  };

  const batchRes = await batchDispatchPushNotifications(
    mockSubs,
    { title: "Mix", message: "Test" },
    {
      vapidPublicKey: vapid.publicKey,
      vapidPrivateKey: vapid.privateKey,
      fetchFn: mockFetchMix as unknown as typeof fetch,
    }
  );

  assertEquals(batchRes.total, 3);
  assertEquals(batchRes.successful, 1);
  assertEquals(batchRes.failed, 2);
  assertEquals(batchRes.deactivatedSubscriptionIds, ["sub-gone-2"]);
});

Deno.test("handleRequest - End-to-End Integration with VAPID secrets and Dispatcher", async () => {
  const vapid = await generateTestVapidKeyPair();
  const subKeys = await generateTestSubscriberKeys();

  const mockAdminUser = {
    id: "admin-user-001",
    app_metadata: { role: "admin" },
  };

  const mockSubscriptions = [
    { id: "s1", user_id: "u1", endpoint: "https://fcm.googleapis.com/fcm/send/s1", p256dh: subKeys.p256dh, auth: subKeys.auth },
    { id: "s2", user_id: "u2", endpoint: "https://updates.push.services.mozilla.com/wpush/v2/s2", p256dh: subKeys.p256dh, auth: subKeys.auth },
  ];

  let deactivatedIds: string[] = [];
  let announcementInserted = false;
  let announcementUpdated = false;

  const mockSupabaseUser = {
    auth: {
      getUser: async () => ({ data: { user: mockAdminUser }, error: null }),
    },
  };

  const createQueryChain = (dataToReturn: unknown) => {
    const chain = {
      // deno-lint-ignore no-explicit-any
      data: dataToReturn as any,
      error: null,
      eq: () => chain,
      order: () => chain,
      range: () => chain,
    };
    return chain;
  };

  const mockSupabaseAdmin = {
    from: (table: string) => {
      if (table === "push_subscriptions") {
        return {
          select: () => createQueryChain(mockSubscriptions),
          update: (_data: Record<string, unknown>) => ({
            in: (_col: string, ids: string[]) => ({
              eq: () => {
                deactivatedIds = ids;
                return { error: null };
              },
            }),
          }),
        };
      }
      if (table === "announcements") {
        return {
          insert: (_data: Record<string, unknown>) => ({
            select: () => ({
              maybeSingle: async () => {
                announcementInserted = true;
                return { data: { id: "ann-999" }, error: null };
              },
            }),
          }),
          update: (_data: Record<string, unknown>) => ({
            eq: (_col: string, _val: string) => {
              announcementUpdated = true;
              return { error: null };
            },
          }),
        };
      }
      return {};
    },
  };

  const mockFetch = async (url: string | URL | Request): Promise<Response> => {
    const urlStr = typeof url === "string" ? url : url.toString();
    if (urlStr.includes("s1")) return new Response(null, { status: 200 });
    return new Response(null, { status: 404 });
  };

  const req = new Request("https://unfollowaman.tech/send-push-notification", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer admin-token-123",
    },
    body: JSON.stringify({
      title: "Class 10 Update",
      message: "New study materials added",
      target_class: "10",
      target_medium: "english",
    }),
  });

  const res = await handleRequest(req, {
    supabaseUserClient: mockSupabaseUser,
    supabaseAdminClient: mockSupabaseAdmin,
    fetchFn: mockFetch as unknown as typeof fetch,
    vapidKeys: vapid,
  });

  assertEquals(res.status, 200);

  const resJson = await res.json();
  assertEquals(resJson.success, true);
  assertEquals(resJson.recipient_count, 2);
  assertEquals(resJson.total_successful, 1);
  assertEquals(resJson.total_failed, 1);
  assertEquals(resJson.deactivated_subscriptions, 1);
  assertEquals(resJson.announcement_id, "ann-999");
  assertEquals(resJson.status, "sent");
  assertEquals(deactivatedIds, ["s2"]);
  assertEquals(announcementInserted, true);
  assertEquals(announcementUpdated, true);
});

// ===================================================================
// ADDITIONAL FAILURE PATH & PAGINATION UNIT TESTS (Pass Correction)
// ===================================================================

Deno.test("Failure Path - Announcement insertion failure halts execution before dispatch", async () => {
  const vapid = await generateTestVapidKeyPair();
  const subKeys = await generateTestSubscriberKeys();

  const mockAdminUser = { id: "admin-user-001", app_metadata: { role: "admin" } };
  const mockSubscriptions = [
    { id: "s1", user_id: "u1", endpoint: "https://fcm.googleapis.com/fcm/send/s1", p256dh: subKeys.p256dh, auth: subKeys.auth },
  ];

  let fetchCalled = false;

  const mockSupabaseUser = { auth: { getUser: async () => ({ data: { user: mockAdminUser }, error: null }) } };
  const createQueryChain = (dataToReturn: unknown) => {
    const chain = {
      // deno-lint-ignore no-explicit-any
      data: dataToReturn as any,
      error: null,
      eq: () => chain,
      order: () => chain,
      range: () => chain,
    };
    return chain;
  };

  const mockSupabaseAdmin = {
    from: (table: string) => {
      if (table === "push_subscriptions") {
        return {
          select: () => createQueryChain(mockSubscriptions),
        };
      }
      if (table === "announcements") {
        return {
          insert: () => ({
            select: () => ({
              maybeSingle: async () => ({ data: null, error: new Error("DB Error inserting announcement") }),
            }),
          }),
        };
      }
      return {};
    },
  };

  const mockFetch = async (): Promise<Response> => {
    fetchCalled = true;
    return new Response(null, { status: 200 });
  };

  const req = new Request("https://unfollowaman.tech/send-push-notification", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer token" },
    body: JSON.stringify({ title: "Test", message: "Msg", target_class: "all", target_medium: "all" }),
  });

  const res = await handleRequest(req, {
    supabaseUserClient: mockSupabaseUser,
    supabaseAdminClient: mockSupabaseAdmin,
    fetchFn: mockFetch as unknown as typeof fetch,
    vapidKeys: vapid,
  });

  assertEquals(res.status, 500);
  const resJson = await res.json();
  assertEquals(resJson.success, false);
  assertEquals(resJson.error, "Failed to persist announcement record. Notification dispatch aborted.");
  assertEquals(fetchCalled, false); // Proves dispatch was NOT executed
});

Deno.test("Failure Path - Zero recipients produce 'failed' status and zero counters", async () => {
  const vapid = await generateTestVapidKeyPair();

  const mockAdminUser = { id: "admin-user-001", app_metadata: { role: "admin" } };
  let updatedStatus = "";
  let updatedSentAt: string | null = "not-null";

  const mockSupabaseUser = { auth: { getUser: async () => ({ data: { user: mockAdminUser }, error: null }) } };
  const createQueryChain = (dataToReturn: unknown) => {
    const chain = {
      // deno-lint-ignore no-explicit-any
      data: dataToReturn as any,
      error: null,
      eq: () => chain,
      order: () => chain,
      range: () => chain,
    };
    return chain;
  };

  const mockSupabaseAdmin = {
    from: (table: string) => {
      if (table === "push_subscriptions") {
        return {
          select: () => createQueryChain([]),
        };
      }
      if (table === "announcements") {
        return {
          insert: () => ({
            select: () => ({
              maybeSingle: async () => ({ data: { id: "ann-zero" }, error: null }),
            }),
          }),
          update: (data: Record<string, unknown>) => ({
            eq: () => {
              updatedStatus = data.status as string;
              updatedSentAt = data.sent_at as string | null;
              return { error: null };
            },
          }),
        };
      }
      return {};
    },
  };

  const req = new Request("https://unfollowaman.tech/send-push-notification", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer token" },
    body: JSON.stringify({ title: "General", message: "Msg", target_class: "all", target_medium: "all" }),
  });

  const res = await handleRequest(req, {
    supabaseUserClient: mockSupabaseUser,
    supabaseAdminClient: mockSupabaseAdmin,
    vapidKeys: vapid,
  });

  assertEquals(res.status, 200);
  const resJson = await res.json();
  assertEquals(resJson.success, true);
  assertEquals(resJson.recipient_count, 0);
  assertEquals(resJson.total_successful, 0);
  assertEquals(resJson.total_failed, 0);
  assertEquals(resJson.status, "failed");
  assertEquals(updatedStatus, "failed");
  assertEquals(updatedSentAt, null);
});

Deno.test("Failure Path - Final announcement status update failure returns persistence_warning", async () => {
  const vapid = await generateTestVapidKeyPair();
  const subKeys = await generateTestSubscriberKeys();

  const mockAdminUser = { id: "admin-user-001", app_metadata: { role: "admin" } };
  const mockSubscriptions = [
    { id: "s1", user_id: "u1", endpoint: "https://fcm.googleapis.com/fcm/send/s1", p256dh: subKeys.p256dh, auth: subKeys.auth },
  ];

  const mockSupabaseUser = { auth: { getUser: async () => ({ data: { user: mockAdminUser }, error: null }) } };
  const createQueryChain = (dataToReturn: unknown) => {
    const chain = {
      // deno-lint-ignore no-explicit-any
      data: dataToReturn as any,
      error: null,
      eq: () => chain,
      order: () => chain,
      range: () => chain,
    };
    return chain;
  };

  const mockSupabaseAdmin = {
    from: (table: string) => {
      if (table === "push_subscriptions") {
        return {
          select: () => createQueryChain(mockSubscriptions),
        };
      }
      if (table === "announcements") {
        return {
          insert: () => ({
            select: () => ({
              maybeSingle: async () => ({ data: { id: "ann-warn" }, error: null }),
            }),
          }),
          update: () => ({
            eq: () => ({ error: new Error("DB Connection Error during update") }),
          }),
        };
      }
      return {};
    },
  };

  const mockFetch = async (): Promise<Response> => new Response(null, { status: 200 });

  const req = new Request("https://unfollowaman.tech/send-push-notification", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer token" },
    body: JSON.stringify({ title: "Test", message: "Msg", target_class: "all", target_medium: "all" }),
  });

  const res = await handleRequest(req, {
    supabaseUserClient: mockSupabaseUser,
    supabaseAdminClient: mockSupabaseAdmin,
    fetchFn: mockFetch as unknown as typeof fetch,
    vapidKeys: vapid,
  });

  assertEquals(res.status, 200);
  const resJson = await res.json();
  assertEquals(resJson.success, true);
  assertEquals(resJson.recipient_count, 1);
  assertEquals(resJson.total_successful, 1);
  assertEquals(resJson.persistence_warning, true);
  assertEquals(resJson.message, "Push notification dispatch complete with persistence warnings");
});

Deno.test("Pagination - fetchAllActiveSubscriptions paginates multiple pages without duplicates or omissions", async () => {
  const subKeys = await generateTestSubscriberKeys();

  // Create 2500 mock subscriptions across 3 pages (Page 0: 1000, Page 1: 1000, Page 2: 500)
  const allSubs: RecipientSubscription[] = [];
  for (let i = 0; i < 2500; i++) {
    allSubs.push({
      id: `sub-page-${i}`,
      user_id: `user-${i}`,
      endpoint: `https://fcm.googleapis.com/fcm/send/ep-${i}`,
      p256dh: subKeys.p256dh,
      auth: subKeys.auth,
    });
  }

  const mockSupabaseAdmin = {
    from: (_table: string) => {
      let pageFrom = 0;
      let pageTo = 0;

      const chain = {
        select: () => chain,
        eq: () => chain,
        order: () => chain,
        range: (from: number, to: number) => {
          pageFrom = from;
          pageTo = to;
          const sliced = allSubs.slice(pageFrom, pageTo + 1);
          return Promise.resolve({ data: sliced, error: null });
        },
      };
      return chain;
    },
  };

  const res = await fetchAllActiveSubscriptions(mockSupabaseAdmin, "all", "all");

  assertEquals(res.subscriptions.length, 2500);
  assertEquals(res.subscriptions[0].id, "sub-page-0");
  assertEquals(res.subscriptions[999].id, "sub-page-999");
  assertEquals(res.subscriptions[1000].id, "sub-page-1000");
  assertEquals(res.subscriptions[2499].id, "sub-page-2499");
});

Deno.test("Option A Targeting - General vs Restricted targeting queries across pages", async () => {
  const subKeys = await generateTestSubscriberKeys();

  let capturedTargetClass = "";
  let capturedTargetMedium = "";

  const createQueryChain = () => {
    const chain = {
      data: [{ id: "sub-1", user_id: "u1", endpoint: "https://fcm.googleapis.com/fcm/send/1", p256dh: subKeys.p256dh, auth: subKeys.auth }],
      error: null,
      select: () => chain,
      eq: (col: string, val: string) => {
        if (col === "student_class") capturedTargetClass = val;
        if (col === "study_medium") capturedTargetMedium = val;
        return chain;
      },
      order: () => chain,
      range: () => chain,
    };
    return chain;
  };

  const mockSupabaseAdmin = {
    from: (_table: string) => createQueryChain(),
  };

  // Restricted targeting call
  await fetchAllActiveSubscriptions(mockSupabaseAdmin, "10", "english");
  assertEquals(capturedTargetClass, "10");
  assertEquals(capturedTargetMedium, "english");

  // General targeting call
  capturedTargetClass = "";
  capturedTargetMedium = "";
  await fetchAllActiveSubscriptions(mockSupabaseAdmin, "all", "all");
  assertEquals(capturedTargetClass, "");
  assertEquals(capturedTargetMedium, "");
});

// ===================================================================
// RECIPIENT-CAP SAFETY UNIT TESTS (Final Safety Fix)
// ===================================================================

Deno.test("Recipient-Cap Safety - Audience below cap (< 10000) processed normally", async () => {
  const subKeys = await generateTestSubscriberKeys();
  const subs: RecipientSubscription[] = [];
  for (let i = 0; i < 500; i++) {
    subs.push({
      id: `s-${i}`,
      user_id: `u-${i}`,
      endpoint: `https://fcm.googleapis.com/fcm/send/${i}`,
      p256dh: subKeys.p256dh,
      auth: subKeys.auth,
    });
  }

  const mockSupabaseAdmin = {
    from: (_table: string) => {
      const chain = {
        select: () => chain,
        eq: () => chain,
        order: () => chain,
        range: () => Promise.resolve({ data: subs, error: null }),
      };
      return chain;
    },
  };

  const res = await fetchAllActiveSubscriptions(mockSupabaseAdmin, "all", "all");
  assertEquals(res.exceededCap, undefined);
  assertEquals(res.subscriptions.length, 500);
});

Deno.test("Recipient-Cap Safety - Audience exactly at cap (10000) handled successfully without overflow", async () => {
  const subKeys = await generateTestSubscriberKeys();
  const subs: RecipientSubscription[] = [];
  for (let i = 0; i < 1000; i++) {
    subs.push({
      id: `s-${i}`,
      user_id: `u-${i}`,
      endpoint: `https://fcm.googleapis.com/fcm/send/${i}`,
      p256dh: subKeys.p256dh,
      auth: subKeys.auth,
    });
  }

  let pageCount = 0;

  const mockSupabaseAdmin = {
    from: (_table: string) => {
      const chain = {
        select: () => chain,
        eq: () => chain,
        order: () => chain,
        range: (from: number, _to: number) => {
          if (from === MAX_RECIPIENT_CAP) {
            // Check overflow query: returns empty array indicating exactly 10,000 exist
            return Promise.resolve({ data: [], error: null });
          }
          pageCount++;
          // Simulate 10 pages of 1,000 = 10,000 total
          if (pageCount <= 10) {
            return Promise.resolve({ data: subs, error: null });
          }
          return Promise.resolve({ data: [], error: null });
        },
      };
      return chain;
    },
  };

  const res = await fetchAllActiveSubscriptions(mockSupabaseAdmin, "all", "all");
  assertEquals(res.exceededCap, undefined);
  assertEquals(res.subscriptions.length, 10000);
});

Deno.test("Recipient-Cap Safety - Audience above cap (10001+) aborted before announcement insertion or dispatch", async () => {
  const vapid = await generateTestVapidKeyPair();
  const subKeys = await generateTestSubscriberKeys();

  const mockAdminUser = { id: "admin-user-001", app_metadata: { role: "admin" } };
  let announcementInsertCalled = false;
  let fetchCalled = false;

  const pageSubs: RecipientSubscription[] = [];
  for (let i = 0; i < 1000; i++) {
    pageSubs.push({ id: `s-${i}`, user_id: `u-${i}`, endpoint: `https://fcm.googleapis.com/fcm/send/${i}`, p256dh: subKeys.p256dh, auth: subKeys.auth });
  }

  const mockSupabaseUser = { auth: { getUser: async () => ({ data: { user: mockAdminUser }, error: null }) } };
  const mockSupabaseAdmin = {
    from: (table: string) => {
      if (table === "push_subscriptions") {
        const chain = {
          select: () => chain,
          eq: () => chain,
          order: () => chain,
          range: (from: number, _to: number) => {
            if (from === MAX_RECIPIENT_CAP) {
              // 10,001st row exists!
              return Promise.resolve({ data: [{ id: "s-10001" }], error: null });
            }
            return Promise.resolve({ data: pageSubs, error: null });
          },
        };
        return chain;
      }
      if (table === "announcements") {
        return {
          insert: () => {
            announcementInsertCalled = true;
            return {
              select: () => ({ maybeSingle: async () => ({ data: { id: "ann-should-not-exist" }, error: null }) }),
            };
          },
        };
      }
      return {};
    },
  };

  const mockFetch = async (): Promise<Response> => {
    fetchCalled = true;
    return new Response(null, { status: 200 });
  };

  const req = new Request("https://unfollowaman.tech/send-push-notification", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer token" },
    body: JSON.stringify({ title: "Over Cap Test", message: "Msg", target_class: "all", target_medium: "all" }),
  });

  const res = await handleRequest(req, {
    supabaseUserClient: mockSupabaseUser,
    supabaseAdminClient: mockSupabaseAdmin,
    fetchFn: mockFetch as unknown as typeof fetch,
    vapidKeys: vapid,
  });

  assertEquals(res.status, 400);
  const resJson = await res.json();
  assertEquals(resJson.success, false);
  assertEquals(resJson.error, "Target recipient count exceeds maximum supported cap of 10000. Notification dispatch aborted.");
  assertEquals(announcementInsertCalled, false); // Proves announcement was NOT inserted
  assertEquals(fetchCalled, false); // Proves dispatch was NOT executed
});

Deno.test("Recipient-Cap Safety - Overflow query database failure fails closed with HTTP 500", async () => {
  const vapid = await generateTestVapidKeyPair();
  const subKeys = await generateTestSubscriberKeys();

  const mockAdminUser = { id: "admin-user-001", app_metadata: { role: "admin" } };
  let announcementInsertCalled = false;
  let fetchCalled = false;

  const pageSubs: RecipientSubscription[] = [];
  for (let i = 0; i < 1000; i++) {
    pageSubs.push({ id: `s-${i}`, user_id: `u-${i}`, endpoint: `https://fcm.googleapis.com/fcm/send/${i}`, p256dh: subKeys.p256dh, auth: subKeys.auth });
  }

  const mockSupabaseUser = { auth: { getUser: async () => ({ data: { user: mockAdminUser }, error: null }) } };
  const mockSupabaseAdmin = {
    from: (table: string) => {
      if (table === "push_subscriptions") {
        const chain = {
          select: () => chain,
          eq: () => chain,
          order: () => chain,
          range: (from: number, _to: number) => {
            if (from === MAX_RECIPIENT_CAP) {
              // Overflow check query returns DB error!
              return Promise.resolve({ data: null, error: new Error("DB Query Error on Overflow Check") });
            }
            return Promise.resolve({ data: pageSubs, error: null });
          },
        };
        return chain;
      }
      if (table === "announcements") {
        return {
          insert: () => {
            announcementInsertCalled = true;
            return {
              select: () => ({ maybeSingle: async () => ({ data: { id: "ann-should-not-exist" }, error: null }) }),
            };
          },
        };
      }
      return {};
    },
  };

  const mockFetch = async (): Promise<Response> => {
    fetchCalled = true;
    return new Response(null, { status: 200 });
  };

  const req = new Request("https://unfollowaman.tech/send-push-notification", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer token" },
    body: JSON.stringify({ title: "DB Fail Overflow Test", message: "Msg", target_class: "all", target_medium: "all" }),
  });

  const res = await handleRequest(req, {
    supabaseUserClient: mockSupabaseUser,
    supabaseAdminClient: mockSupabaseAdmin,
    fetchFn: mockFetch as unknown as typeof fetch,
    vapidKeys: vapid,
  });

  assertEquals(res.status, 500);
  const resJson = await res.json();
  assertEquals(resJson.success, false);
  assertEquals(resJson.error, "Internal server error querying active subscriptions");
  assertEquals(announcementInsertCalled, false); // Proves announcement was NOT inserted
  assertEquals(fetchCalled, false); // Proves dispatch was NOT executed
});

Deno.test("Pagination Error - fetchAllActiveSubscriptions handles DB error safely", async () => {
  const mockSupabaseAdmin = {
    from: (_table: string) => {
      const chain = {
        select: () => chain,
        eq: () => chain,
        order: () => chain,
        range: () => Promise.resolve({ data: null, error: new Error("DB Connection Interrupted") }),
      };
      return chain;
    },
  };

  const res = await fetchAllActiveSubscriptions(mockSupabaseAdmin, "all", "all");
  assertEquals(res.subscriptions.length, 0);
  assertEquals(res.error, "Database query error fetching active push subscriptions");
});

// ===================================================================
// UNIT 4 END-TO-END INTEGRATION & DE-DUPLICATION TESTS
// ===================================================================

Deno.test("P1 End-to-End Integration - Full Subscription Registration through Push Dispatch, VAPID Decryption, and Service Worker Payload Validation", async () => {
  const vapid = await generateTestVapidKeyPair();

  // 1. Browser generates ECDH keypair and auth secret for push subscription
  const ecdhPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );
  const clientPubRaw = new Uint8Array(await crypto.subtle.exportKey("raw", ecdhPair.publicKey));
  const clientAuthRaw = crypto.getRandomValues(new Uint8Array(16));

  const clientP256dhBase64Url = base64UrlEncode(clientPubRaw);
  const clientAuthBase64Url = base64UrlEncode(clientAuthRaw);

  const testEndpoint = "https://fcm.googleapis.com/fcm/send/e2e-sw-client-001";
  const studentUser = { id: "student-user-123", app_metadata: { role: "student" } };

  let storedDbSubscription: RecipientSubscription | null = null;

  // 2. Client registers subscription via subscribe-push Edge Function
  const mockSubscribeUserClient = {
    auth: { getUser: async () => ({ data: { user: studentUser }, error: null }) },
  };

  const mockSubscribeAdminClient = {
    from: (table: string) => {
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { student_class: "10", study_medium: "english", onboarding_completed: true },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "push_subscriptions") {
        return {
          select: () => ({
            eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
          }),
          insert: async (subData: Record<string, unknown>) => {
            storedDbSubscription = {
              id: "sub-registered-uuid",
              user_id: studentUser.id,
              endpoint: subData.endpoint as string,
              p256dh: subData.p256dh as string,
              auth: subData.auth as string,
            };
            return { error: null };
          },
        };
      }
      return {};
    },
  };

  const subReq = new Request("https://unfollowaman.tech/subscribe-push", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer student-token" },
    body: JSON.stringify({
      subscription: {
        endpoint: testEndpoint,
        keys: {
          p256dh: clientP256dhBase64Url,
          auth: clientAuthBase64Url,
        },
      },
    }),
  });

  const subRes = await handleSubscribeRequest(subReq, {
    supabaseUserClient: mockSubscribeUserClient,
    supabaseAdminClient: mockSubscribeAdminClient,
  });

  assertEquals(subRes.status, 201);
  assertEquals(storedDbSubscription !== null, true);
  assertEquals((storedDbSubscription as unknown as RecipientSubscription).p256dh, clientP256dhBase64Url);

  // 3. Admin dispatches push notification targeting Class 10 English
  const adminUser = { id: "admin-user-001", app_metadata: { role: "admin" } };
  let capturedEncryptedBody: Uint8Array | null = null;
  let gatewayFetchCalled = false;

  const mockSendUserClient = {
    auth: { getUser: async () => ({ data: { user: adminUser }, error: null }) },
  };

  const createQueryChain = (dataToReturn: unknown) => {
    const chain = {
      // deno-lint-ignore no-explicit-any
      data: dataToReturn as any,
      error: null,
      eq: () => chain,
      order: () => chain,
      range: () => chain,
    };
    return chain;
  };

  const mockSendAdminClient = {
    from: (table: string) => {
      if (table === "push_subscriptions") {
        return {
          select: () => createQueryChain([storedDbSubscription]),
        };
      }
      if (table === "announcements") {
        return {
          insert: () => ({
            select: () => ({ maybeSingle: async () => ({ data: { id: "ann-e2e" }, error: null }) }),
          }),
          update: () => ({ eq: () => ({ error: null }) }),
        };
      }
      return {};
    },
  };

  const mockFetch = async (_url: string | URL | Request, init?: RequestInit): Promise<Response> => {
    gatewayFetchCalled = true;
    capturedEncryptedBody = init?.body as Uint8Array;
    return new Response(null, { status: 201 });
  };

  const sendReq = new Request("https://unfollowaman.tech/send-push-notification", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer admin-token" },
    body: JSON.stringify({
      title: "Science Chapter 5 Published",
      message: "Check out the new study notes for Class 10 Science.",
      target_class: "10",
      target_medium: "english",
    }),
  });

  const sendRes = await handleRequest(sendReq, {
    supabaseUserClient: mockSendUserClient,
    supabaseAdminClient: mockSendAdminClient,
    fetchFn: mockFetch as unknown as typeof fetch,
    vapidKeys: vapid,
  });

  assertEquals(sendRes.status, 200);
  assertEquals(gatewayFetchCalled, true);
  assertEquals(capturedEncryptedBody !== null, true);

  // 4. Browser receives encrypted push payload & decrypts using client private key & auth secret
  const decryptedBytes = await decryptWebPushPayload({
    encryptedBody: capturedEncryptedBody!,
    clientPrivateKey: ecdhPair.privateKey,
    clientAuth: clientAuthRaw,
  });

  const decryptedJsonText = new TextDecoder().decode(decryptedBytes);
  const parsedPayload = JSON.parse(decryptedJsonText);

  // 5. Assert exact JSON payload structure expected by public/sw.js
  assertEquals(parsedPayload.title, "Science Chapter 5 Published");
  assertEquals(parsedPayload.body, "Check out the new study notes for Class 10 Science.");
  assertEquals(parsedPayload.icon, "/assets/favicon/web-app-manifest-192x192.png");
  assertEquals(parsedPayload.badge, "/assets/favicon/web-app-manifest-192x192.png");
  assertEquals(parsedPayload.data?.url, "/");
});

Deno.test("P2 Dispatcher - Recipient endpoint de-duplication prevents duplicate gateway dispatches", async () => {
  const vapid = await generateTestVapidKeyPair();
  const subKeys = await generateTestSubscriberKeys();

  const sharedEndpoint = "https://fcm.googleapis.com/fcm/send/shared-endpoint-dup";

  // Provide duplicate subscription endpoints and duplicate subscription IDs
  const duplicateSubs: RecipientSubscription[] = [
    { id: "sub-dup-1", user_id: "user-1", endpoint: sharedEndpoint, p256dh: subKeys.p256dh, auth: subKeys.auth },
    { id: "sub-dup-1", user_id: "user-1", endpoint: sharedEndpoint, p256dh: subKeys.p256dh, auth: subKeys.auth },
    { id: "sub-dup-2", user_id: "user-2", endpoint: sharedEndpoint, p256dh: subKeys.p256dh, auth: subKeys.auth },
    { id: "sub-unique-3", user_id: "user-3", endpoint: "https://p01-push.apple.com/send/unique-3", p256dh: subKeys.p256dh, auth: subKeys.auth },
  ];

  let gatewayCallCount = 0;

  const mockFetchCounter = async (): Promise<Response> => {
    gatewayCallCount++;
    return new Response(null, { status: 200 });
  };

  const batchRes = await batchDispatchPushNotifications(
    duplicateSubs,
    { title: "Deduplication Test", message: "Hello" },
    {
      vapidPublicKey: vapid.publicKey,
      vapidPrivateKey: vapid.privateKey,
      fetchFn: mockFetchCounter as unknown as typeof fetch,
    }
  );

  // Total de-duplicated unique recipients should be 2 (sharedEndpoint and unique-3)
  assertEquals(batchRes.total, 2);
  assertEquals(batchRes.successful, 2);
  assertEquals(batchRes.failed, 0);
  assertEquals(gatewayCallCount, 2); // Asserts exact gateway call count matches unique recipients
});
