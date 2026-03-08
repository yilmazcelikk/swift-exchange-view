import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const STOP_OUT_LEVEL = 30; // %30 teminat seviyesi

// Contract sizes - MUST match frontend src/lib/trading.ts
function getContractSize(symbolName: string): number {
  const name = symbolName.toUpperCase();

  // Precious metals
  if (name === "XAUUSD") return 100;
  if (name === "XAGUSD") return 5000;
  if (name === "XPTUSD") return 100;
  if (name === "XPDUSD") return 100;

  // Energy
  if (name === "USOIL" || name === "UKOIL") return 1000;
  if (name === "NATGAS") return 10000;

  // Agriculture
  if (["CORN", "WHEAT", "SOYBEAN"].includes(name)) return 50;
  if (name === "COTTON") return 50000;
  if (name === "SUGAR") return 112000;
  if (name === "COFFEE") return 37500;
  if (name === "COCOA") return 10;
  if (name === "COPPER") return 25000;

  // Crypto - 1 lot = 1 unit
  const cryptoPairs = [
    "BTCUSD","ETHUSD","BNBUSD","ADAUSD","DOGEUSD","SOLUSD",
    "DOTUSD","AVAXUSD","LINKUSD","LTCUSD","BCHUSD","XRPUSD",
    "MATICUSD","ATOMUSD","ALGOUSD","FTMUSD","MANAUSD","SANDUSD",
    "APEUSD","APTUSD","ARBUSD","OPUSD","INJUSD","NEAUSD",
    "FILUSD","ICPUSD","ETCUSD","TRXUSD","SHIBUSD","UNIUSD",
    "AABORUSD","JUPUSD","PEPE1000USD","TONUSD","SUIUSD","WIFUSD",
  ];
  if (cryptoPairs.includes(name)) return 1;

  // Indices
  if (["US500","US30","USTEC","DE40","UK100","JP225","FR40","AU200","HK50"].includes(name)) return 1;

  // BIST stocks - 1 lot = 1 share
  const bistStocks = [
    "THYAO","GARAN","AKBNK","EREGL","SISE","KCHOL","SAHOL","TUPRS","PETKM","BIMAS",
    "YKBNK","ISCTR","ASELS","PGSUS","EKGYO","TOASO","TAVHL","FROTO","TCELL","HALKB",
    "VAKBN","DOHOL","ENKAI","ARCLK","VESTL","MGROS","SOKM","GUBRF","SASA","OYAKC",
    "TTKOM","TSKB","AKSA","CIMSA","AEFES","ULKER","DOAS","OTKAR","ISGYO","KRDMD",
    "GESAN","KONTR","ODAS","BRYAT","TTRAK","EUPWR","AGHOL","MAVI","LOGO",
  ];
  if (bistStocks.includes(name)) return 1;

  // Forex pairs - standard 100,000 units (default)
  return 100000;
}

function calculatePnl(symbolName: string, type: string, lots: number, entryPrice: number, currentPrice: number): number {
  const contractSize = getContractSize(symbolName);
  const diff = type === "buy" ? currentPrice - entryPrice : entryPrice - currentPrice;
  return diff * lots * contractSize;
}

const COMMISSION_RATES: Record<string, number> = {
  standard: 0.00004,
  gold: 0.00002,
  diamond: 0.00001,
};

function calculateCommission(symbolName: string, lots: number, currentPrice: number, accountType: string = "standard"): number {
  const contractSize = getContractSize(symbolName);
  const notional = lots * contractSize * currentPrice;
  const rate = COMMISSION_RATES[accountType] ?? COMMISSION_RATES.standard;
  return notional * rate;
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

    // Get ALL open orders
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

    // Get current prices
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
        // Fetch profile for account_type
        const { data: userProfile } = await supabase.from("profiles").select("account_type").eq("user_id", order.user_id).single();
        const accountType = userProfile?.account_type || "standard";
        const pnl = calculatePnl(order.symbol_name, type, Number(order.lots), Number(order.entry_price), currentPrice);
        const commission = calculateCommission(order.symbol_name, Number(order.lots), currentPrice, accountType);
        const netPnl = pnl - commission;

        // Atomic: only close if still open (prevents double-close race condition)
        const { data: closedRows, error: closeErr } = await supabase
          .from("orders")
          .update({
            status: "closed",
            closed_at: new Date().toISOString(),
            current_price: currentPrice,
            pnl: netPnl,
            close_reason: closeReason,
          })
          .eq("id", order.id)
          .eq("status", "open")
          .select("id");

        if (closeErr) {
          console.error(`Failed to close order ${order.id}:`, closeErr.message);
          continue;
        }

        // If no rows returned, order was already closed (by frontend or another run)
        if (!closedRows || closedRows.length === 0) {
          console.log(`Order ${order.id} already closed, skipping balance update`);
          continue;
        }

        // Fetch FRESH balance from DB (not stale)
        const { data: profile } = await supabase
          .from("profiles")
          .select("balance, credit, account_type")
          .eq("user_id", order.user_id)
          .single();

        if (profile) {
          const newBalance = Number(profile.balance) + netPnl;
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
    const userOrdersMap = new Map<string, typeof allOpenOrders>();
    for (const order of allOpenOrders) {
      if (closedOrderIds.has(order.id)) continue;
      const list = userOrdersMap.get(order.user_id) || [];
      list.push(order);
      userOrdersMap.set(order.user_id, list);
    }

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
            const commission = calculateCommission(item.order.symbol_name, Number(item.order.lots), item.currentPrice);
            const netPnl = item.pnl - commission;

            // Atomic close - only if still open
            const { data: closedRows, error: closeErr } = await supabase
              .from("orders")
              .update({
                status: "closed",
                closed_at: new Date().toISOString(),
                current_price: item.currentPrice,
                pnl: netPnl,
                close_reason: "stop_out",
              })
              .eq("id", item.order.id)
              .eq("status", "open")
              .select("id");

            if (closeErr || !closedRows || closedRows.length === 0) {
              console.error(`Stop out close failed/skipped for ${item.order.id}`);
              remainingOrders = remainingOrders.filter(ro => ro.order.id !== item.order.id);
              continue;
            }

            currentBalance = currentBalance + netPnl;
            remainingOrders = remainingOrders.filter(ro => ro.order.id !== item.order.id);
            stopOutClosedCount++;
            console.log(`Stop out closed: ${item.order.symbol_name} ${item.order.type}, PnL: ${netPnl.toFixed(2)}`);

            // Check if margin level recovered
            let remPnl = 0;
            let remMargin = 0;
            for (const ro of remainingOrders) {
              remPnl += ro.pnl;
              remMargin += ro.margin;
            }

            const newEquity = currentBalance + Number(profile.credit) + remPnl;
            const newMarginLevel = remMargin > 0 ? (newEquity / remMargin) * 100 : Infinity;

            if (newMarginLevel >= STOP_OUT_LEVEL || remainingOrders.length === 0) {
              const newFreeMargin = newEquity - remMargin;
              await supabase
                .from("profiles")
                .update({ balance: currentBalance, equity: newEquity, free_margin: newFreeMargin })
                .eq("user_id", userId);
              break;
            }
          }

          // If all orders closed
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
