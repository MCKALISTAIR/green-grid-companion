import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Authenticate the user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Create a client with the user's token to get their ID
    const userClient = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user) {
      console.error("Auth error:", authError?.message);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;
    console.log(`Starting account deletion for user: ${userId.substring(0, 8)}...`);

    // Use service role client for deletions
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get user's MPANs for consumption/footprint deletion
    const { data: meters } = await adminClient
      .from("octopus_meters")
      .select("mpan")
      .eq("user_id", userId);

    const mpans = meters?.map((m) => m.mpan) || [];

    // Delete all user data across all tables (order matters for dependencies)
    const deletions = [
      // Octopus data via MPANs
      ...(mpans.length > 0
        ? [
            adminClient.from("carbon_footprint").delete().in("mpan", mpans),
            adminClient.from("octopus_consumption").delete().in("mpan", mpans),
            adminClient.from("octopus_intelligent_dispatches").delete().eq("user_id", userId),
          ]
        : []),
      // Octopus account data
      adminClient.from("octopus_meters").delete().eq("user_id", userId),
      adminClient.from("octopus_credentials").delete().eq("user_id", userId),
      // Tesla data
      adminClient.from("tesla_charging_sessions").delete().eq("user_id", userId),
      adminClient.from("tesla_energy_data").delete().eq("user_id", userId),
      adminClient.from("tesla_energy_sites").delete().eq("user_id", userId),
      adminClient.from("tesla_vehicles").delete().eq("user_id", userId),
      adminClient.from("tesla_credentials").delete().eq("user_id", userId),
      // User preferences
      adminClient.from("user_preferences").delete().eq("user_id", userId),
    ];

    const results = await Promise.allSettled(deletions);

    // Log any failures but continue
    const failures = results.filter((r) => r.status === "rejected");
    if (failures.length > 0) {
      console.error("Some deletions failed:", failures);
    }

    // Count deleted records
    const successResults = results
      .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
      .map((r) => r.value);

    const totalDeleted = successResults.reduce((sum, r) => {
      return sum + (r.data?.length || 0);
    }, 0);

    console.log(`Deleted ${totalDeleted} records across ${successResults.length} tables`);

    // Delete the auth user account
    const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(userId);

    if (deleteUserError) {
      console.error("Failed to delete auth user:", deleteUserError.message);
      return new Response(
        JSON.stringify({
          error: "Data deleted but failed to remove auth account. Please contact support.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Account fully deleted for user: ${userId.substring(0, 8)}...`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Account and all associated data have been permanently deleted.",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Account deletion error:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred during account deletion." }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
