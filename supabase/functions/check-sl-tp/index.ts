import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const STOP_OUT_LEVEL = 30; // %30 teminat seviyesi

// Contract sizes for PnL calculation (must match frontend)
function getContractSize(symbolName: string): number {
  if (["XAUUSD"].includes(symbolName)) return 100;
  if (["XAGUSD"].includes(symbolName)) return 5000;
  if (["USOIL", "UKOIL"].includes(symbolName)) return 1000;
  if (["XPTUSD", "XPDUSD"].includes(symbolName)) return 100;
  const forexPairs = [
    "EURUSD","GBPUSD","USDJPY","USDCHF","AUDUSD","USDCAD","NZDUSD","USDTRY","EURTRY",
    "EURGBP","EURJPY","GBPJPY","EURAUD","EURNZD","EURCAD","EURCHF","GBPAUD","GBPNZD",
    "GBPCAD","GBPCHF","AUDCAD","AUDCHF","AUDJPY","AUDNZD","NZDJPY","NZDCAD","NZDCHF",
    "CADJPY","CADCHF","CHFJPY","USDZAR","USDMXN","USDSEK","USDNOK","USDHKD","USDPLN",
    "USDHUF","USDCNH","EURSEK","EURNOK","EURHUF","TRYJPY"
  ];
  if (forexPairs.includes(symbolName)) return 100000;
  if (symbolName.length === 6 && /^[A-Z]{6}$/.test(symbolName)) return 100000;
  return 1;
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

function calculateMargin(symbolName: string, lots: number, entryPrice: number, leverageRatio: number): number {
  const contractSize = getContractSize(symbolName);
  return (lots * contractSize * entryPrice) / leverageRatio;
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

    // Get ALL open orders (not just ones with SL/TP - we need them all for stop out)
    const { data: allOpenOrders, error: ordersErr } = await supabase
      .from("orders")
      .select("*")
      .eq("status", "open");

    if (ordersErr) throw ordersErr;
    if (!allOpenOrders || allOpenOrders.length === 0) {
      return new Response(
        JSON.stringify({ success: true, checked: 0, closed: 0, stopOutClosed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get current prices for all symbols involved
    const symbolIds = [...new Set(allOpenOrders.map(o => o.symbol_id))];
    const { data: symbols } = await supabase
      .from("symbols")
      .select("id, current_price")
      .in("id", symbolIds);

    const priceMap = new Map(symbols?.map(s => [s.id, Number(s.current_price)]) || []);

    let closedCount = 0;
    let stopOutClosedCount = 0;
    const closedOrderIds = new Set<string>();

    // ── PHASE 1: SL/TP Check ──
    for (const order of allOpenOrders) {
      const currentPrice = priceMap.get(order.symbol_id);
      if (!currentPrice || currentPrice === 0) continue;

      const sl = order.stop_loss ? Number(order.stop_loss) : null;
      const tp = order.take_profit ? Number(order.take_profit) : null;
      const type = order.type;

      let shouldClose = false;
      let closeReason = "";

      if (type === "buy") {
        if (sl && currentPrice <= sl) { shouldClose = true; closeReason = "stop_loss"; }
        if (tp && currentPrice >= tp) { shouldClose = true; closeReason = "take_profit"; }
      } else {
        if (sl && currentPrice >= sl) { shouldClose = true; closeReason = "stop_loss"; }
        if (tp && currentPrice <= tp) { shouldClose = true; closeReason = "take_profit"; }
      }

      if (shouldClose) {
        const pnl = calculatePnl(order.symbol_name, type, Number(order.lots), Number(order.entry_price), currentPrice);
        const commission = calculateCommission(order.symbol_name, Number(order.lots), currentPrice);
        const netPnl = pnl - commission;

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
          .select("balance, credit")
          .eq("user_id", order.user_id)
          .single();

        if (profile) {
          const newBalance = Number(profile.balance) + netPnl;
          // Recalculate equity considering remaining open orders
          const remainingOrders = allOpenOrders.filter(o => o.user_id === order.user_id && o.id !== order.id && !closedOrderIds.has(o.id));
          let remainingPnl = 0;
          for (const ro of remainingOrders) {
            const rp = priceMap.get(ro.symbol_id) || Number(ro.current_price);
            remainingPnl += calculatePnl(ro.symbol_name, ro.type, Number(ro.lots), Number(ro.entry_price), rp);
          }
          const newEquity = newBalance + Number(profile.credit) + remainingPnl;
          let remainingMargin = 0;
          for (const ro of remainingOrders) {
            remainingMargin += calculateMargin(ro.symbol_name, Number(ro.lots), Number(ro.entry_price), 200);
          }
          const newFreeMargin = newEquity - remainingMargin;

          await supabase
            .from("profiles")
            .update({ balance: newBalance, equity: newEquity, free_margin: newFreeMargin })
            .eq("user_id", order.user_id);
        }

        closedOrderIds.add(order.id);
        closedCount++;
        console.log(`Order ${order.id} closed by ${closeReason}: ${order.symbol_name} ${type} @ ${currentPrice}, PnL: ${netPnl.toFixed(2)}`);
      }
    }

    // ── PHASE 2: Stop Out Check (%30) ──
    // Group remaining open orders by user
    const userOrdersMap = new Map<string, typeof allOpenOrders>();
    for (const order of allOpenOrders) {
      if (closedOrderIds.has(order.id)) continue;
      const list = userOrdersMap.get(order.user_id) || [];
      list.push(order);
      userOrdersMap.set(order.user_id, list);
    }

    // Get profiles for users with open positions
    const userIds = [...userOrdersMap.keys()];
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, balance, credit")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      for (const [userId, orders] of userOrdersMap) {
        const profile = profileMap.get(userId);
        if (!profile) continue;

        // Calculate total PnL, used margin
        let totalPnl = 0;
        let totalMargin = 0;
        const orderPnls: { order: typeof orders[0]; pnl: number; margin: number; currentPrice: number }[] = [];

        for (const order of orders) {
          const cp = priceMap.get(order.symbol_id) || Number(order.current_price);
          const pnl = calculatePnl(order.symbol_name, order.type, Number(order.lots), Number(order.entry_price), cp);
          const margin = calculateMargin(order.symbol_name, Number(order.lots), Number(order.entry_price), 200);
          totalPnl += pnl;
          totalMargin += margin;
          orderPnls.push({ order, pnl, margin, currentPrice: cp });
        }

        const equity = Number(profile.balance) + Number(profile.credit) + totalPnl;
        const marginLevel = totalMargin > 0 ? (equity / totalMargin) * 100 : Infinity;

        if (marginLevel < STOP_OUT_LEVEL && totalMargin > 0) {
          console.log(`STOP OUT triggered for user ${userId}: margin level ${marginLevel.toFixed(2)}%`);

          // Sort by PnL ascending (most losing first)
          orderPnls.sort((a, b) => a.pnl - b.pnl);

          let currentBalance = Number(profile.balance);
          let remainingOrders = [...orderPnls];

          for (const item of orderPnls) {
            // Recalculate margin level with remaining orders
            let remPnl = 0;
            let remMargin = 0;
            for (const ro of remainingOrders) {
              if (ro.order.id === item.order.id) continue;
              remPnl += ro.pnl;
              remMargin += ro.margin;
            }

            const commission = calculateCommission(item.order.symbol_name, Number(item.order.lots), item.currentPrice);
            const netPnl = item.pnl - commission;

            // Close this order
            const { error: closeErr } = await supabase
              .from("orders")
              .update({
                status: "closed",
                closed_at: new Date().toISOString(),
                current_price: item.currentPrice,
                pnl: netPnl,
                close_reason: "stop_out",
              })
              .eq("id", item.order.id);

            if (closeErr) {
              console.error(`Stop out close failed for ${item.order.id}:`, closeErr.message);
              continue;
            }

            currentBalance += netPnl;
            remainingOrders = remainingOrders.filter(ro => ro.order.id !== item.order.id);
            stopOutClosedCount++;
            console.log(`Stop out closed: ${item.order.symbol_name} ${item.order.type}, PnL: ${netPnl.toFixed(2)}`);

            // Check if margin level is now above stop out
            const newEquity = currentBalance + Number(profile.credit) + remPnl;
            const newMarginLevel = remMargin > 0 ? (newEquity / remMargin) * 100 : Infinity;

            if (newMarginLevel >= STOP_OUT_LEVEL || remainingOrders.length === 0) {
              // Update profile with final values
              const newFreeMargin = newEquity - remMargin;
              await supabase
                .from("profiles")
                .update({ balance: currentBalance, equity: newEquity, free_margin: newFreeMargin })
                .eq("user_id", userId);
              break;
            }
          }

          // If all orders closed, update profile
          if (remainingOrders.length === 0) {
            const finalEquity = currentBalance + Number(profile.credit);
            await supabase
              .from("profiles")
              .update({ balance: currentBalance, equity: finalEquity, free_margin: finalEquity })
              .eq("user_id", userId);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, checked: allOpenOrders.length, closed: closedCount, stopOutClosed: stopOutClosedCount }),
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
