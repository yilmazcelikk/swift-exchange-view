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
  
  // Agriculture (IC Markets CFD standard sizes)
  if (["CORN", "WHEAT", "SOYBEAN"].includes(name)) return 4;
  if (name === "COTTON") return 100;
  if (name === "SUGAR") return 100;
  if (name === "COFFEE") return 10;
  if (name === "COCOA") return 1;
  if (name === "COPPER") return 100;
  if (name === "LUMBER") return 1;
  if (name === "OATS") return 4;
  if (name === "ORANGE") return 20;
  if (name === "RICE") return 4;
  if (name === "RUBBER") return 1;
  
  // Forex pairs: ONLY these get 100,000 contract size
  const FOREX_PAIRS = new Set([
    "EURUSD","GBPUSD","USDJPY","USDCHF","AUDUSD","NZDUSD","USDCAD",
    "EURGBP","EURJPY","GBPJPY","AUDCAD","AUDCHF","AUDJPY","AUDNZD",
    "CADCHF","CADJPY","CHFJPY","EURAUD","EURCAD","EURCHF","EURHUF",
    "EURNOK","EURNZD","EURSEK","EURTRY","GBPAUD","GBPCAD","GBPCHF",
    "GBPNZD","NZDCAD","NZDCHF","NZDJPY","TRYJPY","USDCLP","USDCNH",
    "USDCOP","USDHKD","USDHUF","USDINR","USDKRW","USDMXN","USDNOK",
    "USDPLN","USDSEK","USDTRY","USDTWD","USDZAR","ZARJPY",
  ]);
  if (FOREX_PAIRS.has(name)) return 100000;
  
  // Everything else: crypto, indices, stocks → 1
  return 1;
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

// Spread calculation (must match frontend)
const SPREAD_MULTIPLIERS: Record<string, number> = {
  standard: 1.0,
  gold: 0.7,
  diamond: 0.4,
};

function getBaseSpread(symbolName: string, price: number): number {
  const name = symbolName.toUpperCase();
  if (['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'NZDUSD', 'USDCAD'].includes(name)) return price * 0.00008;
  if (name.length === 6 && !name.endsWith('USD')) return price * 0.00015;
  if (name === 'XAUUSD') return 0.30;
  if (name === 'XAGUSD') return 0.02;
  if (name === 'USOIL' || name === 'UKOIL') return 0.03;
  if (name === 'NATGAS') return 0.005;
  if (['US500', 'US30', 'US100', 'USTEC'].includes(name)) return price * 0.00015;
  if (['DE40', 'UK100', 'JP225', 'FR40'].includes(name)) return price * 0.0002;
  if (name === 'BTCUSD') return price * 0.0003;
  if (['ETHUSD', 'BNBUSD', 'SOLUSD'].includes(name)) return price * 0.0004;
  if (name.endsWith('USD')) return price * 0.0006;
  if (price > 100) return price * 0.001;
  if (price > 10) return price * 0.002;
  return price * 0.003;
}

function getSpread(symbolName: string, price: number, accountType: string = 'standard'): number {
  const base = getBaseSpread(symbolName, price);
  const multiplier = SPREAD_MULTIPLIERS[accountType] ?? SPREAD_MULTIPLIERS.standard;
  return base * multiplier;
}

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

// Net margin calculation with hedge netting
function calculateNetMarginForOrders(orders: { symbol_name: string; lots: number; entry_price: number; leverage: string; type: string }[]): number {
  const symbolGroups: Record<string, { buyLots: number; sellLots: number; avgBuyPrice: number; avgSellPrice: number; leverage: number }> = {};

  for (const o of orders) {
    const sym = o.symbol_name;
    if (!symbolGroups[sym]) {
      symbolGroups[sym] = { buyLots: 0, sellLots: 0, avgBuyPrice: 0, avgSellPrice: 0, leverage: 200 };
    }
    const lev = parseInt((o.leverage || "1:200").split(":")[1] || "200", 10);
    symbolGroups[sym].leverage = lev;

    if (o.type === "buy") {
      const prevTotal = symbolGroups[sym].avgBuyPrice * symbolGroups[sym].buyLots;
      symbolGroups[sym].buyLots += Number(o.lots);
      symbolGroups[sym].avgBuyPrice = symbolGroups[sym].buyLots > 0
        ? (prevTotal + Number(o.entry_price) * Number(o.lots)) / symbolGroups[sym].buyLots
        : 0;
    } else {
      const prevTotal = symbolGroups[sym].avgSellPrice * symbolGroups[sym].sellLots;
      symbolGroups[sym].sellLots += Number(o.lots);
      symbolGroups[sym].avgSellPrice = symbolGroups[sym].sellLots > 0
        ? (prevTotal + Number(o.entry_price) * Number(o.lots)) / symbolGroups[sym].sellLots
        : 0;
    }
  }

  let totalMargin = 0;
  for (const [sym, group] of Object.entries(symbolGroups)) {
    const netLots = Math.abs(group.buyLots - group.sellLots);
    const netPrice = group.buyLots >= group.sellLots ? group.avgBuyPrice : group.avgSellPrice;
    if (netLots > 0 && netPrice > 0) {
      totalMargin += calculateMargin(sym, netLots, netPrice, group.leverage);
    }
  }

  return totalMargin;
}

function calculateSwap(symbolName: string, lots: number, daysHeld: number): number {
  const name = symbolName.toUpperCase();
  let rate = -0.5;
  if (["XAUUSD", "XAGUSD", "XPTUSD", "XPDUSD"].includes(name)) rate = -1.2;
  else if (["USOIL", "UKOIL", "NATGAS"].includes(name)) rate = -0.8;
  else if (["BTCUSD", "ETHUSD", "BNBUSD", "SOLUSD", "XRPUSD", "DOGEUSD", "ADAUSD"].includes(name)) rate = -2.0;
  else if (["US500", "US30", "US100", "USTEC", "DE40", "UK100", "JP225"].includes(name)) rate = -0.6;
  return rate * lots * daysHeld;
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

    // Get current prices
    const { data: symbols } = await supabase
      .from("symbols")
      .select("id, current_price, name");
    const priceMap = new Map(symbols?.map(s => [s.id, Number(s.current_price)]) || []);
    const nameMap = new Map(symbols?.map(s => [s.id, s.name]) || []);

    let closedCount = 0;
    let stopOutClosedCount = 0;
    let pendingTriggered = 0;
    const closedOrderIds = new Set<string>();

    // ── PHASE 0: Pending Orders Check ──
    const { data: pendingOrders } = await supabase
      .from("orders")
      .select("*")
      .eq("status", "pending");

    if (pendingOrders && pendingOrders.length > 0) {
      for (const order of pendingOrders) {
        const currentPrice = priceMap.get(order.symbol_id);
        if (!currentPrice || currentPrice === 0) continue;

        const targetPrice = order.target_price ? Number(order.target_price) : null;
        if (!targetPrice) continue;

        const orderType = order.order_type;
        let shouldTrigger = false;

        // Buy Limit: triggers when price drops to or below target
        if (orderType === "buy_limit" && currentPrice <= targetPrice) shouldTrigger = true;
        // Sell Limit: triggers when price rises to or above target
        if (orderType === "sell_limit" && currentPrice >= targetPrice) shouldTrigger = true;
        // Buy Stop: triggers when price rises to or above target
        if (orderType === "buy_stop" && currentPrice >= targetPrice) shouldTrigger = true;
        // Sell Stop: triggers when price drops to or below target
        if (orderType === "sell_stop" && currentPrice <= targetPrice) shouldTrigger = true;

        if (shouldTrigger) {
          // Get user's account type for spread calculation
          const { data: userProfile } = await supabase.from("profiles").select("account_type, balance").eq("user_id", order.user_id).single();
          const accountType = userProfile?.account_type || "standard";
          
          // Check balance
          if (!userProfile || Number(userProfile.balance) <= 0) {
            console.log(`Pending order ${order.id} skipped: insufficient balance`);
            continue;
          }

          // Calculate spread-adjusted entry price
          const spread = getSpread(order.symbol_name, currentPrice, accountType);
          const entryPrice = order.type === "buy"
            ? currentPrice + spread / 2
            : currentPrice - spread / 2;

          // Activate the pending order -> open
          const { data: activatedRows, error: actErr } = await supabase
            .from("orders")
            .update({
              status: "open",
              entry_price: entryPrice,
              current_price: currentPrice,
            })
            .eq("id", order.id)
            .eq("status", "pending")
            .select("id");

          if (actErr || !activatedRows || activatedRows.length === 0) {
            console.error(`Failed to activate pending order ${order.id}`);
            continue;
          }

          pendingTriggered++;
          console.log(`Pending order ${order.id} triggered: ${order.order_type} ${order.symbol_name} @ ${entryPrice}`);
        }
      }
    }

    // ── PHASE 1: SL/TP Check ──
    const { data: allOpenOrders, error: ordersErr } = await supabase
      .from("orders")
      .select("*")
      .eq("status", "open");

    if (ordersErr) throw ordersErr;
    if (!allOpenOrders || allOpenOrders.length === 0) {
      return new Response(
        JSON.stringify({ success: true, checked: 0, closed: 0, stopOutClosed: 0, pendingTriggered }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
        const { data: userProfile } = await supabase.from("profiles").select("account_type").eq("user_id", order.user_id).single();
        const accountType = userProfile?.account_type || "standard";
        const pnl = calculatePnl(order.symbol_name, type, Number(order.lots), Number(order.entry_price), currentPrice);
        const commission = calculateCommission(order.symbol_name, Number(order.lots), currentPrice, accountType);
        const daysHeld = Math.max(1, Math.floor((Date.now() - new Date(order.created_at).getTime()) / 86400000));
        const swap = calculateSwap(order.symbol_name, Number(order.lots), daysHeld);
        const netPnl = pnl - commission + swap;

        const { data: closedRows, error: closeErr } = await supabase
          .from("orders")
          .update({
            status: "closed",
            closed_at: new Date().toISOString(),
            current_price: currentPrice,
            pnl: netPnl,
            swap: swap,
            close_reason: closeReason,
          })
          .eq("id", order.id)
          .eq("status", "open")
          .select("id");

        if (closeErr) { console.error(`Failed to close order ${order.id}:`, closeErr.message); continue; }
        if (!closedRows || closedRows.length === 0) { console.log(`Order ${order.id} already closed, skipping`); continue; }

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
          const remainingMargin = calculateNetMarginForOrders(remainingOrders.map(ro => ({
            symbol_name: ro.symbol_name,
            lots: Number(ro.lots),
            entry_price: Number(ro.entry_price),
            leverage: ro.leverage || "1:200",
            type: ro.type,
          })));
          const newFreeMargin = newEquity - remainingMargin;
          await supabase.from("profiles").update({ balance: newBalance, equity: newEquity, free_margin: newFreeMargin }).eq("user_id", order.user_id);
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
        .select("user_id, balance, credit, account_type, margin_call_notified")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      for (const [userId, orders] of userOrdersMap) {
        const profile = profileMap.get(userId);
        if (!profile) continue;

        let totalPnl = 0;
        const orderPnls: { order: typeof orders[0]; pnl: number; margin: number; currentPrice: number }[] = [];

        for (const order of orders) {
          const cp = priceMap.get(order.symbol_id) || Number(order.current_price);
          const pnl = calculatePnl(order.symbol_name, order.type, Number(order.lots), Number(order.entry_price), cp);
          const oLev = parseInt((order.leverage || "1:200").split(":")[1] || "200", 10);
          const margin = calculateMargin(order.symbol_name, Number(order.lots), Number(order.entry_price), oLev);
          totalPnl += pnl;
          orderPnls.push({ order, pnl, margin, currentPrice: cp });
        }

        // Use net margin with hedge netting
        const totalMargin = calculateNetMarginForOrders(orders.map(o => ({
          symbol_name: o.symbol_name,
          lots: Number(o.lots),
          entry_price: Number(o.entry_price),
          leverage: o.leverage || "1:200",
          type: o.type,
        })));

        const equity = Number(profile.balance) + Number(profile.credit) + totalPnl;
        const marginLevel = totalMargin > 0 ? (equity / totalMargin) * 100 : Infinity;

        // Margin Call notification (<=100%)
        if (marginLevel <= 100 && totalMargin > 0 && !profile.margin_call_notified) {
          try {
            const { data: userProfile } = await supabase.from("profiles").select("full_name, meta_id").eq("user_id", userId).single();
            await supabase.functions.invoke("telegram-notify", {
              body: {
                event_type: "margin_call",
                data: {
                  user_name: userProfile?.full_name || "Bilinmeyen",
                  meta_id: userProfile?.meta_id || "-",
                  margin_level: marginLevel,
                  equity: equity,
                  balance: Number(profile.balance),
                },
              },
            });
            await supabase.from("profiles").update({ margin_call_notified: true }).eq("user_id", userId);
            console.log(`Margin call notification sent for user ${userId}: ${marginLevel.toFixed(2)}%`);
          } catch (e) {
            console.error(`Failed to send margin call notification for ${userId}:`, e);
          }
        }

        // Reset notification flag when margin recovers above 100%
        if (marginLevel > 100 && profile.margin_call_notified) {
          await supabase.from("profiles").update({ margin_call_notified: false }).eq("user_id", userId);
        }

        if (marginLevel <= STOP_OUT_LEVEL && totalMargin > 0) {
          console.log(`STOP OUT triggered for user ${userId}: margin level ${marginLevel.toFixed(2)}% (threshold: ${STOP_OUT_LEVEL}%)`);
          orderPnls.sort((a, b) => a.pnl - b.pnl); // En zararlı önce
          let currentBalance = Number(profile.balance);
          let remainingOrders = [...orderPnls];

          for (const item of orderPnls) {
            const commission = calculateCommission(item.order.symbol_name, Number(item.order.lots), item.currentPrice, profile.account_type || "standard");
            const daysHeld = Math.max(1, Math.floor((Date.now() - new Date(item.order.created_at).getTime()) / 86400000));
            const swap = calculateSwap(item.order.symbol_name, Number(item.order.lots), daysHeld);
            const netPnl = item.pnl - commission + swap;

            const { data: closedRows, error: closeErr } = await supabase
              .from("orders")
              .update({
                status: "closed",
                closed_at: new Date().toISOString(),
                current_price: item.currentPrice,
                pnl: netPnl,
                swap: swap,
                close_reason: "stop_out",
              })
              .eq("id", item.order.id)
              .eq("status", "open")
              .select("id");

            if (closeErr || !closedRows || closedRows.length === 0) {
              if (closeErr) {
                console.error(`Stop-out close failed for order ${item.order.id}:`, closeErr.message);
              } else {
                console.error(`Stop-out close skipped for order ${item.order.id}: not open or already updated`);
              }
              remainingOrders = remainingOrders.filter(ro => ro.order.id !== item.order.id);
              continue;
            }

            currentBalance = currentBalance + netPnl;
            remainingOrders = remainingOrders.filter(ro => ro.order.id !== item.order.id);
            stopOutClosedCount++;

            let remPnl = 0;
            for (const ro of remainingOrders) {
              remPnl += ro.pnl;
            }
            const remMargin = calculateNetMarginForOrders(remainingOrders.map(ro => ({
              symbol_name: ro.order.symbol_name,
              lots: Number(ro.order.lots),
              entry_price: Number(ro.order.entry_price),
              leverage: ro.order.leverage || "1:200",
              type: ro.order.type,
            })));

            const newEquity = currentBalance + Number(profile.credit) + remPnl;
            const newMarginLevel = remMargin > 0 ? (newEquity / remMargin) * 100 : Infinity;

            if (newMarginLevel >= STOP_OUT_LEVEL || remainingOrders.length === 0) {
              const newFreeMargin = newEquity - remMargin;
              await supabase.from("profiles").update({ balance: currentBalance, equity: newEquity, free_margin: newFreeMargin }).eq("user_id", userId);
              break;
            }
          }

          if (remainingOrders.length === 0) {
            const finalEquity = currentBalance + Number(profile.credit);
            await supabase.from("profiles").update({ balance: currentBalance, equity: finalEquity, free_margin: finalEquity }).eq("user_id", userId);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, checked: allOpenOrders.length, closed: closedCount, stopOutClosed: stopOutClosedCount, pendingTriggered }),
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
