import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Nightly swap application edge function.
 * Calculates swap fees for all open positions and updates them.
 * Can be called by cron job or manually by admin.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse optional body for manual swap
    let manualMode = false;
    let manualOrderId: string | null = null;
    let manualSwapAmount: number | null = null;

    try {
      const body = await req.json();
      if (body.order_id && body.swap_amount !== undefined) {
        manualMode = true;
        manualOrderId = body.order_id;
        manualSwapAmount = body.swap_amount;
      }
    } catch {
      // No body = auto mode
    }

    if (manualMode && manualOrderId && manualSwapAmount !== null) {
      // Manual swap: admin adds/modifies swap on a specific order
      const { data: order, error: fetchErr } = await supabase
        .from("orders")
        .select("id, swap")
        .eq("id", manualOrderId)
        .eq("status", "open")
        .single();

      if (fetchErr || !order) {
        return new Response(JSON.stringify({ error: "Order not found or not open" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const newSwap = Number(order.swap || 0) + manualSwapAmount;
      const { error: updateErr } = await supabase
        .from("orders")
        .update({ swap: newSwap })
        .eq("id", manualOrderId);

      if (updateErr) {
        return new Response(JSON.stringify({ error: updateErr.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, order_id: manualOrderId, new_swap: newSwap }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auto mode: apply nightly swap to all open positions
    const { data: openOrders, error: ordersErr } = await supabase
      .from("orders")
      .select("id, symbol_name, lots, swap, created_at")
      .eq("status", "open");

    if (ordersErr) {
      return new Response(JSON.stringify({ error: ordersErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!openOrders || openOrders.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No open orders", updated: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Swap rate per lot per day (negative = cost)
    function getSwapRate(symbolName: string): number {
      const name = symbolName.toUpperCase();
      if (["XAUUSD", "XAGUSD", "XPTUSD", "XPDUSD"].includes(name)) return -1.2;
      if (["USOIL", "UKOIL", "NATGAS"].includes(name)) return -0.8;
      if (["BTCUSD", "ETHUSD", "BNBUSD", "SOLUSD", "XRPUSD", "DOGEUSD", "ADAUSD"].includes(name)) return -2.0;
      if (["US500", "US30", "USTEC", "DE40", "UK100", "JP225"].includes(name)) return -0.6;
      // Default forex
      return -0.5;
    }

    let updated = 0;
    let totalSwapApplied = 0;

    for (const order of openOrders) {
      const rate = getSwapRate(order.symbol_name);
      const dailySwap = rate * Number(order.lots);
      const newSwap = Number(order.swap || 0) + dailySwap;

      const { error } = await supabase
        .from("orders")
        .update({ swap: newSwap })
        .eq("id", order.id);

      if (!error) {
        updated++;
        totalSwapApplied += dailySwap;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      updated,
      total_orders: openOrders.length,
      total_swap_applied: totalSwapApplied,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
