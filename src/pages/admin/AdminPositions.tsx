import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  X, RefreshCw, Search, ChevronDown, ChevronRight,
  TrendingUp, TrendingDown, Users, BarChart3, DollarSign,
  Clock, Shield, Target, ShieldAlert, Wallet, Activity,
  ArrowUpRight, ArrowDownRight, Percent, Pencil,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { calculatePnl, calculateMargin, calculateCommission } from "@/lib/trading";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
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
  credit: number;
  meta_id: number;
}

const AdminPositions = () => {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [profiles, setProfiles] = useState<Map<string, UserProfile>>(new Map());
  const [closingOrder, setClosingOrder] = useState<OrderRow | null>(null);
  const [editingOrder, setEditingOrder] = useState<OrderRow | null>(null);
  const [editEntry, setEditEntry] = useState("");
  const [editSL, setEditSL] = useState("");
  const [editTP, setEditTP] = useState("");
  const [editLots, setEditLots] = useState("");
  const [editSaving, setEditSaving] = useState(false);
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

      if (error) { console.error("loadOrders error:", error); return; }
      if (!data || data.length === 0) { setOrders([]); return; }

      const symbolIds = [...new Set(data.map((o) => o.symbol_id).filter(Boolean))];
      const { data: symbolsData } = await supabase
        .from("symbols")
        .select("id, current_price")
        .in("id", symbolIds);

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
      const { data, error } = await supabase.from("profiles").select("user_id, full_name, balance, credit, meta_id");
      if (error) { console.error("loadProfiles error:", error); return; }
      if (data) {
        const map = new Map<string, UserProfile>();
        data.forEach((p) => map.set(p.user_id, { ...p, credit: Number(p.credit || 0) }));
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

  const groupedOrders = useMemo(() => {
    const groups = new Map<string, OrderRow[]>();
    orders.forEach(o => {
      const list = groups.get(o.user_id) || [];
      list.push(o);
      groups.set(o.user_id, list);
    });
    return groups;
  }, [orders]);

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
    return sum + calculateMargin(o.symbol_name, o.lots, o.entry_price, 200);
  }, 0);
  const uniqueUsers = new Set(orders.map(o => o.user_id)).size;
  const buyCount = orders.filter(o => o.type === "buy").length;
  const sellCount = orders.filter(o => o.type === "sell").length;
  const profitableOrders = orders.filter(o => o.pnl > 0).length;
  const losingOrders = orders.filter(o => o.pnl < 0).length;
  const winRate = orders.length > 0 ? (profitableOrders / orders.length) * 100 : 0;
  const totalVolume = orders.reduce((sum, o) => sum + (o.lots * o.entry_price), 0);

  // Top symbols
  const symbolStats = useMemo(() => {
    const stats = new Map<string, { count: number; pnl: number }>();
    orders.forEach(o => {
      const existing = stats.get(o.symbol_name) || { count: 0, pnl: 0 };
      stats.set(o.symbol_name, { count: existing.count + 1, pnl: existing.pnl + o.pnl });
    });
    return [...stats.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5);
  }, [orders]);

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
      const profile = profiles.get(order.user_id);
      if (profile) {
        const newBalance = Math.max(0, profile.balance + netPnl);
        await supabase.from("profiles").update({ balance: newBalance, equity: newBalance, free_margin: newBalance }).eq("user_id", order.user_id);
      }
      toast.success(`${order.symbol_name} pozisyon kapatıldı (K/Z: ${formatUsd(netPnl)})`);
      setClosingOrder(null);
      loadOrders();
    }
  };

  const openEditDialog = (order: OrderRow) => {
    setEditingOrder(order);
    setEditEntry(String(order.entry_price));
    setEditSL(order.stop_loss ? String(order.stop_loss) : "");
    setEditTP(order.take_profit ? String(order.take_profit) : "");
    setEditLots(String(order.lots));
  };

  const handleSaveEdit = async () => {
    if (!editingOrder) return;
    setEditSaving(true);
    const updates: any = {
      entry_price: parseFloat(editEntry) || editingOrder.entry_price,
      stop_loss: editSL ? parseFloat(editSL) : null,
      take_profit: editTP ? parseFloat(editTP) : null,
      lots: parseFloat(editLots) || editingOrder.lots,
    };
    const { error } = await supabase.from("orders").update(updates).eq("id", editingOrder.id);
    if (error) {
      toast.error("Güncelleme başarısız: " + error.message);
    } else {
      toast.success(`${editingOrder.symbol_name} pozisyon güncellendi`);
      setEditingOrder(null);
      loadOrders();
    }
    setEditSaving(false);
  };

  const formatUsd = (v: number) => v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formatDate = (d: string) => new Date(d).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  const formatTimeSince = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    if (hours > 24) return `${Math.floor(hours / 24)}g ${hours % 24}s`;
    if (hours > 0) return `${hours}s ${mins}d`;
    return `${mins}d`;
  };

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
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold">Açık Pozisyonlar</h2>
          <p className="text-sm text-muted-foreground">{orders.length} pozisyon • {uniqueUsers} kullanıcı • Canlı güncelleme</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="h-2 w-2 rounded-full bg-buy animate-pulse" />
            <span>Canlı</span>
          </div>
          <Button variant="outline" size="sm" onClick={loadAll} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            Yenile
          </Button>
        </div>
      </div>

      {/* Summary Cards - Enhanced */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-card border-border relative overflow-hidden">
          <div className={`absolute inset-0 opacity-5 ${totalPnl >= 0 ? "bg-buy" : "bg-sell"}`} />
          <CardContent className="p-3 relative">
            <div className="flex items-center gap-2 mb-1">
              <div className={`p-1 rounded ${totalPnl >= 0 ? "bg-buy/10" : "bg-sell/10"}`}>
                <DollarSign className={`h-3.5 w-3.5 ${totalPnl >= 0 ? "text-buy" : "text-sell"}`} />
              </div>
              <span className="text-xs text-muted-foreground">Toplam K/Z</span>
            </div>
            <p className={`text-lg font-bold font-mono ${totalPnl >= 0 ? "text-buy" : "text-sell"}`}>
              {totalPnl >= 0 ? "+" : ""}{formatUsd(totalPnl)}
            </p>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-[10px] text-muted-foreground">
                Kârda: <span className="text-buy font-medium">{profitableOrders}</span> • Zararda: <span className="text-sell font-medium">{losingOrders}</span>
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1 rounded bg-primary/10">
                <BarChart3 className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="text-xs text-muted-foreground">Toplam Teminat</span>
            </div>
            <p className="text-lg font-bold font-mono text-foreground">{formatUsd(totalMargin)}</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              Hacim: <span className="font-mono text-foreground">{formatUsd(totalVolume)}</span>
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1 rounded bg-primary/10">
                <Users className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="text-xs text-muted-foreground">Kullanıcılar</span>
            </div>
            <p className="text-lg font-bold font-mono text-foreground">{uniqueUsers}</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              Ort. {uniqueUsers > 0 ? (orders.length / uniqueUsers).toFixed(1) : 0} pozisyon/kişi
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="flex items-center gap-1">
                <div className="p-1 rounded bg-buy/10">
                  <TrendingUp className="h-3 w-3 text-buy" />
                </div>
                <div className="p-1 rounded bg-sell/10">
                  <TrendingDown className="h-3 w-3 text-sell" />
                </div>
              </div>
              <span className="text-xs text-muted-foreground">Alış / Satış</span>
            </div>
            <p className="text-lg font-bold font-mono text-foreground">
              <span className="text-buy">{buyCount}</span>
              <span className="text-muted-foreground mx-1">/</span>
              <span className="text-sell">{sellCount}</span>
            </p>
            {orders.length > 0 && (
              <div className="mt-1.5">
                <div className="flex h-1.5 rounded-full overflow-hidden bg-muted">
                  <div className="bg-buy transition-all" style={{ width: `${(buyCount / orders.length) * 100}%` }} />
                  <div className="bg-sell transition-all" style={{ width: `${(sellCount / orders.length) * 100}%` }} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Symbols Bar */}
      {symbolStats.length > 0 && (
        <Card className="bg-card border-border">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2.5">
              <Activity className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">En Aktif Semboller</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {symbolStats.map(([symbol, stats]) => (
                <div key={symbol} className="flex items-center gap-2 bg-muted/40 rounded-lg px-3 py-1.5">
                  <span className="text-xs font-semibold">{symbol}</span>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                    {stats.count}
                  </Badge>
                  <span className={`text-[10px] font-mono font-medium ${stats.pnl >= 0 ? "text-buy" : "text-sell"}`}>
                    {stats.pnl >= 0 ? "+" : ""}{formatUsd(stats.pnl)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
            return s + calculateMargin(o.symbol_name, o.lots, o.entry_price, 200);
          }, 0);
          const profile = profiles.get(userId);
          const isExpanded = expandedUsers.has(userId);
          const userEquity = (profile?.balance || 0) + (profile?.credit || 0) + userPnl;
          const marginLevel = userMargin > 0 ? (userEquity / userMargin) * 100 : 0;
          const userBuys = userOrders.filter(o => o.type === "buy").length;
          const userSells = userOrders.filter(o => o.type === "sell").length;

          return (
            <Card key={userId} className="bg-card border-border overflow-hidden">
              {/* User header */}
              <button
                onClick={() => toggleUser(userId)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold truncate">{getUserLabel(userId)}</p>
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 shrink-0">
                        #{profile?.meta_id || "—"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-muted-foreground font-mono">
                        Bakiye: {formatUsd(profile?.balance || 0)}
                      </span>
                      <span className="text-[10px] text-muted-foreground">•</span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        Varlık: <span className={userEquity >= (profile?.balance || 0) ? "text-buy" : "text-sell"}>{formatUsd(userEquity)}</span>
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <p className={`text-sm font-bold font-mono ${userPnl >= 0 ? "text-buy" : "text-sell"}`}>
                      {userPnl >= 0 ? "+" : ""}{formatUsd(userPnl)}
                    </p>
                    <div className="flex items-center justify-end gap-1.5 mt-0.5">
                      <span className="text-[10px] text-muted-foreground">{userOrders.length} poz.</span>
                      <span className="text-[9px] text-buy">{userBuys}A</span>
                      <span className="text-[9px] text-sell">{userSells}S</span>
                    </div>
                  </div>
                </div>
              </button>

              {/* Expanded */}
              {isExpanded && (
                <div className="border-t border-border">
                  {/* User financial summary */}
                  <div className="px-4 py-3 bg-muted/20 space-y-2">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <p className="text-[10px] text-muted-foreground">Toplam Teminat</p>
                        <p className="text-xs font-mono font-semibold">{formatUsd(userMargin)} USD</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Serbest Teminat</p>
                        <p className="text-xs font-mono font-semibold">{formatUsd(Math.max(0, userEquity - userMargin))} USD</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Teminat Seviyesi</p>
                        <p className={`text-xs font-mono font-semibold ${marginLevel > 150 ? "text-buy" : marginLevel > 100 ? "text-yellow-500" : "text-sell"}`}>
                          {marginLevel > 0 ? `%${marginLevel.toFixed(0)}` : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Toplam K/Z</p>
                        <p className={`text-xs font-mono font-semibold ${userPnl >= 0 ? "text-buy" : "text-sell"}`}>
                          {userPnl >= 0 ? "+" : ""}{formatUsd(userPnl)} USD
                        </p>
                      </div>
                    </div>
                    {/* Margin level progress bar */}
                    {userMargin > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] text-muted-foreground whitespace-nowrap">Teminat</span>
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-muted">
                          <div
                            className={`h-full rounded-full transition-all ${marginLevel > 150 ? "bg-buy" : marginLevel > 100 ? "bg-yellow-500" : "bg-sell"}`}
                            style={{ width: `${Math.min(100, (marginLevel / 300) * 100)}%` }}
                          />
                        </div>
                        <span className={`text-[9px] font-mono font-medium ${marginLevel > 150 ? "text-buy" : marginLevel > 100 ? "text-yellow-500" : "text-sell"}`}>
                          %{marginLevel.toFixed(0)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Individual positions */}
                  <div className="divide-y divide-border">
                    {userOrders.map(order => {
                      const margin = calculateMargin(order.symbol_name, order.lots, order.entry_price, 200);
                      const pnlPercent = margin > 0 ? (order.pnl / margin) * 100 : 0;
                      const priceDiff = order.current_price - order.entry_price;
                      const priceDiffPercent = order.entry_price > 0 ? (priceDiff / order.entry_price) * 100 : 0;
                      const timeSince = formatTimeSince(order.created_at);

                      return (
                        <div key={order.id} className="px-4 py-3 hover:bg-muted/10 transition-colors">
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1.5 min-w-0 flex-1">
                              {/* Symbol + type + lot + leverage */}
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-bold">{order.symbol_name}</span>
                                <Badge
                                  className={`text-[10px] px-1.5 py-0 h-4 border-0 ${
                                    order.type === "buy"
                                      ? "bg-buy/15 text-buy hover:bg-buy/20"
                                      : "bg-sell/15 text-sell hover:bg-sell/20"
                                  }`}
                                >
                                  {order.type === "buy" ? (
                                    <><ArrowUpRight className="h-2.5 w-2.5 mr-0.5" /> ALIŞ</>
                                  ) : (
                                    <><ArrowDownRight className="h-2.5 w-2.5 mr-0.5" /> SATIŞ</>
                                  )}
                                </Badge>
                                <span className="text-xs text-foreground font-mono font-medium">{order.lots} lot</span>
                                <span className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">{order.leverage}</span>
                              </div>

                              {/* Price comparison */}
                              <div className="flex items-center gap-2 text-xs font-mono">
                                <span className="text-muted-foreground">
                                  {formatUsd(order.entry_price)}
                                </span>
                                <span className="text-muted-foreground">→</span>
                                <span className="text-foreground font-medium">{formatUsd(order.current_price)}</span>
                                <span className={`text-[10px] ${priceDiffPercent >= 0 ? "text-buy" : "text-sell"}`}>
                                  ({priceDiffPercent >= 0 ? "+" : ""}{priceDiffPercent.toFixed(2)}%)
                                </span>
                              </div>

                              {/* Details row */}
                              <div className="flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatDate(order.created_at)}
                                  <span className="text-foreground/60">({timeSince})</span>
                                </span>
                                <span className="flex items-center gap-1">
                                  <Wallet className="h-3 w-3" />
                                  <span className="font-mono text-foreground">{formatUsd(margin)}</span>
                                </span>
                                {order.stop_loss && (
                                  <span className="flex items-center gap-1">
                                    <ShieldAlert className="h-3 w-3 text-sell" />
                                    <span className="font-mono text-sell">{formatUsd(order.stop_loss)}</span>
                                  </span>
                                )}
                                {order.take_profit && (
                                  <span className="flex items-center gap-1">
                                    <Target className="h-3 w-3 text-buy" />
                                    <span className="font-mono text-buy">{formatUsd(order.take_profit)}</span>
                                  </span>
                                )}
                                {!order.stop_loss && !order.take_profit && (
                                  <span className="text-yellow-500/80 italic">SL/TP yok</span>
                                )}
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
                                className="h-7 w-7 text-primary hover:bg-primary/10"
                                onClick={(e) => { e.stopPropagation(); openEditDialog(order); }}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
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
                {closingOrder && (() => {
                  const commission = calculateCommission(closingOrder.symbol_name, closingOrder.lots, closingOrder.current_price);
                  const netPnl = closingOrder.pnl - commission;
                  return (
                    <div className="bg-muted/50 rounded-lg p-3 space-y-1.5 text-sm">
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
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Brüt K/Z</span>
                        <span className={`font-mono ${closingOrder.pnl >= 0 ? "text-buy" : "text-sell"}`}>
                          {closingOrder.pnl >= 0 ? "+" : ""}{formatUsd(closingOrder.pnl)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Komisyon</span>
                        <span className="font-mono text-sell">-{formatUsd(commission)}</span>
                      </div>
                      <div className="flex justify-between border-t border-border pt-1.5 mt-1">
                        <span className="text-muted-foreground font-semibold">Net K/Z</span>
                        <span className={`font-mono font-bold ${netPnl >= 0 ? "text-buy" : "text-sell"}`}>
                          {netPnl >= 0 ? "+" : ""}{formatUsd(netPnl)} USD
                        </span>
                      </div>
                    </div>
                  );
                })()}
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

      {/* Edit Position Dialog */}
      <Dialog open={!!editingOrder} onOpenChange={(open) => !open && setEditingOrder(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-4 w-4 text-primary" />
              Pozisyon Düzenle
            </DialogTitle>
          </DialogHeader>

          {editingOrder && (() => {
            const entryVal = parseFloat(editEntry) || editingOrder.entry_price;
            const lotsVal = parseFloat(editLots) || editingOrder.lots;
            const slVal = editSL ? parseFloat(editSL) : null;
            const tpVal = editTP ? parseFloat(editTP) : null;
            const currentPnl = calculatePnl(editingOrder.symbol_name, editingOrder.type as "buy" | "sell", lotsVal, entryVal, editingOrder.current_price);
            const margin = calculateMargin(editingOrder.symbol_name, lotsVal, entryVal, 200);

            // Calculate potential PnL at SL/TP
            const slPnl = slVal ? calculatePnl(editingOrder.symbol_name, editingOrder.type as "buy" | "sell", lotsVal, entryVal, slVal) : null;
            const tpPnl = tpVal ? calculatePnl(editingOrder.symbol_name, editingOrder.type as "buy" | "sell", lotsVal, entryVal, tpVal) : null;

            return (
              <div className="space-y-4">
                {/* Symbol info header */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">{editingOrder.symbol_name}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${editingOrder.type === "buy" ? "bg-buy/15 text-buy" : "bg-sell/15 text-sell"}`}>
                        {editingOrder.type === "buy" ? "ALIŞ" : "SATIŞ"}
                      </span>
                      <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{editingOrder.leverage}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Kullanıcı: <span className="text-foreground font-medium">{getUserLabel(editingOrder.user_id)}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Güncel Fiyat</p>
                    <p className="text-sm font-mono font-bold">{formatUsd(editingOrder.current_price)}</p>
                  </div>
                </div>

                {/* Edit fields */}
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-1.5">
                        <DollarSign className="h-3 w-3" /> Giriş Fiyatı
                      </label>
                      <Input
                        type="number"
                        step="any"
                        value={editEntry}
                        onChange={(e) => setEditEntry(e.target.value)}
                        className="font-mono h-9 bg-muted/50"
                      />
                    </div>
                    <div>
                      <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-1.5">
                        <BarChart3 className="h-3 w-3" /> Lot
                      </label>
                      <Input
                        type="number"
                        step="any"
                        value={editLots}
                        onChange={(e) => setEditLots(e.target.value)}
                        className="font-mono h-9 bg-muted/50"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-medium mb-1.5 text-sell">
                        <ShieldAlert className="h-3 w-3" /> Zarar Durdur
                      </label>
                      <Input
                        type="number"
                        step="any"
                        placeholder="Boş bırakılabilir"
                        value={editSL}
                        onChange={(e) => setEditSL(e.target.value)}
                        className="font-mono h-9 bg-muted/50"
                      />
                    </div>
                    <div>
                      <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-medium mb-1.5 text-buy">
                        <Target className="h-3 w-3" /> Kâr Al
                      </label>
                      <Input
                        type="number"
                        step="any"
                        placeholder="Boş bırakılabilir"
                        value={editTP}
                        onChange={(e) => setEditTP(e.target.value)}
                        className="font-mono h-9 bg-muted/50"
                      />
                    </div>
                  </div>
                </div>

                {/* Auto-calculated preview */}
                <div className="rounded-xl border border-border overflow-hidden">
                  <div className="px-3 py-2 bg-muted/30 border-b border-border">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Otomatik Hesaplama</span>
                  </div>
                  <div className="p-3 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Teminat</span>
                      <span className="font-mono font-medium">{formatUsd(margin)} USD</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Güncel K/Z</span>
                      <span className={`font-mono font-bold ${currentPnl >= 0 ? "text-buy" : "text-sell"}`}>
                        {currentPnl >= 0 ? "+" : ""}{formatUsd(currentPnl)} USD
                      </span>
                    </div>
                    {slPnl !== null && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <ShieldAlert className="h-3 w-3 text-sell" /> SL'de K/Z
                        </span>
                        <span className={`font-mono font-medium ${slPnl >= 0 ? "text-buy" : "text-sell"}`}>
                          {slPnl >= 0 ? "+" : ""}{formatUsd(slPnl)} USD
                        </span>
                      </div>
                    )}
                    {tpPnl !== null && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Target className="h-3 w-3 text-buy" /> TP'de K/Z
                        </span>
                        <span className={`font-mono font-medium ${tpPnl >= 0 ? "text-buy" : "text-sell"}`}>
                          {tpPnl >= 0 ? "+" : ""}{formatUsd(tpPnl)} USD
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <DialogFooter className="gap-2">
                  <Button variant="outline" onClick={() => setEditingOrder(null)}>İptal</Button>
                  <Button onClick={handleSaveEdit} disabled={editSaving}>
                    {editSaving ? "Kaydediliyor..." : "Kaydet"}
                  </Button>
                </DialogFooter>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPositions;
