import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  // 1. Check for authorization header (even though verify_jwt = true should block invalid ones, we need to extract it)
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 2. Initialize Supabase client
  // Get environment variables injected by Supabase Edge Runtime
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

  // Create a Supabase client configured to use the user's Authorization header
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

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

  // 4. Return success response (Temporarily for Phase 5B)
  return new Response(
    JSON.stringify({
      success: true,
      user_id: user.id,
    }),
    {
      headers: { "Content-Type": "application/json" },
    }
  );
});
