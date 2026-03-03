import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Contract sizes for PnL calculation (must match frontend)
function getContractSize(symbolName: string): number {
  if (["XAUUSD"].includes(symbolName)) return 100;
  if (["XAGUSD"].includes(symbolName)) return 5000;
  if (["USOIL", "UKOIL"].includes(symbolName)) return 1000;
  if (["XPTUSD", "XPDUSD"].includes(symbolName)) return 100;
  if (symbolName.length === 6 && /^[A-Z]{6}$/.test(symbolName) &&
    !symbolName.endsWith("USD") || ["EURUSD","GBPUSD","USDJPY","USDCHF","AUDUSD","USDCAD","NZDUSD","USDTRY","EURTRY"].includes(symbolName)) {
    // Forex
    if (symbolName.endsWith("USD") || symbolName.startsWith("USD") || 
        ["EURGBP","EURJPY","GBPJPY","EURAUD","EURNZD","EURCAD","EURCHF"].includes(symbolName)) return 100000;
  }
  // Check if forex by common pairs
  const forexPairs = [
    "EURUSD","GBPUSD","USDJPY","USDCHF","AUDUSD","USDCAD","NZDUSD","USDTRY","EURTRY",
    "EURGBP","EURJPY","GBPJPY","EURAUD","EURNZD","EURCAD","EURCHF","GBPAUD","GBPNZD",
    "GBPCAD","GBPCHF","AUDCAD","AUDCHF","AUDJPY","AUDNZD","NZDJPY","NZDCAD","NZDCHF",
    "CADJPY","CADCHF","CHFJPY","USDZAR","USDMXN","USDSEK","USDNOK","USDHKD","USDPLN",
    "USDHUF","USDCNH","EURSEK","EURNOK","EURHUF","TRYJPY"
  ];
  if (forexPairs.includes(symbolName)) return 100000;
  return 1; // crypto, indices, stocks
}

function calculatePnl(symbolName: string, type: string, lots: number, entryPrice: number, currentPrice: number): number {
  const contractSize = getContractSize(symbolName);
  const diff = type === "buy" ? currentPrice - entryPrice : entryPrice - currentPrice;
  return diff * lots * contractSize;
}

function calculateCommission(symbolName: string, lots: number, currentPrice: number): number {
  const contractSize = getContractSize(symbolName);
  const notional = lots * contractSize * currentPrice;
  return notional * 0.00002;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) throw new Error("Missing env vars");

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get all open orders with SL or TP set
    const { data: orders, error: ordersErr } = await supabase
      .from("orders")
      .select("*")
      .eq("status", "open")
      .or("stop_loss.not.is.null,take_profit.not.is.null");

    if (ordersErr) throw ordersErr;
    if (!orders || orders.length === 0) {
      return new Response(
        JSON.stringify({ success: true, checked: 0, closed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get current prices for all symbols involved
    const symbolIds = [...new Set(orders.map(o => o.symbol_id))];
    const { data: symbols } = await supabase
      .from("symbols")
      .select("id, current_price")
      .in("id", symbolIds);

    const priceMap = new Map(symbols?.map(s => [s.id, Number(s.current_price)]) || []);

    let closedCount = 0;

    for (const order of orders) {
      const currentPrice = priceMap.get(order.symbol_id);
      if (!currentPrice || currentPrice === 0) continue;

      const sl = order.stop_loss ? Number(order.stop_loss) : null;
      const tp = order.take_profit ? Number(order.take_profit) : null;
      const type = order.type; // "buy" or "sell"

      let shouldClose = false;
      let closeReason = "";

      if (type === "buy") {
        // Buy: SL triggers when price drops to/below SL, TP triggers when price rises to/above TP
        if (sl && currentPrice <= sl) { shouldClose = true; closeReason = "stop_loss"; }
        if (tp && currentPrice >= tp) { shouldClose = true; closeReason = "take_profit"; }
      } else {
        // Sell: SL triggers when price rises to/above SL, TP triggers when price drops to/below TP
        if (sl && currentPrice >= sl) { shouldClose = true; closeReason = "stop_loss"; }
        if (tp && currentPrice <= tp) { shouldClose = true; closeReason = "take_profit"; }
      }

      if (shouldClose) {
        const pnl = calculatePnl(order.symbol_name, type, Number(order.lots), Number(order.entry_price), currentPrice);
        const commission = calculateCommission(order.symbol_name, Number(order.lots), currentPrice);
        const netPnl = pnl - commission;

        // Close the order
        const { error: closeErr } = await supabase
          .from("orders")
          .update({
            status: "closed",
            closed_at: new Date().toISOString(),
            current_price: currentPrice,
            pnl: netPnl,
            close_reason: closeReason,
          })
          .eq("id", order.id);

        if (closeErr) {
          console.error(`Failed to close order ${order.id}:`, closeErr.message);
          continue;
        }

        // Update user balance
        const { data: profile } = await supabase
          .from("profiles")
          .select("balance")
          .eq("user_id", order.user_id)
          .single();

        if (profile) {
          const newBalance = Number(profile.balance) + netPnl;
          await supabase
            .from("profiles")
            .update({
              balance: newBalance,
              equity: newBalance,
              free_margin: newBalance,
            })
            .eq("user_id", order.user_id);
        }

        closedCount++;
        console.log(`Order ${order.id} closed by ${closeReason}: ${order.symbol_name} ${type} @ ${currentPrice}, PnL: ${netPnl.toFixed(2)}`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, checked: orders.length, closed: closedCount }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
