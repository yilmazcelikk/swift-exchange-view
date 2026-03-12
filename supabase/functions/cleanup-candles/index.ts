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
};

const BATCH_SIZE = 5000;
const MAX_BATCHES = 50; // safety limit per invocation

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const dbUrl = Deno.env.get("SUPABASE_DB_URL")!;
    const { default: postgres } = await import("https://deno.land/x/postgresjs@v3.4.5/mod.js");
    const sql = postgres(dbUrl, { max: 1 });

    const results: Record<string, number> = {};

    for (const [timeframe, days] of Object.entries(RETENTION_DAYS)) {
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      let totalDeleted = 0;

      for (let i = 0; i < MAX_BATCHES; i++) {
        const deleted = await sql`
          DELETE FROM candles
          WHERE id IN (
            SELECT id FROM candles
            WHERE timeframe = ${timeframe} AND bucket_time < ${cutoff}
            LIMIT ${BATCH_SIZE}
          )
        `;
        const count = deleted.count ?? 0;
        totalDeleted += count;
        console.log(`${timeframe} batch ${i + 1}: deleted ${count}`);
        if (count < BATCH_SIZE) break;
      }

      results[timeframe] = totalDeleted;
      console.log(`${timeframe} total: ${totalDeleted} rows deleted (cutoff: ${cutoff})`);
    }

    await sql.end();

    const total = Object.values(results).reduce((a, b) => a + b, 0);
    console.log(`Grand total deleted: ${total}`);

    return new Response(JSON.stringify({ success: true, deleted: results, total }), {
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
