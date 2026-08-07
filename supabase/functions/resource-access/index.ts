import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  // Only accept POST requests
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ success: false, error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 1. Check for authorization header
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 1b. Parse Request Body
  let body;
  try {
    body = await req.json();
  } catch (_e) { // eslint-disable-line @typescript-eslint/no-unused-vars
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

  // 2. Initialize Supabase client
  // Get environment variables injected by Supabase Edge Runtime
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  // Create a Supabase client configured to use the user's Authorization header
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  // Create an Admin client to bypass Storage RLS
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

  // 3. Get user using the recommended getUser() method
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error("Auth error:", authError);
    return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 4. Query the learning_resources table
  const { data: resource, error: resourceError } = await supabase
    .from("learning_resources")
    .select("id, resource_type, storage_bucket, file_path, allow_download, is_active")
    .eq("id", resource_id)
    .single();

  // 5. Verify the resource
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

  // 6. Generate Signed URL (lifetime 60 seconds)
  const { data: storageData, error: storageError } = await supabaseAdmin.storage
    .from(resource.storage_bucket)
    .createSignedUrl(resource.file_path, 60);

  if (storageError || !storageData) {
    console.error("Storage error:", storageError);
    return new Response(JSON.stringify({ success: false, error: "Storage failure" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 7. Return signed URL only
  return new Response(
    JSON.stringify({
      success: true,
      signed_url: storageData.signedUrl,
      expires_in: 60,
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
});
