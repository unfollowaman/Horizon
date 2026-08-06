import { assertEquals } from "jsr:@std/assert";

// We will test the core logic of the edge function by replicating its behavior in a testable function.

async function handleRequest(req: Request, supabaseClient: unknown): Promise<Response> {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ success: false, error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body;
  try {
    body = await req.json();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_e) {
    return new Response(JSON.stringify({ success: false, error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { resource_id } = body;
  if (resource_id === undefined || typeof resource_id !== "number") {
    return new Response(JSON.stringify({ success: false, error: "Missing or invalid resource_id" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Use the injected mock supabaseClient instead of creating a new one
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const {
    data: { user },
    error: authError,
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  } = await supabaseClient.auth.getUser();

  if (authError || !user) {
    return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const { data: resource, error: resourceError } = await supabaseClient
    .from("learning_resources")
    .select("id, resource_type, storage_bucket, file_path, allow_download, is_active")
    .eq("id", resource_id)
    .single();

  if (resourceError || !resource) {
    return new Response(JSON.stringify({ success: false, error: "Resource not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
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
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({
      success: true,
      resource: {
        id: resource.id,
        resource_type: resource.resource_type,
        storage_bucket: resource.storage_bucket,
        file_path: resource.file_path,
        allow_download: resource.allow_download,
        is_active: resource.is_active,
      },
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
}

// Mock Supabase Client Factory
function createMockClient(mockUser: unknown, mockResource: unknown, mockResourceError: unknown = null) {
  return {
    auth: {
      getUser: async () => ({ data: { user: mockUser }, error: null }),
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    from: (_table: string) => ({
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      select: (_columns: string) => ({
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        eq: (_col: string, _val: unknown) => ({
          single: async () => ({ data: mockResource, error: mockResourceError }),
        }),
      }),
    }),
  };
}

Deno.test("Missing resource_id returns 400", async () => {
  const req = new Request("http://localhost/", {
    method: "POST",
    headers: { Authorization: "Bearer valid-token" },
    body: JSON.stringify({}),
  });
  const mockClient = createMockClient({ id: "user1" }, null);
  const res = await handleRequest(req, mockClient);
  assertEquals(res.status, 400);
  const data = await res.json();
  assertEquals(data.error, "Missing or invalid resource_id");
});

Deno.test("Invalid resource_id returns 400", async () => {
  const req = new Request("http://localhost/", {
    method: "POST",
    headers: { Authorization: "Bearer valid-token" },
    body: JSON.stringify({ resource_id: "not-a-number" }),
  });
  const mockClient = createMockClient({ id: "user1" }, null);
  const res = await handleRequest(req, mockClient);
  assertEquals(res.status, 400);
});

Deno.test("Nonexistent resource returns 404", async () => {
  const req = new Request("http://localhost/", {
    method: "POST",
    headers: { Authorization: "Bearer valid-token" },
    body: JSON.stringify({ resource_id: 999 }),
  });
  const mockClient = createMockClient({ id: "user1" }, null, new Error("Not found"));
  const res = await handleRequest(req, mockClient);
  assertEquals(res.status, 404);
});

Deno.test("Inactive resource returns 404", async () => {
  const req = new Request("http://localhost/", {
    method: "POST",
    headers: { Authorization: "Bearer valid-token" },
    body: JSON.stringify({ resource_id: 1 }),
  });
  const mockResource = {
    id: 1,
    resource_type: "notes",
    storage_bucket: "pdfs",
    file_path: "path/to/file.pdf",
    allow_download: true,
    is_active: false, // INACTIVE
  };
  const mockClient = createMockClient({ id: "user1" }, mockResource);
  const res = await handleRequest(req, mockClient);
  assertEquals(res.status, 404);
});

Deno.test("Valid resource returns 200 with metadata", async () => {
  const req = new Request("http://localhost/", {
    method: "POST",
    headers: { Authorization: "Bearer valid-token" },
    body: JSON.stringify({ resource_id: 1 }),
  });
  const mockResource = {
    id: 1,
    resource_type: "notes",
    storage_bucket: "pdfs",
    file_path: "path/to/file.pdf",
    allow_download: false,
    is_active: true,
  };
  const mockClient = createMockClient({ id: "user1" }, mockResource);
  const res = await handleRequest(req, mockClient);
  assertEquals(res.status, 200);
  const data = await res.json();
  assertEquals(data.success, true);
  assertEquals(data.resource, mockResource);
});
