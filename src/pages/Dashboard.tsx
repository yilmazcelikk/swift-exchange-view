import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { AnimatedPrice } from "@/components/AnimatedPrice";
import { X, Pencil } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Order } from "@/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { calculatePnl, calculateMargin, calculateCommission } from "@/lib/trading";
import { useLiveSymbolPrices } from "@/hooks/useLiveSymbolPrices";

const Dashboard = () => {
  const { user: authUser } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [closingOrder, setClosingOrder] = useState<Order | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editSL, setEditSL] = useState("");
  const [editTP, setEditTP] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [profile, setProfile] = useState({ balance: 0, equity: 0, freeMargin: 0, credit: 0 });

  useEffect(() => {
    if (authUser?.id) {
      loadData();

      const profileChannel = supabase
        .channel('dashboard-profile')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${authUser.id}`,
        }, (payload) => {
          if (payload.new) {
            const d = payload.new as any;
            setProfile({
              balance: Number(d.balance),
              equity: Number(d.equity),
              freeMargin: Number(d.free_margin),
              credit: Number(d.credit || 0),
            });
          }
        })
        .subscribe();

      const ordersChannel = supabase
        .channel('dashboard-orders')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${authUser.id}`,
        }, () => {
          loadOrders();
        })
        .subscribe();

      const symbolsChannel = supabase
        .channel('dashboard-symbols')
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'symbols',
        }, (payload) => {
          if (payload.new) {
            const updated = payload.new as any;
            setOrders(prev => prev.map(o => {
              if (o.symbolId === updated.id && updated.current_price) {
                const newPrice = Number(updated.current_price);
                return { ...o, currentPrice: newPrice };
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

  // Lightweight poll every 5s as fallback (Realtime is primary)
  useEffect(() => {
    if (!authUser?.id) return;
    const interval = setInterval(() => {
      loadOrders();
    }, 5000);
    return () => clearInterval(interval);
  }, [authUser?.id]);

  const loadData = async () => {
    const [profileRes] = await Promise.all([
      supabase.from("profiles").select("balance, equity, free_margin, credit").eq("user_id", authUser!.id).single(),
    ]);

    if (profileRes.data) {
      setProfile({
        balance: Number(profileRes.data.balance),
        equity: Number(profileRes.data.equity),
        freeMargin: Number(profileRes.data.free_margin),
        credit: Number(profileRes.data.credit || 0),
      });
    }

    await loadOrders();
  };

  const loadOrders = async () => {
    const { data } = await supabase.from("orders").select("*").eq("user_id", authUser!.id).eq("status", "open");

    if (data) {
      const symbolIds = [...new Set(data.map((o: any) => o.symbol_id))];
      const { data: symbolsData } = await supabase
        .from("symbols")
        .select("id, current_price")
        .in("id", symbolIds);
      const priceMap = new Map(symbolsData?.map(s => [s.id, Number(s.current_price)]) || []);

      setOrders(data.map((o: any) => {
        const currentPrice = priceMap.get(o.symbol_id) || Number(o.current_price);

        return {
          id: o.id,
          symbolId: o.symbol_id,
          symbolName: o.symbol_name,
          type: o.type as "buy" | "sell",
          orderType: (o.order_type || "market") as "market" | "limit",
          lots: Number(o.lots),
          entryPrice: Number(o.entry_price),
          currentPrice,
          stopLoss: o.stop_loss ? Number(o.stop_loss) : undefined,
          takeProfit: o.take_profit ? Number(o.take_profit) : undefined,
          pnl: 0, // Will be recalculated with live prices
          status: o.status as "open" | "closed",
          createdAt: o.created_at,
        };
      }));
    }
  };

  const openOrders = orders.filter(o => o.status === 'open');

  // Build symbol price map for live ticking
  const symbolPriceMap = useMemo(() => {
    const map: Record<string, { price: number; changePercent?: number }> = {};
    for (const o of openOrders) {
      if (!map[o.symbolId]) {
        map[o.symbolId] = { price: o.currentPrice, changePercent: 0 };
      } else {
        // Update to latest price if higher
        map[o.symbolId].price = o.currentPrice;
      }
    }
    return map;
  }, [openOrders]);

  // Live ticking prices for all symbols in open orders
  const livePrices = useLiveSymbolPrices(symbolPriceMap, openOrders.length > 0);

  // Recalculate everything with live prices
  const liveOrders = useMemo(() => {
    return openOrders.map(o => {
      const livePrice = livePrices[o.symbolId] ?? o.currentPrice;
      const pnl = calculatePnl(o.symbolName, o.type, o.lots, o.entryPrice, livePrice);
      return { ...o, currentPrice: livePrice, pnl };
    });
  }, [openOrders, livePrices]);

  const totalOpenPnl = liveOrders.reduce((sum, o) => sum + o.pnl, 0);

  // Dynamic equity = balance + unrealized PnL
  const dynamicEquity = profile.balance + totalOpenPnl;

  // Calculate used margin from open orders using correct contract sizes
  const usedMargin = liveOrders.reduce((sum, o) => {
    return sum + calculateMargin(o.symbolName, o.lots, o.entryPrice, 200);
  }, 0);
  const dynamicFreeMargin = dynamicEquity - usedMargin;
  const marginLevel = usedMargin > 0 ? (dynamicEquity / usedMargin) * 100 : 0;

  const accountStats = [
    { label: "Bakiye", value: profile.balance },
    ...(profile.credit > 0 ? [{ label: "Kredi", value: profile.credit }] : []),
    { label: "Varlık", value: Math.round(dynamicEquity * 100) / 100 },
    { label: "Teminat", value: Math.round(usedMargin * 100) / 100 },
    { label: "Serbest teminat", value: Math.round(dynamicFreeMargin * 100) / 100 },
    { label: "Teminat seviyesi (%)", value: Math.round(marginLevel * 100) / 100 },
  ];

  const handleClosePosition = async (order: Order) => {
    setClosingOrder(null);
    
    const liveOrder = liveOrders.find(o => o.id === order.id) || order;
    
    // Calculate commission (0.2% of notional value)
    const commission = calculateCommission(liveOrder.symbolName, liveOrder.lots, liveOrder.currentPrice);
    const netPnl = liveOrder.pnl - commission;

    const { error } = await supabase
      .from("orders")
      .update({ 
        status: "closed", 
        closed_at: new Date().toISOString(),
        current_price: liveOrder.currentPrice,
        pnl: netPnl,
      })
      .eq("id", order.id);

    if (error) {
      toast.error("Pozisyon kapatılamadı: " + error.message);
      return;
    }

    // Update balance with realized PnL (after commission)
    const newBalance = profile.balance + netPnl;
    await supabase
      .from("profiles")
      .update({ 
        balance: newBalance,
        equity: newBalance,
        free_margin: newBalance,
      })
      .eq("user_id", authUser!.id);

    setOrders(prev => prev.filter(o => o.id !== order.id));
    toast.success(`${order.symbolName} ${order.type === 'buy' ? 'ALIŞ' : 'SATIŞ'} ${order.lots} lot pozisyon kapatıldı`, {
      description: `K/Z: ${netPnl >= 0 ? '+' : ''}${netPnl.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} USD (Komisyon: ${commission.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} USD)`,
    });

    loadData();
  };

  const openEditSlTp = (order: Order) => {
    setEditingOrder(order);
    setEditSL(order.stopLoss ? String(order.stopLoss) : "");
    setEditTP(order.takeProfit ? String(order.takeProfit) : "");
  };

  const handleSaveSlTp = async () => {
    if (!editingOrder) return;
    setEditSaving(true);
    const updates: any = {
      stop_loss: editSL ? parseFloat(editSL) : null,
      take_profit: editTP ? parseFloat(editTP) : null,
    };
    const { error } = await supabase
      .from("orders")
      .update(updates)
      .eq("id", editingOrder.id);
    if (error) {
      toast.error("Güncelleme başarısız: " + error.message);
    } else {
      setOrders(prev => prev.map(o =>
        o.id === editingOrder.id
          ? { ...o, stopLoss: updates.stop_loss ?? undefined, takeProfit: updates.take_profit ?? undefined }
          : o
      ));
      toast.success("Kar Al / Zarar Durdur güncellendi");
      setEditingOrder(null);
    }
    setEditSaving(false);
  };

  // Get live version of closing order for dialog
  const liveClosingOrder = closingOrder ? liveOrders.find(o => o.id === closingOrder.id) || closingOrder : null;
  const closingCommission = liveClosingOrder
    ? calculateCommission(liveClosingOrder.symbolName, liveClosingOrder.lots, liveClosingOrder.currentPrice)
    : 0;
  const closingNetPnl = liveClosingOrder ? liveClosingOrder.pnl - closingCommission : 0;

  const formatUsd = (v: number) => v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="flex flex-col h-full animate-slide-up">
      {/* Top PnL Display - only show when there are open orders */}
      {liveOrders.length > 0 && (
        <div className="flex items-center justify-center px-4 pt-4 pb-2">
          <AnimatedPrice
            value={Math.abs(totalOpenPnl)}
            live={false}
            className={`text-lg md:text-xl font-bold font-mono ${totalOpenPnl >= 0 ? 'text-buy' : 'text-sell'}`}
          />
          <span className={`text-lg md:text-xl font-bold font-mono ml-1 ${totalOpenPnl >= 0 ? 'text-buy' : 'text-sell'}`}>
            {totalOpenPnl >= 0 ? '' : '-'}USD
          </span>
        </div>
      )}

      {/* Account Stats */}
      <div className="px-4 pb-3 space-y-1">
        {accountStats.map((stat) => (
          <div key={stat.label} className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{stat.label}:</span>
            <span className="text-xs font-mono font-medium text-foreground">
              <AnimatedPrice
                value={Math.abs(stat.value)}
                live={false}
                className={`text-xs font-mono font-medium ${
                  stat.label === "Serbest teminat" && stat.value < 0 ? "text-sell" : "text-foreground"
                }`}
              />
              <span className="ml-0.5">{stat.label.includes('%') ? '' : ' USD'}</span>
            </span>
          </div>
        ))}
      </div>

      {/* Positions Header */}
      <div className="px-4 pb-2">
        <h2 className="text-sm font-semibold text-foreground">Pozisyonlar ({liveOrders.length})</h2>
      </div>

      {/* Open Positions List */}
      <div className="flex-1 overflow-auto px-4 pb-4">
        {liveOrders.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Açık pozisyon bulunmuyor.</p>
        ) : (
          <div className="divide-y divide-border">
            {liveOrders.map((order) => (
              <div key={order.id} className="py-3">
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
                      <AnimatedPrice value={order.currentPrice} live={false} className="text-[11px] font-mono text-foreground" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <AnimatedPrice
                        value={Math.abs(order.pnl)}
                        live={false}
                        className={`text-sm font-mono font-bold ${order.pnl >= 0 ? 'text-buy' : 'text-sell'}`}
                      />
                    </div>
                    <button
                      onClick={() => setClosingOrder(order)}
                      className="p-1 rounded hover:bg-sell/10 text-muted-foreground hover:text-sell transition-colors"
                      title="Pozisyonu Kapat"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Close Position Dialog */}
      <AlertDialog open={!!closingOrder} onOpenChange={(open) => !open && setClosingOrder(null)}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Pozisyonu Kapat</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>Bu pozisyonu kapatmak istediğinize emin misiniz?</p>
                {liveClosingOrder && (
                  <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Sembol</span>
                      <span className="font-semibold">{liveClosingOrder.symbolName}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Yön</span>
                      <span className={liveClosingOrder.type === 'buy' ? 'text-buy font-medium' : 'text-sell font-medium'}>
                        {liveClosingOrder.type === 'buy' ? 'ALIŞ' : 'SATIŞ'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Lot</span>
                      <span className="font-mono">{liveClosingOrder.lots}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Giriş Fiyatı</span>
                      <span className="font-mono">{formatUsd(liveClosingOrder.entryPrice)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Güncel Fiyat</span>
                      <AnimatedPrice value={liveClosingOrder.currentPrice} live={false} className="font-mono text-sm" />
                    </div>
                    <div className="flex justify-between text-sm border-t border-border pt-1 mt-1">
                      <span className="text-muted-foreground font-medium">K/Z</span>
                      <AnimatedPrice
                        value={Math.abs(closingNetPnl)}
                        live={false}
                        className={`font-mono font-bold text-sm ${closingNetPnl >= 0 ? 'text-buy' : 'text-sell'}`}
                      />
                    </div>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => closingOrder && handleClosePosition(closingOrder)}
              className="bg-sell hover:bg-sell/90 text-sell-foreground"
            >
              Pozisyonu Kapat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Dashboard;
