import { assertEquals } from "jsr:@std/assert";
import {
  validatePushEndpoint,
  getCorsHeaders,
  extractBearerToken,
  readBoundedBodyStream,
  validateJsonObject,
  isValidJsonContentType,
  handleRequest,
  MAX_BODY_BYTES,
} from "./index.ts";

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

Deno.test("isValidJsonContentType - valid application/json", () => {
  assertEquals(isValidJsonContentType("application/json"), true);
  assertEquals(isValidJsonContentType("application/json; charset=utf-8"), true);
  assertEquals(isValidJsonContentType("APPLICATION/JSON; CHARSET=UTF-8"), true);
});

Deno.test("isValidJsonContentType - reject invalid content types", () => {
  assertEquals(isValidJsonContentType(null), false);
  assertEquals(isValidJsonContentType(""), false);
  assertEquals(isValidJsonContentType("text/plain"), false);
  assertEquals(isValidJsonContentType("multipart/form-data"), false);
  assertEquals(isValidJsonContentType("application/x-www-form-urlencoded"), false);
});

Deno.test("validateJsonObject - accept valid plain object", () => {
  const res = validateJsonObject({ subscription: {} });
  assertEquals(res.valid, true);
});

Deno.test("validateJsonObject - reject null", () => {
  const res = validateJsonObject(null);
  assertEquals(res.valid, false);
  assertEquals(res.error, "Request body must be a JSON object");
});

Deno.test("validateJsonObject - reject array", () => {
  const res = validateJsonObject(["subscription"]);
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

Deno.test("readBoundedBodyStream - normal payload within limit", async () => {
  const payload = JSON.stringify({ subscription: { endpoint: "https://fcm.googleapis.com/fcm/send/123" } });
  const req = new Request("https://unfollowaman.tech/subscribe-push", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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

  const req = new Request("https://unfollowaman.tech/subscribe-push", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: stream,
    // @ts-ignore stream body requires duplex in node fetch
    duplex: "half",
  });

  const res = await readBoundedBodyStream(req, 1000);
  assertEquals(res.oversized, true);
  assertEquals(res.text, undefined);
});

Deno.test("validatePushEndpoint - valid FCM endpoint", () => {
  const res = validatePushEndpoint("https://fcm.googleapis.com/fcm/send/test-token-123");
  assertEquals(res.valid, true);
  assertEquals(res.url?.hostname, "fcm.googleapis.com");
});

Deno.test("validatePushEndpoint - valid Mozilla push endpoint", () => {
  const res = validatePushEndpoint("https://updates.push.services.mozilla.com/wpush/v2/test");
  assertEquals(res.valid, true);
});

Deno.test("validatePushEndpoint - valid Apple push endpoints", () => {
  const res1 = validatePushEndpoint("https://p01-push.apple.com/send/token");
  assertEquals(res1.valid, true);

  const res2 = validatePushEndpoint("https://push.apple.com/send/token");
  assertEquals(res2.valid, true);

  const res3 = validatePushEndpoint("https://p123-push.apple.com/send/token");
  assertEquals(res3.valid, true);
});

Deno.test("validatePushEndpoint - reject invalid Apple hostname lookalikes & malformed variants", () => {
  const res1 = validatePushEndpoint("https://fakeapple.com/send");
  assertEquals(res1.valid, false);

  const res2 = validatePushEndpoint("https://p01-push.apple.com.evil.com/send");
  assertEquals(res2.valid, false);

  const res3 = validatePushEndpoint("https://pushapple.com/send");
  assertEquals(res3.valid, false);

  const res4 = validatePushEndpoint("https://not-push.apple.com.attacker.net/send");
  assertEquals(res4.valid, false);

  const res5 = validatePushEndpoint("https://p01push.apple.com/send");
  assertEquals(res5.valid, false);

  const res6 = validatePushEndpoint("https://apple.com/send");
  assertEquals(res6.valid, false);

  const res7 = validatePushEndpoint("http://p01-push.apple.com/send");
  assertEquals(res7.valid, false);
  assertEquals(res7.error, "Push endpoint must use HTTPS");

  const res8 = validatePushEndpoint("https://user:pass@p01-push.apple.com/send");
  assertEquals(res8.valid, false);
  assertEquals(res8.error, "Push endpoint must not contain user credentials");

  const res9 = validatePushEndpoint("https://p01-push.apple.com:8443/send");
  assertEquals(res9.valid, false);
  assertEquals(res9.error, "Push endpoint must use standard HTTPS port (443)");
});

Deno.test("validatePushEndpoint - valid Windows notify endpoint", () => {
  const res = validatePushEndpoint("https://db5p.notify.windows.com/w/?token=abc");
  assertEquals(res.valid, true);
});

Deno.test("validatePushEndpoint - reject HTTP protocol", () => {
  const res = validatePushEndpoint("http://fcm.googleapis.com/fcm/send/test");
  assertEquals(res.valid, false);
  assertEquals(res.error, "Push endpoint must use HTTPS");
});

Deno.test("validatePushEndpoint - reject embedded user credentials", () => {
  const res = validatePushEndpoint("https://user:pass@fcm.googleapis.com/fcm/send/test");
  assertEquals(res.valid, false);
  assertEquals(res.error, "Push endpoint must not contain user credentials");
});

Deno.test("validatePushEndpoint - reject URL fragments", () => {
  const res = validatePushEndpoint("https://fcm.googleapis.com/fcm/send/test#fragment");
  assertEquals(res.valid, false);
  assertEquals(res.error, "Push endpoint must not contain URL fragments");
});

Deno.test("validatePushEndpoint - reject non-standard port", () => {
  const res = validatePushEndpoint("https://fcm.googleapis.com:8443/fcm/send/test");
  assertEquals(res.valid, false);
  assertEquals(res.error, "Push endpoint must use standard HTTPS port (443)");
});

Deno.test("validatePushEndpoint - reject localhost / IP addresses", () => {
  const res1 = validatePushEndpoint("https://localhost/fcm/send/test");
  assertEquals(res1.valid, false);

  const res2 = validatePushEndpoint("https://127.0.0.1/fcm/send/test");
  assertEquals(res2.valid, false);

  const res3 = validatePushEndpoint("https://192.168.1.1/fcm/send/test");
  assertEquals(res3.valid, false);
});

Deno.test("validatePushEndpoint - reject unapproved hostname", () => {
  const res = validatePushEndpoint("https://malicious-push-server.com/send");
  assertEquals(res.valid, false);
  assertEquals(res.error, "Push endpoint host is not in the approved allowlist");
});

Deno.test("validatePushEndpoint - reject overly broad googleapis domain", () => {
  const res = validatePushEndpoint("https://storage.googleapis.com/bucket/file");
  assertEquals(res.valid, false);
  assertEquals(res.error, "Push endpoint host is not in the approved allowlist");
});

Deno.test("getCorsHeaders - matches allowed origin", () => {
  const headers = getCorsHeaders("http://localhost:5173");
  assertEquals(headers["Access-Control-Allow-Origin"], "http://localhost:5173");
  assertEquals(headers["Access-Control-Allow-Methods"], "POST, DELETE, OPTIONS");
});

Deno.test("getCorsHeaders - falls back for untrusted origin", () => {
  const headers = getCorsHeaders("https://untrusted-domain.com");
  assertEquals(headers["Access-Control-Allow-Origin"], "https://unfollowaman.tech");
});

// -------------------------------------------------------------------
// Integration Tests for handleRequest (HTTP Handler)
// -------------------------------------------------------------------

function createMockSupabaseUser(user: { id: string } | null, authError: Error | null = null) {
  return {
    auth: {
      getUser: (_token: string) => Promise.resolve({ data: { user }, error: authError }),
    },
  };
}

interface MockSubscriptionRow {
  id: string;
  user_id: string;
  endpoint: string;
  is_active: boolean;
}

interface RecordedMutation {
  table: string;
  action: "update" | "insert";
  data: Record<string, unknown>;
  eqFilters: Record<string, unknown>;
}

function createSpySupabaseAdmin(
  subscription: MockSubscriptionRow | null = null,
  profile: { student_class?: string; study_medium?: string; onboarding_completed?: boolean } | null = null,
  dbQueryError: Error | null = null,
  dbMutationError: Error | null = null
) {
  const mutations: RecordedMutation[] = [];

  return {
    mutations,
    from: (table: string) => {
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: profile, error: dbQueryError }),
            }),
          }),
        };
      }
      if (table === "push_subscriptions") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: subscription, error: dbQueryError }),
            }),
          }),
          update: (data: Record<string, unknown>) => {
            const eqFilters: Record<string, unknown> = {};
            const chain = {
              eq: (field: string, value: unknown) => {
                eqFilters[field] = value;
                return chain;
              },
              then: (onfulfilled?: (value: { error: Error | null }) => unknown) => {
                mutations.push({ table, action: "update", data, eqFilters });
                const res = { error: dbMutationError };
                return Promise.resolve(onfulfilled ? onfulfilled(res) : res);
              },
            };
            return chain;
          },
          insert: (data: Record<string, unknown>) => {
            mutations.push({ table, action: "insert", data, eqFilters: {} });
            return Promise.resolve({ error: dbMutationError });
          },
        };
      }
      return {};
    },
  };
}

const VALID_SUB_PAYLOAD = {
  subscription: {
    endpoint: "https://p01-push.apple.com/send/token123",
    keys: {
      p256dh: "BIPLzI4-B20b3R0p-5g3G6T4X8O9L_P1R2S3T4U5V6W7X8Y9Z0a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
      auth: "authKeySample1234567890",
    },
  },
};

Deno.test("handleRequest - OPTIONS preflight returns CORS headers", async () => {
  const req = new Request("https://unfollowaman.tech/subscribe-push", {
    method: "OPTIONS",
    headers: { Origin: "http://localhost:5173" },
  });
  const res = await handleRequest(req);
  assertEquals(res.status, 200);
  assertEquals(res.headers.get("Access-Control-Allow-Origin"), "http://localhost:5173");
});

Deno.test("handleRequest - Unsupported method returns 405", async () => {
  const req = new Request("https://unfollowaman.tech/subscribe-push", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
  });
  const res = await handleRequest(req);
  assertEquals(res.status, 405);
  const json = await res.json();
  assertEquals(json.error, "Method not allowed");
});

Deno.test("handleRequest - Missing Content-Type returns 415", async () => {
  const req = new Request("https://unfollowaman.tech/subscribe-push", {
    method: "POST",
  });
  const res = await handleRequest(req);
  assertEquals(res.status, 415);
  const json = await res.json();
  assertEquals(json.error, "Unsupported Media Type: Content-Type must be application/json");
});

Deno.test("handleRequest - Non-JSON Content-Type returns 415", async () => {
  const req = new Request("https://unfollowaman.tech/subscribe-push", {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
  });
  const res = await handleRequest(req);
  assertEquals(res.status, 415);
});

Deno.test("handleRequest - Missing Bearer token returns 401", async () => {
  const req = new Request("https://unfollowaman.tech/subscribe-push", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  const res = await handleRequest(req);
  assertEquals(res.status, 401);
  const json = await res.json();
  assertEquals(json.error, "Missing Authorization header");
});

Deno.test("handleRequest - Invalid or expired Bearer token returns 401", async () => {
  const mockUserClient = createMockSupabaseUser(null, new Error("Invalid JWT token"));
  const req = new Request("https://unfollowaman.tech/subscribe-push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer invalid-token",
    },
  });
  const res = await handleRequest(req, { supabaseUserClient: mockUserClient });
  assertEquals(res.status, 401);
  const json = await res.json();
  assertEquals(json.error, "Unauthorized");
});

Deno.test("handleRequest - Malformed JSON body returns 400", async () => {
  const mockUserClient = createMockSupabaseUser({ id: "user-123" });
  const req = new Request("https://unfollowaman.tech/subscribe-push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer valid-token",
    },
    body: "{ malformed json",
  });
  const res = await handleRequest(req, { supabaseUserClient: mockUserClient });
  assertEquals(res.status, 400);
  const json = await res.json();
  assertEquals(json.error, "Invalid JSON payload");
});

Deno.test("handleRequest - Oversized request body returns 413", async () => {
  const mockUserClient = createMockSupabaseUser({ id: "user-123" });
  const oversizedPayload = JSON.stringify({ padding: "A".repeat(17000) });
  const req = new Request("https://unfollowaman.tech/subscribe-push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer valid-token",
      "Content-Length": String(oversizedPayload.length),
    },
    body: oversizedPayload,
  });
  const res = await handleRequest(req, { supabaseUserClient: mockUserClient });
  assertEquals(res.status, 413);
  const json = await res.json();
  assertEquals(json.error, "Request payload too large");
});

Deno.test("handleRequest - Invalid subscription payload (bad host) returns 400", async () => {
  const mockUserClient = createMockSupabaseUser({ id: "user-123" });
  const badPayload = {
    subscription: {
      endpoint: "https://evil-unapproved-host.com/send",
      keys: { p256dh: "BIPLzI4-B20b3R0p-5g3G6T4X8O9L_P1R2S3T4U5V6W7X8Y9Z0a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6", auth: "authKeySample1234567890" },
    },
  };
  const req = new Request("https://unfollowaman.tech/subscribe-push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer valid-token",
    },
    body: JSON.stringify(badPayload),
  });
  const res = await handleRequest(req, { supabaseUserClient: mockUserClient });
  assertEquals(res.status, 400);
  const json = await res.json();
  assertEquals(json.error, "Push endpoint host is not in the approved allowlist");
});

Deno.test("handleRequest - Successful new subscription creation returns 201 and verifies DB insert payload", async () => {
  const mockUserClient = createMockSupabaseUser({ id: "user-123" });
  const mockAdminClient = createSpySupabaseAdmin(null, { student_class: "10", study_medium: "english", onboarding_completed: true });

  const req = new Request("https://unfollowaman.tech/subscribe-push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer valid-token",
    },
    body: JSON.stringify(VALID_SUB_PAYLOAD),
  });
  const res = await handleRequest(req, { supabaseUserClient: mockUserClient, supabaseAdminClient: mockAdminClient });
  assertEquals(res.status, 201);
  const json = await res.json();
  assertEquals(json.success, true);
  assertEquals(json.message, "Push subscription created successfully");

  // Verify DB mutation
  assertEquals(mockAdminClient.mutations.length, 1);
  const mutation = mockAdminClient.mutations[0];
  assertEquals(mutation.action, "insert");
  assertEquals(mutation.data.user_id, "user-123");
  assertEquals(mutation.data.endpoint, "https://p01-push.apple.com/send/token123");
  assertEquals(mutation.data.student_class, "10");
  assertEquals(mutation.data.study_medium, "english");
  assertEquals(mutation.data.is_active, true);
});

Deno.test("handleRequest - Update existing subscription for same user returns 200 and verifies dual eq(id, user_id) targeting", async () => {
  const mockUserClient = createMockSupabaseUser({ id: "user-123" });
  const existingSub = { id: "sub-1", user_id: "user-123", endpoint: VALID_SUB_PAYLOAD.subscription.endpoint, is_active: false };
  const mockAdminClient = createSpySupabaseAdmin(existingSub, { student_class: "10", study_medium: "english", onboarding_completed: true });

  const req = new Request("https://unfollowaman.tech/subscribe-push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer valid-token",
    },
    body: JSON.stringify(VALID_SUB_PAYLOAD),
  });
  const res = await handleRequest(req, { supabaseUserClient: mockUserClient, supabaseAdminClient: mockAdminClient });
  assertEquals(res.status, 200);
  const json = await res.json();
  assertEquals(json.success, true);
  assertEquals(json.message, "Push subscription updated successfully");

  // Verify DB update targeted BOTH sub ID and user ID
  assertEquals(mockAdminClient.mutations.length, 1);
  const mutation = mockAdminClient.mutations[0];
  assertEquals(mutation.action, "update");
  assertEquals(mutation.eqFilters["id"], "sub-1");
  assertEquals(mutation.eqFilters["user_id"], "user-123");
  assertEquals(mutation.data.is_active, true);
});

Deno.test("handleRequest - Conflict on duplicate endpoint owned by another user returns 409 and produces ZERO mutations", async () => {
  const mockUserClient = createMockSupabaseUser({ id: "user-123" });
  const anotherUserSub = { id: "sub-999", user_id: "other-user-999", endpoint: VALID_SUB_PAYLOAD.subscription.endpoint, is_active: true };
  const mockAdminClient = createSpySupabaseAdmin(anotherUserSub, { student_class: "10", study_medium: "english", onboarding_completed: true });

  const req = new Request("https://unfollowaman.tech/subscribe-push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer valid-token",
    },
    body: JSON.stringify(VALID_SUB_PAYLOAD),
  });
  const res = await handleRequest(req, { supabaseUserClient: mockUserClient, supabaseAdminClient: mockAdminClient });
  assertEquals(res.status, 409);
  const json = await res.json();
  assertEquals(json.error, "Push subscription endpoint already registered to another account");

  // Verify NO DB mutation occurred
  assertEquals(mockAdminClient.mutations.length, 0);
});

Deno.test("handleRequest - Successful unsubscribe of user's own subscription returns 200 and verifies dual eq(id, user_id) targeting with is_active=false", async () => {
  const mockUserClient = createMockSupabaseUser({ id: "user-123" });
  const existingSub = { id: "sub-777", user_id: "user-123", endpoint: VALID_SUB_PAYLOAD.subscription.endpoint, is_active: true };
  const mockAdminClient = createSpySupabaseAdmin(existingSub);

  const req = new Request("https://unfollowaman.tech/subscribe-push", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer valid-token",
    },
    body: JSON.stringify({ endpoint: VALID_SUB_PAYLOAD.subscription.endpoint }),
  });
  const res = await handleRequest(req, { supabaseUserClient: mockUserClient, supabaseAdminClient: mockAdminClient });
  assertEquals(res.status, 200);
  const json = await res.json();
  assertEquals(json.success, true);
  assertEquals(json.message, "Push subscription deactivated successfully");

  // Verify DB update set is_active = false for exact sub ID and user ID
  assertEquals(mockAdminClient.mutations.length, 1);
  const mutation = mockAdminClient.mutations[0];
  assertEquals(mutation.action, "update");
  assertEquals(mutation.eqFilters["id"], "sub-777");
  assertEquals(mutation.eqFilters["user_id"], "user-123");
  assertEquals(mutation.data.is_active, false);
});

Deno.test("handleRequest - Unsubscribe attempt on subscription owned by another user returns 403 and produces ZERO mutations", async () => {
  const mockUserClient = createMockSupabaseUser({ id: "user-123" });
  const anotherUserSub = { id: "sub-888", user_id: "other-user-999", endpoint: VALID_SUB_PAYLOAD.subscription.endpoint, is_active: true };
  const mockAdminClient = createSpySupabaseAdmin(anotherUserSub);

  const req = new Request("https://unfollowaman.tech/subscribe-push", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer valid-token",
    },
    body: JSON.stringify({ endpoint: VALID_SUB_PAYLOAD.subscription.endpoint }),
  });
  const res = await handleRequest(req, { supabaseUserClient: mockUserClient, supabaseAdminClient: mockAdminClient });
  assertEquals(res.status, 403);
  const json = await res.json();
  assertEquals(json.error, "Forbidden: Cannot deactivate a subscription owned by another user");

  // Verify ZERO DB mutations occurred
  assertEquals(mockAdminClient.mutations.length, 0);
});

Deno.test("handleRequest - Idempotent unsubscribe of missing subscription returns 200 and produces ZERO mutations", async () => {
  const mockUserClient = createMockSupabaseUser({ id: "user-123" });
  const mockAdminClient = createSpySupabaseAdmin(null);

  const req = new Request("https://unfollowaman.tech/subscribe-push", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer valid-token",
    },
    body: JSON.stringify({ endpoint: VALID_SUB_PAYLOAD.subscription.endpoint }),
  });
  const res = await handleRequest(req, { supabaseUserClient: mockUserClient, supabaseAdminClient: mockAdminClient });
  assertEquals(res.status, 200);
  const json = await res.json();
  assertEquals(json.success, true);
  assertEquals(json.message, "Push subscription deactivated successfully");

  // Verify ZERO DB mutations occurred
  assertEquals(mockAdminClient.mutations.length, 0);
});

Deno.test("handleRequest - Database error returns sanitized 500 response", async () => {
  const mockUserClient = createMockSupabaseUser({ id: "user-123" });
  const mockAdminClient = createSpySupabaseAdmin(null, null, new Error("PostgreSQL connection timeout"));

  const req = new Request("https://unfollowaman.tech/subscribe-push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer valid-token",
    },
    body: JSON.stringify(VALID_SUB_PAYLOAD),
  });
  const res = await handleRequest(req, { supabaseUserClient: mockUserClient, supabaseAdminClient: mockAdminClient });
  assertEquals(res.status, 500);
  const json = await res.json();
  assertEquals(json.error, "Internal server error");
});
