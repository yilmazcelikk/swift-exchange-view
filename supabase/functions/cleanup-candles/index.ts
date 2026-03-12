import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Retention policy: how many days to keep each timeframe
const RETENTION_DAYS: Record<string, number> = {
  "1m": 3,
  "15m": 14,
  "1h": 60,
  // 4h and 1d are kept indefinitely
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const results: Record<string, number> = {};

    for (const [timeframe, days] of Object.entries(RETENTION_DAYS)) {
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      const { count, error } = await supabase
        .from("candles")
        .delete({ count: "exact" })
        .eq("timeframe", timeframe)
        .lt("bucket_time", cutoff);

      if (error) {
        console.error(`Error cleaning ${timeframe}:`, error.message);
        results[timeframe] = -1;
      } else {
        results[timeframe] = count || 0;
        console.log(`Cleaned ${timeframe}: ${count} rows (cutoff: ${cutoff})`);
      }
    }

    const totalDeleted = Object.values(results).filter(v => v > 0).reduce((a, b) => a + b, 0);
    console.log(`Total deleted: ${totalDeleted}`);

    return new Response(JSON.stringify({ success: true, deleted: results, total: totalDeleted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Cleanup error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
