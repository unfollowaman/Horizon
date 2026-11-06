import { assertEquals } from "jsr:@std/assert";
import {
  handleRequest,
  extractSessionId,
  extractBearerToken,
  getCorsHeaders,
} from "./index.ts";

function makeJwt(claims: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const payload = btoa(JSON.stringify(claims))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${header}.${payload}.mock-signature`;
}

const VALID_USER_ID = "6270e9bc-fa42-41a2-8bbd-b5b556473127";
const VALID_SESSION_ID = "94b32b85-0d32-4d43-bb9e-3d2319c72e90";
const VALID_RESOURCE = {
  id: 101,
  resource_type: "notes",
  storage_bucket: "pdfs",
  file_path: "notes/class10/math.pdf",
  allow_download: true,
  is_active: true,
};

function createMockUserClient(user: { id: string } | null, resource: unknown = VALID_RESOURCE, resourceError: unknown = null) {
  return {
    auth: {
      getUser: () => Promise.resolve({ data: { user }, error: null }),
    },
    from: (_table: string) => ({
      select: (_cols: string) => ({
        eq: (_col: string, _val: unknown) => ({
          single: () => Promise.resolve({ data: resource, error: resourceError }),
        }),
      }),
    }),
  };
}

function createSpyAdminClient(options?: {
  isActiveSession?: boolean;
  sessionRpcError?: Error | null;
  storageData?: { signedUrl: string } | null;
  storageError?: Error | null;
}) {
  let storageCalled = false;
  let rpcCalledWith: { p_user_id: string; p_session_id: string } | null = null;

  return {
    get storageCalled() {
      return storageCalled;
    },
    get rpcCalledWith() {
      return rpcCalledWith;
    },
    rpc: (fn: string, params: { p_user_id: string; p_session_id: string }) => {
      if (fn === "is_active_session") {
        rpcCalledWith = params;
        return Promise.resolve({
          data: options?.isActiveSession ?? true,
          error: options?.sessionRpcError ?? null,
        });
      }
      return Promise.resolve({ data: null, error: new Error(`Unknown RPC ${fn}`) });
    },
    storage: {
      from: (_bucket: string) => ({
        createSignedUrl: (_path: string, _expiresIn: number) => {
          storageCalled = true;
          return Promise.resolve({
            data: options?.storageData ?? { signedUrl: "https://example.com/signed.pdf" },
            error: options?.storageError ?? null,
          });
        },
      }),
    },
  };
}

// ---------------------------------------------------------------------------
// Pure Function Tests
// ---------------------------------------------------------------------------

Deno.test("extractBearerToken - valid format", () => {
  const res = extractBearerToken("Bearer token-abc");
  assertEquals(res.token, "token-abc");
});

Deno.test("extractBearerToken - missing header", () => {
  const res = extractBearerToken(null);
  assertEquals(res.token, null);
  assertEquals(res.error, "Missing Authorization header");
});

Deno.test("extractBearerToken - non-bearer format", () => {
  const res = extractBearerToken("Basic user:pass");
  assertEquals(res.token, null);
  assertEquals(res.error, "Invalid Authorization header format. Must be 'Bearer <token>'");
});

Deno.test("extractSessionId - valid UUID claim", () => {
  const token = makeJwt({ sub: VALID_USER_ID, session_id: VALID_SESSION_ID });
  const sessionId = extractSessionId(token);
  assertEquals(sessionId, VALID_SESSION_ID);
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
  assertEquals(extractSessionId("not.a.valid.jwt.string"), null);
  assertEquals(extractSessionId("invalid"), null);
});

// ---------------------------------------------------------------------------
// HTTP Handler & Active Session Enforcement Tests
// ---------------------------------------------------------------------------

Deno.test("handleRequest - OPTIONS returns 200 CORS preflight", async () => {
  const req = new Request("http://localhost/", { method: "OPTIONS" });
  const res = await handleRequest(req);
  assertEquals(res.status, 200);
});

Deno.test("handleRequest - GET method not allowed (405)", async () => {
  const req = new Request("http://localhost/", { method: "GET" });
  const res = await handleRequest(req);
  assertEquals(res.status, 405);
});

Deno.test("handleRequest - Missing Authorization header returns 401", async () => {
  const req = new Request("http://localhost/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resource_id: 101 }),
  });
  const res = await handleRequest(req);
  assertEquals(res.status, 401);
});

Deno.test("handleRequest - Missing resource_id in body returns 400", async () => {
  const token = makeJwt({ sub: VALID_USER_ID, session_id: VALID_SESSION_ID });
  const req = new Request("http://localhost/", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });
  const mockUser = createMockUserClient({ id: VALID_USER_ID });
  const spyAdmin = createSpyAdminClient();
  const res = await handleRequest(req, {
    supabaseUserClient: mockUser,
    supabaseAdminClient: spyAdmin,
  });
  assertEquals(res.status, 400);
});

Deno.test("handleRequest - JWT missing session_id returns 401 and blocks storage", async () => {
  const tokenWithoutSession = makeJwt({ sub: VALID_USER_ID });
  const req = new Request("http://localhost/", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenWithoutSession}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ resource_id: 101 }),
  });
  const mockUser = createMockUserClient({ id: VALID_USER_ID });
  const spyAdmin = createSpyAdminClient({ isActiveSession: true });

  const res = await handleRequest(req, {
    supabaseUserClient: mockUser,
    supabaseAdminClient: spyAdmin,
  });

  assertEquals(res.status, 401);
  assertEquals(spyAdmin.storageCalled, false);
});

Deno.test("handleRequest - Replaced session (RPC isActive = false) returns 401 and blocks storage", async () => {
  const token = makeJwt({ sub: VALID_USER_ID, session_id: VALID_SESSION_ID });
  const req = new Request("http://localhost/", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ resource_id: 101 }),
  });
  const mockUser = createMockUserClient({ id: VALID_USER_ID });
  const spyAdmin = createSpyAdminClient({ isActiveSession: false });

  const res = await handleRequest(req, {
    supabaseUserClient: mockUser,
    supabaseAdminClient: spyAdmin,
  });

  assertEquals(res.status, 401);
  assertEquals(spyAdmin.storageCalled, false);
  assertEquals(spyAdmin.rpcCalledWith?.p_user_id, VALID_USER_ID);
  assertEquals(spyAdmin.rpcCalledWith?.p_session_id, VALID_SESSION_ID);
});

Deno.test("handleRequest - Session RPC error returns 401 and blocks storage", async () => {
  const token = makeJwt({ sub: VALID_USER_ID, session_id: VALID_SESSION_ID });
  const req = new Request("http://localhost/", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ resource_id: 101 }),
  });
  const mockUser = createMockUserClient({ id: VALID_USER_ID });
  const spyAdmin = createSpyAdminClient({ sessionRpcError: new Error("Database timeout") });

  const res = await handleRequest(req, {
    supabaseUserClient: mockUser,
    supabaseAdminClient: spyAdmin,
  });

  assertEquals(res.status, 401);
  assertEquals(spyAdmin.storageCalled, false);
});

Deno.test("handleRequest - Active session succeeds and generates signed URL", async () => {
  const token = makeJwt({ sub: VALID_USER_ID, session_id: VALID_SESSION_ID });
  const req = new Request("http://localhost/", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ resource_id: 101 }),
  });
  const mockUser = createMockUserClient({ id: VALID_USER_ID });
  const spyAdmin = createSpyAdminClient({
    isActiveSession: true,
    storageData: { signedUrl: "https://storage.example.com/signed-url-for-doc" },
  });

  const res = await handleRequest(req, {
    supabaseUserClient: mockUser,
    supabaseAdminClient: spyAdmin,
  });

  assertEquals(res.status, 200);
  assertEquals(spyAdmin.storageCalled, true);
  const data = await res.json();
  assertEquals(data.success, true);
  assertEquals(data.signed_url, "https://storage.example.com/signed-url-for-doc");
  assertEquals(data.expires_in, 60);
});

Deno.test("handleRequest - Resource not found returns 404", async () => {
  const token = makeJwt({ sub: VALID_USER_ID, session_id: VALID_SESSION_ID });
  const req = new Request("http://localhost/", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ resource_id: 9999 }),
  });
  const mockUser = createMockUserClient({ id: VALID_USER_ID }, null, new Error("Not found"));
  const spyAdmin = createSpyAdminClient({ isActiveSession: true });

  const res = await handleRequest(req, {
    supabaseUserClient: mockUser,
    supabaseAdminClient: spyAdmin,
  });

  assertEquals(res.status, 404);
  assertEquals(spyAdmin.storageCalled, false);
});
