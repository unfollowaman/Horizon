import { assertEquals } from "jsr:@std/assert";
import {
  validatePushEndpoint,
  getCorsHeaders,
  extractBearerToken,
  extractSessionId,
  readBoundedBodyStream,
  validateJsonObject,
  isValidJsonContentType,
  handleRequest,
  MAX_BODY_BYTES,
} from "./index.ts";

function makeJwt(claims: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const payload = btoa(JSON.stringify(claims))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${header}.${payload}.mock-signature`;
}

const VALID_USER_ID = "user-123";
const VALID_SESSION_ID = "94b32b85-0d32-4d43-bb9e-3d2319c72e90";
const VALID_TOKEN = makeJwt({ sub: VALID_USER_ID, session_id: VALID_SESSION_ID });

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

Deno.test("extractSessionId - valid UUID claim", () => {
  const token = makeJwt({ sub: VALID_USER_ID, session_id: VALID_SESSION_ID });
  assertEquals(extractSessionId(token), VALID_SESSION_ID);
});

Deno.test("extractSessionId - missing session_id", () => {
  const token = makeJwt({ sub: VALID_USER_ID });
  assertEquals(extractSessionId(token), null);
});

Deno.test("extractSessionId - non-UUID session_id", () => {
  const token = makeJwt({ sub: VALID_USER_ID, session_id: "not-a-uuid" });
  assertEquals(extractSessionId(token), null);
});

Deno.test("extractSessionId - malformed JWT", () => {
  assertEquals(extractSessionId("not.a.jwt"), null);
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
  const res = validateJsonObject([1, 2, 3]);
  assertEquals(res.valid, false);
  assertEquals(res.error, "Request body must be a JSON object");
});

Deno.test("validateJsonObject - reject primitives", () => {
  assertEquals(validateJsonObject("string").valid, false);
  assertEquals(validateJsonObject(123).valid, false);
  assertEquals(validateJsonObject(true).valid, false);
});

Deno.test("readBoundedBodyStream - handles empty body", async () => {
  const req = new Request("https://example.com", { method: "POST" });
  const res = await readBoundedBodyStream(req);
  assertEquals(res.text, "");
});

Deno.test("readBoundedBodyStream - reads payload within limit", async () => {
  const payload = JSON.stringify({ test: "data" });
  const req = new Request("https://example.com", { method: "POST", body: payload });
  const res = await readBoundedBodyStream(req, 100);
  assertEquals(res.text, payload);
});

Deno.test("readBoundedBodyStream - flags oversized payload and closes stream cleanly", async () => {
  const payload = "A".repeat(500);
  const req = new Request("https://example.com", { method: "POST", body: payload });
  const res = await readBoundedBodyStream(req, 100);
  assertEquals(res.oversized, true);
});

Deno.test("validatePushEndpoint - accept valid Apple Push endpoint", () => {
  const res = validatePushEndpoint("https://p01-push.apple.com/send/token123");
  assertEquals(res.valid, true);
});

Deno.test("validatePushEndpoint - accept valid Google FCM endpoint", () => {
  const res = validatePushEndpoint("https://fcm.googleapis.com/fcm/send/token456");
  assertEquals(res.valid, true);
});

Deno.test("validatePushEndpoint - accept valid Mozilla Push endpoint", () => {
  const res = validatePushEndpoint("https://updates.push.services.mozilla.com/wpush/v2/token789");
  assertEquals(res.valid, true);
});

Deno.test("validatePushEndpoint - accept valid Windows WNS endpoint", () => {
  const res = validatePushEndpoint("https://db5.notify.windows.com/w/?token=tokenABC");
  assertEquals(res.valid, true);
});

Deno.test("validatePushEndpoint - accept valid Opera Push endpoint", () => {
  const res = validatePushEndpoint("https://push.opera.com/v1/tokenXYZ");
  assertEquals(res.valid, true);
});

Deno.test("validatePushEndpoint - reject non-HTTPS protocol", () => {
  const res = validatePushEndpoint("http://fcm.googleapis.com/fcm/send/test");
  assertEquals(res.valid, false);
  assertEquals(res.error, "Push endpoint must use HTTPS");
});

Deno.test("validatePushEndpoint - reject URL credentials", () => {
  const res = validatePushEndpoint("https://user:pass@fcm.googleapis.com/fcm/send");
  assertEquals(res.valid, false);
  assertEquals(res.error, "Push endpoint must not contain user credentials");
});

Deno.test("validatePushEndpoint - reject URL fragments", () => {
  const res = validatePushEndpoint("https://fcm.googleapis.com/fcm/send#fragment");
  assertEquals(res.valid, false);
  assertEquals(res.error, "Push endpoint must not contain URL fragments");
});

Deno.test("validatePushEndpoint - reject non-standard port", () => {
  const res = validatePushEndpoint("https://fcm.googleapis.com:8443/fcm/send");
  assertEquals(res.valid, false);
  assertEquals(res.error, "Push endpoint must use standard HTTPS port (443)");
});

Deno.test("validatePushEndpoint - reject localhost and IP addresses", () => {
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
  dbMutationError: Error | null = null,
  isActiveSession: boolean = true,
  sessionRpcError: Error | null = null
) {
  const mutations: RecordedMutation[] = [];
  let rpcCalledWith: { p_user_id: string; p_session_id: string } | null = null;

  return {
    mutations,
    get rpcCalledWith() {
      return rpcCalledWith;
    },
    rpc: (fn: string, params: { p_user_id: string; p_session_id: string }) => {
      if (fn === "is_active_session") {
        rpcCalledWith = params;
        return Promise.resolve({
          data: isActiveSession,
          error: sessionRpcError,
        });
      }
      return Promise.resolve({ data: null, error: new Error(`Unknown RPC ${fn}`) });
    },
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

Deno.test("handleRequest - Missing session_id claim returns 401 and produces ZERO mutations", async () => {
  const tokenWithoutSession = makeJwt({ sub: VALID_USER_ID });
  const mockUserClient = createMockSupabaseUser({ id: VALID_USER_ID });
  const mockAdminClient = createSpySupabaseAdmin();

  const req = new Request("https://unfollowaman.tech/subscribe-push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokenWithoutSession}`,
    },
    body: JSON.stringify(VALID_SUB_PAYLOAD),
  });
  const res = await handleRequest(req, { supabaseUserClient: mockUserClient, supabaseAdminClient: mockAdminClient });
  assertEquals(res.status, 401);
  const json = await res.json();
  assertEquals(json.error, "Unauthorized");
  assertEquals(mockAdminClient.mutations.length, 0);
});

Deno.test("handleRequest - Replaced session on POST returns 401 and produces ZERO mutations", async () => {
  const mockUserClient = createMockSupabaseUser({ id: VALID_USER_ID });
  const mockAdminClient = createSpySupabaseAdmin(null, null, null, null, false); // isActiveSession = false

  const req = new Request("https://unfollowaman.tech/subscribe-push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${VALID_TOKEN}`,
    },
    body: JSON.stringify(VALID_SUB_PAYLOAD),
  });
  const res = await handleRequest(req, { supabaseUserClient: mockUserClient, supabaseAdminClient: mockAdminClient });
  assertEquals(res.status, 401);
  const json = await res.json();
  assertEquals(json.error, "Unauthorized");
  assertEquals(mockAdminClient.mutations.length, 0);
  assertEquals(mockAdminClient.rpcCalledWith?.p_user_id, VALID_USER_ID);
  assertEquals(mockAdminClient.rpcCalledWith?.p_session_id, VALID_SESSION_ID);
});

Deno.test("handleRequest - Replaced session on DELETE returns 401 and produces ZERO mutations", async () => {
  const mockUserClient = createMockSupabaseUser({ id: VALID_USER_ID });
  const mockAdminClient = createSpySupabaseAdmin(null, null, null, null, false); // isActiveSession = false

  const req = new Request("https://unfollowaman.tech/subscribe-push", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${VALID_TOKEN}`,
    },
    body: JSON.stringify({ endpoint: VALID_SUB_PAYLOAD.subscription.endpoint }),
  });
  const res = await handleRequest(req, { supabaseUserClient: mockUserClient, supabaseAdminClient: mockAdminClient });
  assertEquals(res.status, 401);
  const json = await res.json();
  assertEquals(json.error, "Unauthorized");
  assertEquals(mockAdminClient.mutations.length, 0);
});

Deno.test("handleRequest - Session RPC error returns 401 and produces ZERO mutations", async () => {
  const mockUserClient = createMockSupabaseUser({ id: VALID_USER_ID });
  const mockAdminClient = createSpySupabaseAdmin(null, null, null, null, false, new Error("DB Error"));

  const req = new Request("https://unfollowaman.tech/subscribe-push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${VALID_TOKEN}`,
    },
    body: JSON.stringify(VALID_SUB_PAYLOAD),
  });
  const res = await handleRequest(req, { supabaseUserClient: mockUserClient, supabaseAdminClient: mockAdminClient });
  assertEquals(res.status, 401);
  assertEquals(mockAdminClient.mutations.length, 0);
});

Deno.test("handleRequest - Malformed JSON body returns 400", async () => {
  const mockUserClient = createMockSupabaseUser({ id: VALID_USER_ID });
  const mockAdminClient = createSpySupabaseAdmin();
  const req = new Request("https://unfollowaman.tech/subscribe-push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${VALID_TOKEN}`,
    },
    body: "{ malformed json",
  });
  const res = await handleRequest(req, { supabaseUserClient: mockUserClient, supabaseAdminClient: mockAdminClient });
  assertEquals(res.status, 400);
  const json = await res.json();
  assertEquals(json.error, "Invalid JSON payload");
});

Deno.test("handleRequest - Oversized request body returns 413", async () => {
  const mockUserClient = createMockSupabaseUser({ id: VALID_USER_ID });
  const mockAdminClient = createSpySupabaseAdmin();
  const oversizedPayload = JSON.stringify({ padding: "A".repeat(17000) });
  const req = new Request("https://unfollowaman.tech/subscribe-push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${VALID_TOKEN}`,
      "Content-Length": String(oversizedPayload.length),
    },
    body: oversizedPayload,
  });
  const res = await handleRequest(req, { supabaseUserClient: mockUserClient, supabaseAdminClient: mockAdminClient });
  assertEquals(res.status, 413);
  const json = await res.json();
  assertEquals(json.error, "Request payload too large");
});

Deno.test("handleRequest - Invalid subscription payload (bad host) returns 400", async () => {
  const mockUserClient = createMockSupabaseUser({ id: VALID_USER_ID });
  const mockAdminClient = createSpySupabaseAdmin();
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
      Authorization: `Bearer ${VALID_TOKEN}`,
    },
    body: JSON.stringify(badPayload),
  });
  const res = await handleRequest(req, { supabaseUserClient: mockUserClient, supabaseAdminClient: mockAdminClient });
  assertEquals(res.status, 400);
  const json = await res.json();
  assertEquals(json.error, "Push endpoint host is not in the approved allowlist");
});

Deno.test("handleRequest - Successful new subscription creation returns 201 and verifies DB insert payload", async () => {
  const mockUserClient = createMockSupabaseUser({ id: VALID_USER_ID });
  const mockAdminClient = createSpySupabaseAdmin(null, { student_class: "10", study_medium: "english", onboarding_completed: true });

  const req = new Request("https://unfollowaman.tech/subscribe-push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${VALID_TOKEN}`,
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
  assertEquals(mutation.data.user_id, VALID_USER_ID);
  assertEquals(mutation.data.endpoint, "https://p01-push.apple.com/send/token123");
  assertEquals(mutation.data.student_class, "10");
  assertEquals(mutation.data.study_medium, "english");
  assertEquals(mutation.data.is_active, true);
});

Deno.test("handleRequest - Update existing subscription for same user returns 200 and verifies dual eq(id, user_id) targeting", async () => {
  const mockUserClient = createMockSupabaseUser({ id: VALID_USER_ID });
  const existingSub = { id: "sub-1", user_id: VALID_USER_ID, endpoint: VALID_SUB_PAYLOAD.subscription.endpoint, is_active: false };
  const mockAdminClient = createSpySupabaseAdmin(existingSub, { student_class: "10", study_medium: "english", onboarding_completed: true });

  const req = new Request("https://unfollowaman.tech/subscribe-push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${VALID_TOKEN}`,
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
  assertEquals(mutation.eqFilters["user_id"], VALID_USER_ID);
  assertEquals(mutation.data.is_active, true);
});

Deno.test("handleRequest - Conflict on duplicate endpoint owned by another user returns 409 and produces ZERO mutations", async () => {
  const mockUserClient = createMockSupabaseUser({ id: VALID_USER_ID });
  const anotherUserSub = { id: "sub-999", user_id: "other-user-999", endpoint: VALID_SUB_PAYLOAD.subscription.endpoint, is_active: true };
  const mockAdminClient = createSpySupabaseAdmin(anotherUserSub, { student_class: "10", study_medium: "english", onboarding_completed: true });

  const req = new Request("https://unfollowaman.tech/subscribe-push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${VALID_TOKEN}`,
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
  const mockUserClient = createMockSupabaseUser({ id: VALID_USER_ID });
  const existingSub = { id: "sub-777", user_id: VALID_USER_ID, endpoint: VALID_SUB_PAYLOAD.subscription.endpoint, is_active: true };
  const mockAdminClient = createSpySupabaseAdmin(existingSub);

  const req = new Request("https://unfollowaman.tech/subscribe-push", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${VALID_TOKEN}`,
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
  assertEquals(mutation.eqFilters["user_id"], VALID_USER_ID);
  assertEquals(mutation.data.is_active, false);
});

Deno.test("handleRequest - Unsubscribe attempt on subscription owned by another user returns 403 and produces ZERO mutations", async () => {
  const mockUserClient = createMockSupabaseUser({ id: VALID_USER_ID });
  const anotherUserSub = { id: "sub-888", user_id: "other-user-999", endpoint: VALID_SUB_PAYLOAD.subscription.endpoint, is_active: true };
  const mockAdminClient = createSpySupabaseAdmin(anotherUserSub);

  const req = new Request("https://unfollowaman.tech/subscribe-push", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${VALID_TOKEN}`,
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
  const mockUserClient = createMockSupabaseUser({ id: VALID_USER_ID });
  const mockAdminClient = createSpySupabaseAdmin(null);

  const req = new Request("https://unfollowaman.tech/subscribe-push", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${VALID_TOKEN}`,
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
  const mockUserClient = createMockSupabaseUser({ id: VALID_USER_ID });
  const mockAdminClient = createSpySupabaseAdmin(null, null, new Error("PostgreSQL connection timeout"));

  const req = new Request("https://unfollowaman.tech/subscribe-push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${VALID_TOKEN}`,
    },
    body: JSON.stringify(VALID_SUB_PAYLOAD),
  });
  const res = await handleRequest(req, { supabaseUserClient: mockUserClient, supabaseAdminClient: mockAdminClient });
  assertEquals(res.status, 500);
  const json = await res.json();
  assertEquals(json.error, "Internal server error");
});
