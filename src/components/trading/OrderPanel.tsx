import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Minus, Plus, ChevronDown } from "lucide-react";
import { getSpread as calcSpread, calculateMargin, calculateNetMargin, getContractSize, calculatePnl } from "@/lib/trading";
import { getMarketStatus } from "@/lib/marketHours";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useUsdTryRate } from "@/hooks/useUsdTryRate";
import { useNavigate } from "react-router-dom";

interface DBSymbol {
  id: string;
  name: string;
  display_name: string;
  category: string;
  exchange?: string | null;
  current_price: number;
}

interface OrderPanelProps {
  symbol: DBSymbol;
  userId: string;
  leverage: string;
  accountType: string;
  formatPrice: (price: number) => string;
}

export function OrderPanel({ symbol, userId, leverage, accountType, formatPrice }: OrderPanelProps) {
  const navigate = useNavigate();
  const usdTryRate = useUsdTryRate();
  const [lots, setLots] = useState(0.1);
  const [orderType, setOrderType] = useState<"market" | "buy_limit" | "sell_limit" | "buy_stop" | "sell_stop">("market");
  const [targetPrice, setTargetPrice] = useState("");
  const [orderTypeOpen, setOrderTypeOpen] = useState(false);
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [orderLoading, setOrderLoading] = useState(false);

  const quickLots = [0.01, 0.05, 0.1, 0.5, 1.0, 5.0];
  const price = symbol.current_price || 0;
  const spread = calcSpread(symbol.name, price, accountType);
  const bid = price - spread / 2;
  const ask = price + spread / 2;
  const currentMarketStatus = getMarketStatus(symbol.name, symbol.category, symbol.exchange);

  // Parse leverage ratio
  const leverageRatio = parseInt(leverage.split(":")[1] || "200", 10);

  const handleOrder = async (type: "buy" | "sell") => {
    if (!symbol || !userId) return;

    const isPending = orderType !== "market";
    const pendingTargetPrice = isPending ? parseFloat(targetPrice) : null;

    if (isPending) {
      if (!pendingTargetPrice || isNaN(pendingTargetPrice) || pendingTargetPrice <= 0) {
        toast.error("Bekleyen emir için geçerli bir hedef fiyat girin.");
        return;
      }
      const midPrice = price;
      if (orderType === "buy_limit" && pendingTargetPrice >= midPrice) { toast.error("Buy Limit fiyatı güncel fiyatın altında olmalıdır."); return; }
      if (orderType === "sell_limit" && pendingTargetPrice <= midPrice) { toast.error("Sell Limit fiyatı güncel fiyatın üzerinde olmalıdır."); return; }
      if (orderType === "buy_stop" && pendingTargetPrice <= midPrice) { toast.error("Buy Stop fiyatı güncel fiyatın üzerinde olmalıdır."); return; }
      if (orderType === "sell_stop" && pendingTargetPrice >= midPrice) { toast.error("Sell Stop fiyatı güncel fiyatın altında olmalıdır."); return; }
    }

    const status = getMarketStatus(symbol.name, symbol.category, symbol.exchange);
    // BIST stocks allow pending orders even when market is closed
    const isBIST = symbol.exchange === "BIST";
    if (!status.isOpen && !(isPending && isBIST)) {
      toast.error("Piyasa kapalı. Bu enstrümanda şu an işlem açılamaz.", { description: status.scheduleLabel });
      return;
    }

    // Check free margin including open positions PnL
    const { data: profileData } = await supabase
      .from("profiles")
      .select("balance, equity, free_margin, credit")
      .eq("user_id", userId)
      .single();

    if (!profileData || Number(profileData.balance) <= 0) {
      toast.error("Yetersiz bakiye. İşlem açmak için hesabınıza para yatırın.");
      return;
    }

    // Also get all open orders to calculate real-time used margin and unrealized PnL
    const { data: openOrders } = await supabase
      .from("orders")
      .select("symbol_name, lots, entry_price, leverage, type, symbol_id")
      .eq("user_id", userId)
      .eq("status", "open");

    // Get live prices for open positions
    const openSymbolIds = [...new Set((openOrders || []).map((o: any) => o.symbol_id))];
    let livePriceMap: Record<string, number> = {};
    let exchangeMap: Record<string, string | null> = {};
    if (openSymbolIds.length > 0) {
      const { data: symData } = await supabase.from("symbols").select("id, current_price, exchange").in("id", openSymbolIds);
      if (symData) symData.forEach((s: any) => { livePriceMap[s.id] = Number(s.current_price); exchangeMap[s.id] = s.exchange; });
    }

    // Calculate unrealized PnL with currency conversion for BIST stocks
    let unrealizedPnl = 0;
    for (const o of (openOrders || []) as any[]) {
      const liveP = livePriceMap[o.symbol_id] || Number(o.entry_price);
      const divisor = exchangeMap[o.symbol_id] === 'BIST' ? usdTryRate : 1;
      unrealizedPnl += calculatePnl(o.symbol_name, o.type, Number(o.lots), Number(o.entry_price), liveP, divisor);
    }

    // Calculate net margin with hedge netting
    const existingOrders = (openOrders || []).map((o: any) => ({
      symbol_name: o.symbol_name,
      lots: Number(o.lots),
      entry_price: Number(o.entry_price),
      leverage: o.leverage || "1:200",
      type: o.type,
    }));

    const currentNetMargin = calculateNetMargin(existingOrders);

    // Add the new order to the list and calculate new net margin
    const midPrice = price;
    const entryPriceForMargin = isPending ? (pendingTargetPrice || midPrice) : (type === "buy" ? ask : bid);
    const newOrder = {
      symbol_name: symbol.name,
      lots,
      entry_price: entryPriceForMargin,
      leverage,
      type,
    };
    const newNetMargin = calculateNetMargin([...existingOrders, newOrder]);

    // The additional margin required is the difference
    const additionalMarginNeeded = newNetMargin - currentNetMargin;
    const realEquity = Number(profileData.balance) + Number(profileData.credit) + unrealizedPnl;
    const realFreeMargin = realEquity - currentNetMargin;

    if (additionalMarginNeeded > realFreeMargin) {
      toast.error("Yetersiz bakiye. Lütfen hesabınıza para yatırın.");
      return;
    }

    setOrderLoading(true);
    try {
      const slValue = stopLoss ? parseFloat(stopLoss) : null;
      const tpValue = takeProfit ? parseFloat(takeProfit) : null;

      let entryPrice: number;
      if (isPending) {
        entryPrice = 0;
      } else {
        entryPrice = type === "buy" ? ask : bid;
      }

      const refPrice = isPending ? pendingTargetPrice! : entryPrice;
      if (type === "buy") {
        if (slValue !== null && slValue >= refPrice) { toast.error("Alış emrinde Zarar Durdur, fiyatın altında olmalıdır."); setOrderLoading(false); return; }
        if (tpValue !== null && tpValue <= refPrice) { toast.error("Alış emrinde Kâr Al, fiyatın üzerinde olmalıdır."); setOrderLoading(false); return; }
      } else {
        if (slValue !== null && slValue <= refPrice) { toast.error("Satış emrinde Zarar Durdur, fiyatın üzerinde olmalıdır."); setOrderLoading(false); return; }
        if (tpValue !== null && tpValue >= refPrice) { toast.error("Satış emrinde Kâr Al, fiyatın altında olmalıdır."); setOrderLoading(false); return; }
      }

      const insertData: any = {
        user_id: userId,
        symbol_id: symbol.id,
        symbol_name: symbol.name,
        type,
        order_type: orderType,
        lots,
        leverage,
        entry_price: entryPrice,
        current_price: midPrice,
        stop_loss: slValue,
        take_profit: tpValue,
        status: isPending ? "pending" : "open",
        target_price: pendingTargetPrice,
      };

      const { error } = await supabase.from("orders").insert(insertData);
      if (error) throw error;

      const orderTypeLabels: Record<string, string> = {
        market: type === "buy" ? "ALIŞ" : "SATIŞ",
        buy_limit: "BUY LIMIT", sell_limit: "SELL LIMIT",
        buy_stop: "BUY STOP", sell_stop: "SELL STOP",
      };

      toast.success(`${symbol.name} ${orderTypeLabels[orderType]} emri verildi`, {
        description: isPending ? `${lots} lot @ ${formatPrice(pendingTargetPrice!)}` : `${lots} lot`,
      });
      setStopLoss("");
      setTakeProfit("");
      setTargetPrice("");
      setOrderType("market");
      navigate("/dashboard");
    } catch (err: any) {
      toast.error("Emir başarısız: " + err.message);
    }
    setOrderLoading(false);
  };

  return (
    <div className="border-t border-border bg-card p-3 space-y-3 overflow-y-auto shrink-0" style={{ overscrollBehavior: 'contain' }}>
      {!currentMarketStatus.isOpen && (
        <div className="text-center py-1.5 px-3 rounded-lg bg-muted text-muted-foreground text-xs font-medium">
          Piyasa kapalı
        </div>
      )}

      {/* Order Type Dropdown */}
      <div className="relative">
        <button
          onClick={() => setOrderTypeOpen(!orderTypeOpen)}
          className="w-full flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2 text-xs font-semibold transition-colors hover:bg-muted/70 active:bg-muted"
        >
          <span className={orderType === "market" ? "text-foreground" : orderType.startsWith("buy") ? "text-buy" : "text-sell"}>
            {orderType === "market" ? "Piyasa" : orderType === "buy_limit" ? "Buy Limit" : orderType === "sell_limit" ? "Sell Limit" : orderType === "buy_stop" ? "Buy Stop" : "Sell Stop"}
          </span>
          <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${orderTypeOpen ? "rotate-180" : ""}`} />
        </button>
        {orderTypeOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOrderTypeOpen(false)} />
            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
              {([
                { key: "market" as const, label: "Piyasa", desc: "Anlık piyasa fiyatından" },
                { key: "buy_limit" as const, label: "Buy Limit", desc: "Fiyat düşünce al" },
                { key: "sell_limit" as const, label: "Sell Limit", desc: "Fiyat yükselince sat" },
                { key: "buy_stop" as const, label: "Buy Stop", desc: "Fiyat yükselince al" },
                { key: "sell_stop" as const, label: "Sell Stop", desc: "Fiyat düşünce sat" },
              ]).map((ot) => (
                <button
                  key={ot.key}
                  onClick={() => { setOrderType(ot.key); setOrderTypeOpen(false); }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors active:bg-muted/80 ${orderType === ot.key ? "bg-muted/60" : "hover:bg-muted/30"}`}
                >
                  <div>
                    <span className={`text-xs font-semibold ${ot.key === "market" ? "text-foreground" : ot.key.startsWith("buy") ? "text-buy" : "text-sell"}`}>{ot.label}</span>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{ot.desc}</p>
                  </div>
                  {orderType === ot.key && <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Target Price for pending orders */}
      {orderType !== "market" && (
        <div className="relative">
          <label className="text-[10px] text-muted-foreground mb-0.5 block">Hedef Fiyat</label>
          <Input type="number" step="any" placeholder="Tetikleme fiyatı girin" value={targetPrice} onChange={(e) => setTargetPrice(e.target.value)} className="bg-muted/50 h-9 text-xs font-mono pr-16" />
          <span className="absolute right-3 top-[22px] text-[10px] text-muted-foreground font-mono">Şuan: {formatPrice(price)}</span>
        </div>
      )}

      {/* Lots */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={() => setLots(Math.max(0.01, parseFloat((lots - 0.01).toFixed(2))))}>
          <Minus className="h-3 w-3" />
        </Button>
        <Input type="number" value={lots} onChange={(e) => setLots(parseFloat(e.target.value) || 0)} className="text-center font-mono bg-muted/50 h-8 text-sm" step={0.01} />
        <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={() => setLots(parseFloat((lots + 0.01).toFixed(2)))}>
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
        {quickLots.map((l) => (
          <button key={l} onClick={() => setLots(l)} className={`px-2.5 py-1 rounded text-xs font-mono font-medium whitespace-nowrap transition-colors ${lots === l ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
            {l}
          </button>
        ))}
      </div>

      {/* SL / TP */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-muted-foreground mb-0.5 block">Zarar Durdur (SL)</label>
          <Input type="number" placeholder="Opsiyonel" value={stopLoss} onChange={(e) => setStopLoss(e.target.value)} className="bg-muted/50 h-8 text-xs font-mono" />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground mb-0.5 block">Kâr Al (TP)</label>
          <Input type="number" placeholder="Opsiyonel" value={takeProfit} onChange={(e) => setTakeProfit(e.target.value)} className="bg-muted/50 h-8 text-xs font-mono" />
        </div>
      </div>

      {/* Action Buttons */}
      {orderType === "market" ? (
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={() => handleOrder("sell")} disabled={orderLoading || !currentMarketStatus.isOpen} className="h-14 bg-sell hover:bg-sell/90 text-sell-foreground font-bold disabled:opacity-50 flex flex-col items-center gap-0.5">

            <span className="text-xs opacity-80">SAT</span>
            <span className="text-sm font-mono">{formatPrice(bid)}</span>
          </Button>
          <Button onClick={() => handleOrder("buy")} disabled={orderLoading || !currentMarketStatus.isOpen} className="h-14 bg-buy hover:bg-buy/90 text-buy-foreground font-bold disabled:opacity-50 flex flex-col items-center gap-0.5">
            <span className="text-xs opacity-80">AL</span>
            <span className="text-sm font-mono">{formatPrice(ask)}</span>
          </Button>
        </div>
      ) : (
        <Button
          onClick={() => handleOrder(orderType.startsWith("buy") ? "buy" : "sell")}
          disabled={orderLoading || (!currentMarketStatus.isOpen && symbol.exchange !== "BIST") || !targetPrice}
          className={`w-full h-12 font-bold disabled:opacity-50 ${orderType.startsWith("buy") ? "bg-buy hover:bg-buy/90 text-buy-foreground" : "bg-sell hover:bg-sell/90 text-sell-foreground"}`}
        >
          {orderType === "buy_limit" ? "BUY LIMIT" : orderType === "sell_limit" ? "SELL LIMIT" : orderType === "buy_stop" ? "BUY STOP" : "SELL STOP"}
          {targetPrice ? ` @ ${formatPrice(parseFloat(targetPrice))}` : " Emri Ver"}
        </Button>
      )}
    </div>
  );
}
