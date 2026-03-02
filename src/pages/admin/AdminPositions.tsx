import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, RefreshCw, Search, ChevronDown, ChevronRight, TrendingUp, TrendingDown, Users, BarChart3, DollarSign, Clock } from "lucide-react";
import { toast } from "sonner";
import { calculatePnl, calculateMargin, calculateCommission } from "@/lib/trading";
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

interface OrderRow {
  id: string;
  user_id: string;
  symbol_id: string;
  symbol_name: string;
  type: string;
  order_type: string;
  lots: number;
  entry_price: number;
  current_price: number;
  stop_loss: number | null;
  take_profit: number | null;
  pnl: number;
  status: string;
  leverage: string;
  created_at: string;
}

interface UserProfile {
  user_id: string;
  full_name: string | null;
  balance: number;
  meta_id: number;
}

const AdminPositions = () => {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [profiles, setProfiles] = useState<Map<string, UserProfile>>(new Map());
  const [closingOrder, setClosingOrder] = useState<OrderRow | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadAll();
    const interval = setInterval(() => {
      void Promise.all([loadOrders(), loadProfiles()]);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      await Promise.all([loadOrders(), loadProfiles()]);
    } finally {
      setLoading(false);
    }
  };

  const loadOrders = async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("status", "open")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("loadOrders error:", error);
        return;
      }

      if (!data || data.length === 0) {
        setOrders([]);
        return;
      }

      const symbolIds = [...new Set(data.map((o) => o.symbol_id).filter(Boolean))];
      const { data: symbolsData, error: symbolsError } = await supabase
        .from("symbols")
        .select("id, current_price")
        .in("id", symbolIds);

      if (symbolsError) {
        console.error("loadOrders symbols error:", symbolsError);
      }

      const priceMap = new Map((symbolsData ?? []).map((s) => [s.id, Number(s.current_price)]));

      setOrders(
        data.map((o) => {
          const currentPrice = priceMap.get(o.symbol_id) || Number(o.current_price);
          const pnl = calculatePnl(o.symbol_name, o.type as "buy" | "sell", Number(o.lots), Number(o.entry_price), currentPrice);
          return { ...o, lots: Number(o.lots), entry_price: Number(o.entry_price), current_price: currentPrice, pnl };
        })
      );
    } catch (err) {
      console.error("loadOrders unexpected error:", err);
    }
  };

  const loadProfiles = async () => {
    try {
      const { data, error } = await supabase.from("profiles").select("user_id, full_name, balance, meta_id");
      if (error) {
        console.error("loadProfiles error:", error);
        return;
      }
      if (data) {
        const map = new Map<string, UserProfile>();
        data.forEach((p) => map.set(p.user_id, p));
        setProfiles(map);
      }
    } catch (err) {
      console.error("loadProfiles unexpected error:", err);
    }
  };

  const toggleUser = (userId: string) => {
    setExpandedUsers(prev => {
      const next = new Set(prev);
      next.has(userId) ? next.delete(userId) : next.add(userId);
      return next;
    });
  };

  // Group orders by user
  const groupedOrders = useMemo(() => {
    const groups = new Map<string, OrderRow[]>();
    orders.forEach(o => {
      const list = groups.get(o.user_id) || [];
      list.push(o);
      groups.set(o.user_id, list);
    });
    return groups;
  }, [orders]);

  // Filter by search
  const filteredUserIds = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return [...groupedOrders.keys()];
    return [...groupedOrders.keys()].filter(uid => {
      const profile = profiles.get(uid);
      const name = profile?.full_name?.toLowerCase() || "";
      const metaId = profile?.meta_id?.toString() || "";
      const userOrders = groupedOrders.get(uid) || [];
      const hasSymbol = userOrders.some(o => o.symbol_name.toLowerCase().includes(query));
      return name.includes(query) || metaId.includes(query) || uid.includes(query) || hasSymbol;
    });
  }, [groupedOrders, profiles, searchQuery]);

  // Summary stats
  const totalPnl = orders.reduce((sum, o) => sum + o.pnl, 0);
  const totalMargin = orders.reduce((sum, o) => {
    const leverageNum = parseInt(o.leverage.split(":")[1]) || 200;
    return sum + calculateMargin(o.symbol_name, o.lots, o.entry_price, leverageNum);
  }, 0);
  const uniqueUsers = new Set(orders.map(o => o.user_id)).size;
  const buyCount = orders.filter(o => o.type === "buy").length;
  const sellCount = orders.filter(o => o.type === "sell").length;

  const closePosition = async (order: OrderRow) => {
    const commission = calculateCommission(order.symbol_name, order.lots, order.current_price);
    const netPnl = order.pnl - commission;

    const { error } = await supabase
      .from("orders")
      .update({ status: "closed", closed_at: new Date().toISOString(), current_price: order.current_price, pnl: netPnl })
      .eq("id", order.id);

    if (error) {
      toast.error("Pozisyon kapatılamadı");
    } else {
      // Update user balance
      const profile = profiles.get(order.user_id);
      if (profile) {
        const newBalance = profile.balance + netPnl;
        await supabase.from("profiles").update({ balance: newBalance, equity: newBalance, free_margin: newBalance }).eq("user_id", order.user_id);
      }
      toast.success(`${order.symbol_name} pozisyon kapatıldı (K/Z: ${formatUsd(netPnl)})`);
      setClosingOrder(null);
      loadOrders();
    }
  };

  const formatUsd = (v: number) => v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formatDate = (d: string) => new Date(d).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

  const getUserLabel = (userId: string) => {
    const p = profiles.get(userId);
    if (p?.full_name) return p.full_name;
    return `#${p?.meta_id || userId.slice(0, 8)}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold">Açık Pozisyonlar</h2>
          <p className="text-sm text-muted-foreground">{orders.length} pozisyon • {uniqueUsers} kullanıcı</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadAll} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" />
          Yenile
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-card border-border">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Toplam K/Z</span>
            </div>
            <p className={`text-lg font-bold font-mono ${totalPnl >= 0 ? "text-buy" : "text-sell"}`}>
              {totalPnl >= 0 ? "+" : ""}{formatUsd(totalPnl)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Toplam Teminat</span>
            </div>
            <p className="text-lg font-bold font-mono text-foreground">{formatUsd(totalMargin)}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Kullanıcılar</span>
            </div>
            <p className="text-lg font-bold font-mono text-foreground">{uniqueUsers}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-buy" />
              <TrendingDown className="h-4 w-4 text-sell" />
            </div>
            <p className="text-lg font-bold font-mono text-foreground">
              <span className="text-buy">{buyCount}</span>
              <span className="text-muted-foreground mx-1">/</span>
              <span className="text-sell">{sellCount}</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Kullanıcı adı, Meta ID veya sembol ara..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 bg-muted/50"
        />
      </div>

      {/* Grouped positions by user */}
      <div className="space-y-2">
        {filteredUserIds.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">
            {orders.length === 0 ? "Açık pozisyon bulunmuyor." : "Sonuç bulunamadı."}
          </p>
        )}

        {filteredUserIds.map(userId => {
          const userOrders = groupedOrders.get(userId) || [];
          const userPnl = userOrders.reduce((s, o) => s + o.pnl, 0);
          const userMargin = userOrders.reduce((s, o) => {
            const lev = parseInt(o.leverage.split(":")[1]) || 200;
            return s + calculateMargin(o.symbol_name, o.lots, o.entry_price, lev);
          }, 0);
          const profile = profiles.get(userId);
          const isExpanded = expandedUsers.has(userId);

          return (
            <Card key={userId} className="bg-card border-border overflow-hidden">
              {/* User header - clickable */}
              <button
                onClick={() => toggleUser(userId)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{getUserLabel(userId)}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      Meta #{profile?.meta_id || "—"} • Bakiye: {formatUsd(profile?.balance || 0)} USD
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <p className={`text-sm font-bold font-mono ${userPnl >= 0 ? "text-buy" : "text-sell"}`}>
                      {userPnl >= 0 ? "+" : ""}{formatUsd(userPnl)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{userOrders.length} pozisyon</p>
                  </div>
                </div>
              </button>

              {/* Expanded: show positions */}
              {isExpanded && (
                <div className="border-t border-border">
                  {/* User summary row */}
                  <div className="px-4 py-2 bg-muted/20 flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                    <span>Toplam Teminat: <span className="font-mono text-foreground">{formatUsd(userMargin)} USD</span></span>
                    <span>Toplam K/Z: <span className={`font-mono font-semibold ${userPnl >= 0 ? "text-buy" : "text-sell"}`}>{userPnl >= 0 ? "+" : ""}{formatUsd(userPnl)} USD</span></span>
                  </div>

                  {/* Individual positions */}
                  <div className="divide-y divide-border">
                    {userOrders.map(order => {
                      const leverageNum = parseInt(order.leverage.split(":")[1]) || 200;
                      const margin = calculateMargin(order.symbol_name, order.lots, order.entry_price, leverageNum);
                      const pnlPercent = margin > 0 ? (order.pnl / margin) * 100 : 0;

                      return (
                        <div key={order.id} className="px-4 py-3 hover:bg-muted/10 transition-colors">
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1 min-w-0 flex-1">
                              {/* Symbol + type + lot */}
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-semibold">{order.symbol_name}</span>
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${order.type === "buy" ? "bg-buy/15 text-buy" : "bg-sell/15 text-sell"}`}>
                                  {order.type === "buy" ? "ALIŞ" : "SATIŞ"}
                                </span>
                                <span className="text-xs text-muted-foreground font-mono">{order.lots} lot</span>
                                <span className="text-xs text-muted-foreground">• {order.leverage}</span>
                              </div>

                              {/* Prices */}
                              <div className="flex items-center gap-3 text-xs font-mono">
                                <span className="text-muted-foreground">Giriş: <span className="text-foreground">{formatUsd(order.entry_price)}</span></span>
                                <span className="text-muted-foreground">Güncel: <span className="text-foreground">{formatUsd(order.current_price)}</span></span>
                              </div>

                              {/* SL/TP + Margin + Date */}
                              <div className="flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatDate(order.created_at)}
                                </span>
                                <span>Teminat: <span className="font-mono text-foreground">{formatUsd(margin)}</span></span>
                                {order.stop_loss && <span>SL: <span className="font-mono text-sell">{formatUsd(order.stop_loss)}</span></span>}
                                {order.take_profit && <span>TP: <span className="font-mono text-buy">{formatUsd(order.take_profit)}</span></span>}
                              </div>
                            </div>

                            {/* PnL + close button */}
                            <div className="flex items-center gap-2 shrink-0">
                              <div className="text-right">
                                <p className={`text-sm font-bold font-mono ${order.pnl >= 0 ? "text-buy" : "text-sell"}`}>
                                  {order.pnl >= 0 ? "+" : ""}{formatUsd(order.pnl)}
                                </p>
                                <p className={`text-[10px] font-mono ${pnlPercent >= 0 ? "text-buy" : "text-sell"}`}>
                                  {pnlPercent >= 0 ? "+" : ""}{pnlPercent.toFixed(1)}%
                                </p>
                              </div>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-sell hover:bg-sell/10"
                                onClick={(e) => { e.stopPropagation(); setClosingOrder(order); }}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Close dialog */}
      <AlertDialog open={!!closingOrder} onOpenChange={(open) => !open && setClosingOrder(null)}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Pozisyonu Kapat</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>Bu pozisyonu kapatmak istediğinize emin misiniz?</p>
                {closingOrder && (
                  <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Kullanıcı</span>
                      <span className="font-semibold">{getUserLabel(closingOrder.user_id)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sembol</span>
                      <span className="font-semibold">{closingOrder.symbol_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Yön / Lot</span>
                      <span className={`font-medium ${closingOrder.type === "buy" ? "text-buy" : "text-sell"}`}>
                        {closingOrder.type === "buy" ? "ALIŞ" : "SATIŞ"} {closingOrder.lots}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Giriş → Güncel</span>
                      <span className="font-mono">{formatUsd(closingOrder.entry_price)} → {formatUsd(closingOrder.current_price)}</span>
                    </div>
                    <div className="flex justify-between border-t border-border pt-1 mt-1">
                      <span className="text-muted-foreground font-medium">K/Z</span>
                      <span className={`font-mono font-bold ${closingOrder.pnl >= 0 ? "text-buy" : "text-sell"}`}>
                        {closingOrder.pnl >= 0 ? "+" : ""}{formatUsd(closingOrder.pnl)} USD
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={() => closingOrder && closePosition(closingOrder)} className="bg-sell hover:bg-sell/90 text-sell-foreground">
              Pozisyonu Kapat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminPositions;
