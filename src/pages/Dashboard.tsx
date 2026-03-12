import { useState, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AnimatedPrice } from "@/components/AnimatedPrice";
import { X, ChevronRight, ShieldAlert, Target, BarChart3, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Order } from "@/types";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { calculatePnl, calculateMargin, calculateCommission, calculateSwap, calculateNetMargin } from "@/lib/trading";
import { useLiveSymbolPrices } from "@/hooks/useLiveSymbolPrices";
import { getMarketStatus } from "@/lib/marketHours";

const Dashboard = () => {
  const { user: authUser } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [symbolCategories, setSymbolCategories] = useState<Record<string, string>>({});
  const [symbolExchanges, setSymbolExchanges] = useState<Record<string, string | null>>({});
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [closingOrder, setClosingOrder] = useState<Order | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editSL, setEditSL] = useState("");
  const [editTP, setEditTP] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [profile, setProfile] = useState({ balance: 0, equity: 0, freeMargin: 0, credit: 0, leverage: "1:200" });

  const leverageRatio = parseInt(profile.leverage.split(":")[1] || "200", 10);

  useEffect(() => {
    if (authUser?.id) {
      loadData();

      const profileChannel = supabase
        .channel('dashboard-profile')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `user_id=eq.${authUser.id}` }, (payload) => {
          if (payload.new) {
            const d = payload.new as any;
            setProfile({
              balance: Number(d.balance), equity: Number(d.equity),
              freeMargin: Number(d.free_margin), credit: Number(d.credit || 0),
              leverage: d.leverage || "1:200",
            });
          }
        })
        .subscribe();

      const ordersChannel = supabase
        .channel('dashboard-orders')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `user_id=eq.${authUser.id}` }, () => loadOrders())
        .subscribe();

      const symbolsChannel = supabase
        .channel('dashboard-symbols')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'symbols' }, (payload) => {
          if (payload.new) {
            const updated = payload.new as any;
            setOrders(prev => prev.map(o => {
              if (o.symbolId === updated.id && updated.current_price) {
                return { ...o, currentPrice: Number(updated.current_price) };
              }
              return o;
            }));
          }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(profileChannel);
        supabase.removeChannel(ordersChannel);
        supabase.removeChannel(symbolsChannel);
      };
    }
  }, [authUser?.id]);

  const loadData = async () => {
    const [profileRes] = await Promise.all([
      supabase.from("profiles").select("balance, equity, free_margin, credit, leverage").eq("user_id", authUser!.id).single(),
    ]);
    if (profileRes.data) {
      setProfile({
        balance: Number(profileRes.data.balance), equity: Number(profileRes.data.equity),
        freeMargin: Number(profileRes.data.free_margin), credit: Number(profileRes.data.credit || 0),
        leverage: profileRes.data.leverage || "1:200",
      });
    }
    await loadOrders();
  };

  const loadOrders = async () => {
    const { data } = await supabase.from("orders").select("*").eq("user_id", authUser!.id).eq("status", "open");
    if (data) {
      const symbolIds = [...new Set(data.map((o: any) => o.symbol_id))];
      const { data: symbolsData } = await supabase.from("symbols").select("id, current_price, name, category, exchange").in("id", symbolIds);
      const priceMap = new Map(symbolsData?.map(s => [s.id, { price: Number(s.current_price), name: s.name, category: s.category }]) || []);
      const catMap: Record<string, string> = {};
      const exchMap: Record<string, string | null> = {};
      symbolsData?.forEach(s => { catMap[s.id] = s.category; exchMap[s.id] = s.exchange; });
      setSymbolCategories(prev => ({ ...prev, ...catMap }));
      setSymbolExchanges(prev => ({ ...prev, ...exchMap }));
      setOrders(data.map((o: any) => {
        const symbolInfo = priceMap.get(o.symbol_id);
        return {
          id: o.id, symbolId: o.symbol_id, symbolName: o.symbol_name,
          type: o.type as "buy" | "sell", orderType: (o.order_type || "market") as "market" | "limit",
          lots: Number(o.lots), entryPrice: Number(o.entry_price),
          currentPrice: symbolInfo ? symbolInfo.price : Number(o.current_price),
          stopLoss: o.stop_loss ? Number(o.stop_loss) : undefined,
          takeProfit: o.take_profit ? Number(o.take_profit) : undefined,
          pnl: 0, leverage: o.leverage || "1:200",
          status: o.status as "open" | "closed", createdAt: o.created_at,
        };
      }));
    }
    const { data: pendData } = await supabase.from("orders").select("*").eq("user_id", authUser!.id).eq("status", "pending");
    if (pendData) {
      const pendSymbolIds = [...new Set(pendData.map((o: any) => o.symbol_id))];
      if (pendSymbolIds.length > 0) {
        const { data: pendSymbolsData } = await supabase.from("symbols").select("id, current_price, category, exchange").in("id", pendSymbolIds);
        const catMap: Record<string, string> = {};
        const exchMap: Record<string, string | null> = {};
        pendSymbolsData?.forEach(s => { catMap[s.id] = s.category; exchMap[s.id] = s.exchange; });
        setSymbolCategories(prev => ({ ...prev, ...catMap }));
        setSymbolExchanges(prev => ({ ...prev, ...exchMap }));
      }
      setPendingOrders(pendData);
    } else {
      setPendingOrders([]);
    }
  };

  const openOrders = orders.filter(o => o.status === 'open');
  const symbolPriceMap = useMemo(() => {
    const map: Record<string, { price: number; changePercent?: number; marketOpen?: boolean }> = {};
    for (const o of openOrders) {
      if (!map[o.symbolId]) {
        const cat = symbolCategories[o.symbolId] || "";
        const exch = symbolExchanges[o.symbolId] || null;
        const status = getMarketStatus(o.symbolName, cat, exch);
        map[o.symbolId] = { price: o.currentPrice, changePercent: 0, marketOpen: status.isOpen };
      } else {
        map[o.symbolId].price = o.currentPrice;
      }
    }
    return map;
  }, [openOrders, symbolCategories]);

  const livePrices = useLiveSymbolPrices(symbolPriceMap, openOrders.length > 0);

  const liveOrders = useMemo(() => {
    return openOrders.map(o => {
      const livePrice = livePrices[o.symbolId] ?? o.currentPrice;
      const pnl = calculatePnl(o.symbolName, o.type, o.lots, o.entryPrice, livePrice);
      return { ...o, currentPrice: livePrice, pnl };
    });
  }, [openOrders, livePrices]);

  const totalOpenPnl = liveOrders.reduce((sum, o) => sum + o.pnl, 0);
  const dynamicEquity = profile.balance + profile.credit + totalOpenPnl;
  const usedMargin = calculateNetMargin(liveOrders.map(o => ({
    symbol_name: o.symbolName,
    lots: o.lots,
    entry_price: o.entryPrice,
    leverage: o.leverage || "1:200",
    type: o.type,
  })));
  const dynamicFreeMargin = dynamicEquity - usedMargin;
  const marginLevel = usedMargin > 0 ? (dynamicEquity / usedMargin) * 100 : 0;

  // Auto-trigger stop-out check when margin level drops below threshold
  const stopOutTriggeredRef = useRef(false);
  useEffect(() => {
    if (usedMargin > 0 && marginLevel <= 30 && !stopOutTriggeredRef.current && liveOrders.length > 0) {
      stopOutTriggeredRef.current = true;
      console.log(`[StopOut] Margin level ${marginLevel.toFixed(2)}% <= 30%, triggering check-sl-tp`);
      supabase.functions.invoke('check-sl-tp').then(({ data, error }) => {
        if (error) console.error('[StopOut] Error:', error);
        else {
          console.log('[StopOut] Result:', data);
          if (data?.stopOutClosed > 0 || data?.closed > 0) {
            loadData();
          }
        }
        // Allow re-trigger after 10 seconds
        setTimeout(() => { stopOutTriggeredRef.current = false; }, 10000);
      });
    } else if (marginLevel > 30) {
      stopOutTriggeredRef.current = false;
    }
  }, [marginLevel, usedMargin, liveOrders.length]);

  const hasOpenOrders = liveOrders.length > 0;
  const isMarginCall = hasOpenOrders && usedMargin > 0 && marginLevel <= 100 && marginLevel > 30;
  const isCriticalMargin = hasOpenOrders && usedMargin > 0 && marginLevel <= 80 && marginLevel > 30;
  const isStopOutDanger = hasOpenOrders && usedMargin > 0 && marginLevel <= 30;
  const accountStats = [
    { label: "Bakiye", value: profile.balance },
    ...(profile.credit > 0 ? [{ label: "Kredi", value: profile.credit }] : []),
    { label: "Varlık", value: Math.round(dynamicEquity * 100) / 100 },
    ...(hasOpenOrders ? [{ label: "Teminat", value: Math.round(usedMargin * 100) / 100 }] : []),
    { label: "Serbest teminat", value: Math.round(dynamicFreeMargin * 100) / 100 },
    ...(hasOpenOrders ? [{ label: "Teminat seviyesi (%)", value: Math.round(marginLevel * 100) / 100 }] : []),
  ];

  // Atomic position close using DB function
  const handleClosePosition = async (order: Order) => {
    const cat = symbolCategories[order.symbolId] || "";
    const exch = symbolExchanges[order.symbolId] || null;
    const mStatus = getMarketStatus(order.symbolName, cat, exch);
    if (!mStatus.isOpen) {
      toast.error("Piyasa kapalı. Kapalı piyasalarda pozisyon kapatılamaz.");
      return;
    }

    setClosingOrder(null);
    setSelectedOrder(null);

    const liveOrder = liveOrders.find(o => o.id === order.id) || order;
    const commission = calculateCommission(liveOrder.symbolName, liveOrder.lots, liveOrder.currentPrice);
    const daysHeld = Math.max(1, Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 86400000));
    const swap = calculateSwap(liveOrder.symbolName, liveOrder.lots, daysHeld);
    const netPnl = liveOrder.pnl - commission + swap;

    // Use atomic DB function
    const { data: result, error } = await supabase.rpc("close_position", {
      p_order_id: order.id,
      p_close_price: liveOrder.currentPrice,
      p_net_pnl: netPnl,
      p_swap: swap,
      p_close_reason: null,
    });

    if (error) {
      toast.error("Pozisyon kapatılamadı: " + error.message);
      return;
    }

    const res = result as any;
    if (!res?.success) {
      toast.info("Bu pozisyon zaten kapatılmış.");
      loadData();
      return;
    }

    setOrders(prev => prev.filter(o => o.id !== order.id));
    toast.success(`${order.symbolName} ${order.type === 'buy' ? 'ALIŞ' : 'SATIŞ'} ${order.lots} lot pozisyon kapatıldı`, {
      description: `K/Z: ${netPnl >= 0 ? '+' : ''}${netPnl.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} USD`,
    });
    loadData();
  };

  const openOrderSheet = (order: Order) => {
    setSelectedOrder(order);
    setEditMode(false);
    setEditSL(order.stopLoss ? String(order.stopLoss) : "");
    setEditTP(order.takeProfit ? String(order.takeProfit) : "");
  };

  const handleSaveSlTp = async () => {
    if (!selectedOrder) return;
    setEditSaving(true);
    const slValue = editSL ? parseFloat(editSL) : null;
    const tpValue = editTP ? parseFloat(editTP) : null;
    const liveOrder = liveOrders.find(o => o.id === selectedOrder.id) || selectedOrder;
    const currentPrice = liveOrder.currentPrice;
    const isBuy = selectedOrder.type === 'buy';

    if (isBuy) {
      if (slValue !== null && slValue >= currentPrice) { toast.error("Alış pozisyonunda Zarar Durdur, güncel fiyatın altında olmalıdır."); setEditSaving(false); return; }
      if (tpValue !== null && tpValue <= currentPrice) { toast.error("Alış pozisyonunda Kâr Al, güncel fiyatın üzerinde olmalıdır."); setEditSaving(false); return; }
    } else {
      if (slValue !== null && slValue <= currentPrice) { toast.error("Satış pozisyonunda Zarar Durdur, güncel fiyatın üzerinde olmalıdır."); setEditSaving(false); return; }
      if (tpValue !== null && tpValue >= currentPrice) { toast.error("Satış pozisyonunda Kâr Al, güncel fiyatın altında olmalıdır."); setEditSaving(false); return; }
    }

    const { error } = await supabase.from("orders").update({ stop_loss: slValue, take_profit: tpValue }).eq("id", selectedOrder.id);
    if (error) {
      toast.error("Güncelleme başarısız: " + error.message);
    } else {
      setOrders(prev => prev.map(o => o.id === selectedOrder.id ? { ...o, stopLoss: slValue ?? undefined, takeProfit: tpValue ?? undefined } : o));
      toast.success("Kar Al / Zarar Durdur güncellendi");
      setEditMode(false);
    }
    setEditSaving(false);
  };

  const liveSelectedOrder = selectedOrder ? liveOrders.find(o => o.id === selectedOrder.id) || selectedOrder : null;
  const liveClosingOrder = closingOrder ? liveOrders.find(o => o.id === closingOrder.id) || closingOrder : null;
  const closingCommission = liveClosingOrder ? calculateCommission(liveClosingOrder.symbolName, liveClosingOrder.lots, liveClosingOrder.currentPrice) : 0;
  const closingDaysHeld = liveClosingOrder ? Math.max(1, Math.floor((Date.now() - new Date(liveClosingOrder.createdAt).getTime()) / 86400000)) : 0;
  const closingSwap = liveClosingOrder ? calculateSwap(liveClosingOrder.symbolName, liveClosingOrder.lots, closingDaysHeld) : 0;
  const closingNetPnl = liveClosingOrder ? liveClosingOrder.pnl - closingCommission + closingSwap : 0;

  const formatUsd = (v: number) => v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="flex flex-col h-full animate-slide-up">
      {/* Top PnL bar - always visible */}
      <div className="flex items-center justify-center px-4 pt-2 pb-1 min-h-[32px]">
        {hasOpenOrders && (
          <>
            {totalOpenPnl < 0 && <span className="text-base font-bold font-mono text-sell">-</span>}
            <AnimatedPrice value={Math.abs(totalOpenPnl)} live={false} disableFlashColor formatFn={(v) => v === 0 ? "0.00" : v.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} className={`text-base font-bold font-mono ${totalOpenPnl >= 0 ? 'text-buy' : 'text-sell'}`} />
            <span className={`text-base font-bold font-mono ml-1 ${totalOpenPnl >= 0 ? 'text-buy' : 'text-sell'}`}>USD</span>
          </>
        )}
      </div>

      {/* Margin Call / Stop Out Warning Banner */}
      {isMarginCall && (
        <div className={`mx-4 mt-2 mb-1 rounded-lg px-3 py-2 flex items-center gap-2 ${isStopOutDanger ? 'bg-sell/20 border border-sell/40 animate-pulse' : isCriticalMargin ? 'bg-sell/15 border border-sell/30' : 'bg-orange-500/15 border border-orange-500/30'}`}>
          <ShieldAlert className={`h-4 w-4 shrink-0 ${isStopOutDanger ? 'text-sell' : isCriticalMargin ? 'text-sell' : 'text-orange-500'}`} />
          <div className="flex-1 min-w-0">
            <span className={`text-[11px] font-bold ${isStopOutDanger ? 'text-sell' : isCriticalMargin ? 'text-sell' : 'text-orange-500'}`}>
              {isStopOutDanger ? '🔴 STOP OUT — Pozisyonlar kapatılıyor!' : isCriticalMargin ? '⚠️ KRİTİK TEMİNAT — %80 altı!' : '⚠️ MARGIN CALL — %100 altı'}
            </span>
            <p className={`text-[10px] ${isStopOutDanger ? 'text-sell/80' : isCriticalMargin ? 'text-sell/80' : 'text-orange-500/80'}`}>
              {isStopOutDanger ? 'En zararlı pozisyonlar %30 üzerine çıkana kadar kapatılır.' : isCriticalMargin ? 'Teminat seviyeniz kritik düzeyde düşük.' : 'Hesabınıza bakiye eklemeniz önerilir.'}
            </p>
          </div>
          <span className={`text-sm font-mono font-bold shrink-0 ${isStopOutDanger ? 'text-sell' : isCriticalMargin ? 'text-sell' : 'text-orange-500'}`}>
            %{marginLevel.toFixed(1)}
          </span>
        </div>
      )}

      {/* Account Stats */}
      <div className="px-4 pt-2 pb-1.5">
        {accountStats.map((stat) => {
          const isMarginLevelStat = stat.label === "Teminat seviyesi (%)";
          const isNegativeFreeMargin = stat.label === "Serbest teminat" && stat.value < 0;
          const isNegativeValue = stat.value < 0;
          let valueColorClass = "text-foreground";
          if (isMarginLevelStat && isStopOutDanger) valueColorClass = "text-sell animate-pulse font-bold";
          else if (isMarginLevelStat && isCriticalMargin) valueColorClass = "text-sell font-bold";
          else if (isMarginLevelStat && isMarginCall) valueColorClass = "text-orange-500 font-bold";
          else if (isNegativeFreeMargin || (stat.label === "Bakiye" && isNegativeValue)) valueColorClass = "text-sell";

          return (
            <div key={stat.label} className={`flex items-center justify-between h-[22px] ${isMarginLevelStat && isCriticalMargin ? "bg-sell/10 -mx-4 px-4 rounded" : isMarginLevelStat && isMarginCall ? "bg-orange-500/10 -mx-4 px-4 rounded" : ""}`}>
              <span className={`text-[11px] ${isMarginLevelStat && isCriticalMargin ? "text-sell font-medium" : isMarginLevelStat && isMarginCall ? "text-orange-500 font-medium" : "text-muted-foreground"}`}>{stat.label}:</span>
              <span className="text-[11px] font-mono font-medium text-foreground">
                {isNegativeValue && <span className={`text-[11px] font-mono font-medium ${valueColorClass}`}>-</span>}
                <AnimatedPrice value={Math.abs(stat.value)} live={false} formatFn={(v) => v === 0 ? "0" : v.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} className={`text-[11px] font-mono font-medium ${valueColorClass}`} />
                <span className="ml-0.5">{stat.label.includes('%') ? '' : ' USD'}</span>
              </span>
            </div>
          );
        })}
      </div>

      {/* Positions Header */}
      <div className="px-4 py-1">
        <h2 className="text-xs font-semibold text-foreground">Pozisyonlar ({liveOrders.length})</h2>
      </div>

      {/* Positions List */}
      <div className="flex-1 overflow-auto px-4 pb-4 overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
        {liveOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <BarChart3 className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Açık pozisyon bulunmuyor.</p>
            <button onClick={() => navigate('/trading')} className="mt-3 text-xs text-primary font-medium hover:underline">Piyasalara Git →</button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {liveOrders.map((order) => (
              <button key={order.id} onClick={() => openOrderSheet(order)} className="w-full py-3 text-left hover:bg-muted/30 active:bg-muted/50 transition-colors rounded-lg px-2 -mx-2">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{order.symbolName}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${order.type === 'buy' ? 'bg-buy/15 text-buy' : 'bg-sell/15 text-sell'}`}>
                        {order.type === 'buy' ? 'ALIŞ' : 'SATIŞ'} {order.lots}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[11px] text-muted-foreground font-mono">{formatUsd(order.entryPrice)}</span>
                      <span className="text-[11px] text-muted-foreground">→</span>
                      <AnimatedPrice value={order.currentPrice} live={false} formatFn={(v) => v === 0 ? "0" : v.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} className="text-[11px] font-mono text-foreground" />
                    </div>
                    {(order.stopLoss || order.takeProfit) && (
                      <div className="flex items-center gap-2 mt-0.5">
                        {order.stopLoss && <span className="text-[10px] text-sell font-mono flex items-center gap-0.5"><ShieldAlert className="h-2.5 w-2.5" /> {formatUsd(order.stopLoss)}</span>}
                        {order.takeProfit && <span className="text-[10px] text-buy font-mono flex items-center gap-0.5"><Target className="h-2.5 w-2.5" /> {formatUsd(order.takeProfit)}</span>}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {order.pnl < 0 && <span className="text-sm font-mono font-bold text-sell">-</span>}
                    <AnimatedPrice value={Math.abs(order.pnl)} live={false} disableFlashColor formatFn={(v) => v === 0 ? "0" : v.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} className={`text-sm font-mono font-bold ${order.pnl >= 0 ? 'text-buy' : 'text-sell'}`} />
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Pending Orders */}
        {pendingOrders.length > 0 && (
          <>
            <div className="pt-4 pb-2">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                Bekleyen Emirler ({pendingOrders.length})
              </h2>
            </div>
            <div className="divide-y divide-border">
              {pendingOrders.map((order: any) => {
                const orderTypeLabels: Record<string, string> = { buy_limit: "BUY LIMIT", sell_limit: "SELL LIMIT", buy_stop: "BUY STOP", sell_stop: "SELL STOP" };
                const isBuy = order.type === "buy";
                return (
                  <div key={order.id} className="py-3 px-2 -mx-2 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">{order.symbol_name}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isBuy ? 'bg-buy/15 text-buy' : 'bg-sell/15 text-sell'}`}>
                          {orderTypeLabels[order.order_type] || order.order_type}
                        </span>
                      </div>
                      <span className="text-[11px] text-muted-foreground font-mono">{Number(order.lots)} lot @ {formatUsd(Number(order.target_price))}</span>
                    </div>
                    <Button
                      variant="ghost" size="icon"
                      className="h-8 w-8 shrink-0 text-sell hover:bg-sell/10"
                      onClick={async () => {
                        const { error } = await supabase.from("orders").update({ status: "closed", closed_at: new Date().toISOString(), close_reason: "cancelled", pnl: 0 } as any).eq("id", order.id).eq("status", "pending");
                        if (error) toast.error("İptal başarısız: " + error.message);
                        else { toast.success(`${order.symbol_name} bekleyen emir iptal edildi`); loadData(); }
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Position Detail Sheet */}
      <Sheet open={!!selectedOrder} onOpenChange={(open) => { if (!open) { setSelectedOrder(null); setEditMode(false); } }}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[80dvh] overflow-y-auto" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 16px)' }}>
          <SheetHeader className="pb-2">
            <SheetTitle className="flex items-center gap-2">
              <span>{liveSelectedOrder?.symbolName}</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${liveSelectedOrder?.type === 'buy' ? 'bg-buy/15 text-buy' : 'bg-sell/15 text-sell'}`}>
                {liveSelectedOrder?.type === 'buy' ? 'ALIŞ' : 'SATIŞ'}
              </span>
            </SheetTitle>
          </SheetHeader>
          {liveSelectedOrder && (
            <div className="space-y-4 pt-2">
              <div className="bg-muted/40 rounded-xl p-3 space-y-2">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Lot</span><span className="font-mono font-medium">{liveSelectedOrder.lots}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Giriş Fiyatı</span><span className="font-mono font-medium">{formatUsd(liveSelectedOrder.entryPrice)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Güncel Fiyat</span><AnimatedPrice value={liveSelectedOrder.currentPrice} live={false} className="font-mono font-medium text-sm" /></div>
                <div className="flex justify-between text-sm border-t border-border pt-2">
                  <span className="text-muted-foreground font-medium">K/Z</span>
                  <div className="flex items-center">
                    {liveSelectedOrder.pnl < 0 && <span className="font-mono font-bold text-sm text-sell">-</span>}
                    <AnimatedPrice value={Math.abs(liveSelectedOrder.pnl)} live={false} disableFlashColor formatFn={(v) => v === 0 ? "0.00" : v.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} className={`font-mono font-bold text-sm ${liveSelectedOrder.pnl >= 0 ? 'text-buy' : 'text-sell'}`} />
                  </div>
                </div>
              </div>

              {/* SL/TP Section */}
              <div className="bg-muted/40 rounded-xl p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">Zarar Durdur / Kâr Al</span>
                  {!editMode && <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setEditMode(true)}>Düzenle</Button>}
                </div>
                {editMode ? (
                  <div className="space-y-3">
                    {(() => {
                      const liveOrd = liveOrders.find(o => o.id === liveSelectedOrder.id) || liveSelectedOrder;
                      if (liveOrd.pnl <= 0) return null;
                      const isBuy = liveOrd.type === "buy";
                      const entry = liveOrd.entryPrice;
                      const current = liveOrd.currentPrice;
                      const midPoint = isBuy ? entry + (current - entry) * 0.5 : entry - (entry - current) * 0.5;
                      return (
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="flex-1 text-[10px] h-7 border-primary/30 text-primary" onClick={() => setEditSL(String(entry))}>🔒 Break-Even ({formatUsd(entry)})</Button>
                          <Button variant="outline" size="sm" className="flex-1 text-[10px] h-7 border-buy/30 text-buy" onClick={() => setEditSL(String(parseFloat(midPoint.toFixed(5))))}>💰 Kâr Koruma ({formatUsd(midPoint)})</Button>
                        </div>
                      );
                    })()}
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1"><ShieldAlert className="h-3 w-3 text-sell" /> Zarar Durdur (SL)</label>
                      <Input type="number" step="any" placeholder="Boş bırakılabilir" value={editSL} onChange={(e) => setEditSL(e.target.value)} className="font-mono bg-background h-9" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1"><Target className="h-3 w-3 text-buy" /> Kâr Al (TP)</label>
                      <Input type="number" step="any" placeholder="Boş bırakılabilir" value={editTP} onChange={(e) => setEditTP(e.target.value)} className="font-mono bg-background h-9" />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => setEditMode(false)}>İptal</Button>
                      <Button size="sm" className="flex-1" onClick={handleSaveSlTp} disabled={editSaving}>{editSaving ? "Kaydediliyor..." : "Kaydet"}</Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground flex items-center gap-1"><ShieldAlert className="h-3 w-3 text-sell" /> Zarar Durdur</span><span className="font-mono text-sell">{liveSelectedOrder.stopLoss ? formatUsd(liveSelectedOrder.stopLoss) : "—"}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground flex items-center gap-1"><Target className="h-3 w-3 text-buy" /> Kâr Al</span><span className="font-mono text-buy">{liveSelectedOrder.takeProfit ? formatUsd(liveSelectedOrder.takeProfit) : "—"}</span></div>
                  </div>
                )}
              </div>

              <Button variant="outline" className="w-full" onClick={() => { setSelectedOrder(null); navigate(`/trading?symbol=${encodeURIComponent(liveSelectedOrder.symbolName)}`); }}>
                <BarChart3 className="h-4 w-4 mr-1" /> Grafik
              </Button>
              <Button variant="destructive" className="w-full" onClick={() => setClosingOrder(liveSelectedOrder)}>
                <X className="h-4 w-4 mr-1" /> Pozisyonu Kapat
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Close Confirm */}
      <AlertDialog open={!!closingOrder} onOpenChange={(open) => !open && setClosingOrder(null)}>
        <AlertDialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-sm mx-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Pozisyonu Kapat</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>Bu pozisyonu kapatmak istediğinize emin misiniz?</p>
                {liveClosingOrder && (
                  <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Sembol</span><span className="font-semibold">{liveClosingOrder.symbolName}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Yön</span><span className={liveClosingOrder.type === 'buy' ? 'text-buy font-medium' : 'text-sell font-medium'}>{liveClosingOrder.type === 'buy' ? 'ALIŞ' : 'SATIŞ'}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Lot</span><span className="font-mono">{liveClosingOrder.lots}</span></div>
                    <div className="flex justify-between text-sm border-t border-border pt-1 mt-1">
                      <span className="text-muted-foreground font-medium">Net K/Z</span>
                      <div className="flex items-center">
                        {closingNetPnl < 0 && <span className="font-mono font-bold text-sm text-sell">-</span>}
                        <AnimatedPrice value={Math.abs(closingNetPnl)} live={false} disableFlashColor className={`font-mono font-bold text-sm ${closingNetPnl >= 0 ? 'text-buy' : 'text-sell'}`} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={() => closingOrder && handleClosePosition(closingOrder)} className="bg-sell hover:bg-sell/90 text-sell-foreground">Pozisyonu Kapat</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Dashboard;
