import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  RefreshCw, Search, ShieldAlert, AlertTriangle, TrendingUp,
  TrendingDown, Users, DollarSign, BarChart3, Activity, Zap,
  ArrowUpRight, ArrowDownRight, Eye,
} from "lucide-react";
import { calculatePnl, calculateMargin } from "@/lib/trading";

interface OrderRow {
  id: string;
  user_id: string;
  symbol_name: string;
  type: string;
  lots: number;
  entry_price: number;
  current_price: number;
  pnl: number;
  leverage: string;
  stop_loss: number | null;
  take_profit: number | null;
  symbol_id: string;
  swap: number;
}

interface UserProfile {
  user_id: string;
  full_name: string | null;
  balance: number;
  credit: number;
  meta_id: number;
}

const AdminRisk = () => {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [profiles, setProfiles] = useState<Map<string, UserProfile>>(new Map());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadAll();

    // Realtime subscriptions instead of polling
    const ordersChannel = supabase
      .channel('admin-risk-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => loadAll())
      .subscribe();

    const symbolsChannel = supabase
      .channel('admin-risk-symbols')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'symbols' }, () => loadAll())
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(symbolsChannel);
    };
  }, []);

  const loadAll = async () => {
    const [ordersRes, profilesRes] = await Promise.all([
      supabase.from("orders").select("*").eq("status", "open").order("created_at", { ascending: false }),
      supabase.from("profiles").select("user_id, full_name, balance, credit, meta_id"),
    ]);

    if (ordersRes.data) {
      const symbolIds = [...new Set(ordersRes.data.map((o: any) => o.symbol_id))];
      const { data: symbolsData } = await supabase.from("symbols").select("id, current_price").in("id", symbolIds);
      const priceMap = new Map((symbolsData ?? []).map((s: any) => [s.id, Number(s.current_price)]));

      setOrders(ordersRes.data.map((o: any) => {
        const cp = priceMap.get(o.symbol_id) || Number(o.current_price);
        const pnl = calculatePnl(o.symbol_name, o.type as "buy" | "sell", Number(o.lots), Number(o.entry_price), cp);
        return { ...o, lots: Number(o.lots), entry_price: Number(o.entry_price), current_price: cp, pnl, swap: Number(o.swap || 0) };
      }));
    }

    if (profilesRes.data) {
      const map = new Map<string, UserProfile>();
      profilesRes.data.forEach((p: any) => map.set(p.user_id, { ...p, credit: Number(p.credit || 0) }));
      setProfiles(map);
    }

    setLoading(false);
  };

  // ---- Aggregated Risk Metrics ----
  const totalExposure = orders.reduce((s, o) => s + Math.abs(o.lots * o.entry_price), 0);
  const totalMargin = orders.reduce((s, o) => s + calculateMargin(o.symbol_name, o.lots, o.entry_price, 200), 0);
  const totalPnl = orders.reduce((s, o) => s + o.pnl, 0);
  const totalSwap = orders.reduce((s, o) => s + o.swap, 0);
  const unprotectedOrders = orders.filter(o => !o.stop_loss && !o.take_profit);
  const noSlOrders = orders.filter(o => !o.stop_loss);

  // Per-user risk analysis
  const userRisk = useMemo(() => {
    const grouped = new Map<string, OrderRow[]>();
    orders.forEach(o => {
      const list = grouped.get(o.user_id) || [];
      list.push(o);
      grouped.set(o.user_id, list);
    });

    return [...grouped.entries()].map(([userId, userOrders]) => {
      const profile = profiles.get(userId);
      const userPnl = userOrders.reduce((s, o) => s + o.pnl, 0);
      const userMargin = userOrders.reduce((s, o) => s + calculateMargin(o.symbol_name, o.lots, o.entry_price, 200), 0);
      const userSwap = userOrders.reduce((s, o) => s + o.swap, 0);
      const equity = (profile?.balance || 0) + (profile?.credit || 0) + userPnl;
      const marginLevel = userMargin > 0 ? (equity / userMargin) * 100 : Infinity;
      const freeMargin = equity - userMargin;
      const noSlCount = userOrders.filter(o => !o.stop_loss).length;
      const maxLoss = userOrders.reduce((worst, o) => Math.min(worst, o.pnl), 0);

      return {
        userId,
        profile,
        orders: userOrders,
        pnl: userPnl,
        margin: userMargin,
        swap: userSwap,
        equity,
        marginLevel,
        freeMargin,
        noSlCount,
        maxLoss,
        riskScore: marginLevel === Infinity ? 0 : marginLevel < 50 ? 3 : marginLevel < 100 ? 2 : marginLevel < 200 ? 1 : 0,
      };
    }).sort((a, b) => b.riskScore - a.riskScore || a.marginLevel - b.marginLevel);
  }, [orders, profiles]);

  const criticalUsers = userRisk.filter(u => u.riskScore >= 2);
  const warningUsers = userRisk.filter(u => u.riskScore === 1);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return userRisk;
    return userRisk.filter(u => {
      const name = u.profile?.full_name?.toLowerCase() || "";
      const meta = u.profile?.meta_id?.toString() || "";
      return name.includes(q) || meta.includes(q) || u.userId.includes(q);
    });
  }, [userRisk, searchQuery]);

  // Symbol concentration
  const symbolConcentration = useMemo(() => {
    const map = new Map<string, { count: number; margin: number; pnl: number; buyLots: number; sellLots: number }>();
    orders.forEach(o => {
      const e = map.get(o.symbol_name) || { count: 0, margin: 0, pnl: 0, buyLots: 0, sellLots: 0 };
      e.count++;
      e.margin += calculateMargin(o.symbol_name, o.lots, o.entry_price, 200);
      e.pnl += o.pnl;
      if (o.type === "buy") e.buyLots += o.lots; else e.sellLots += o.lots;
      map.set(o.symbol_name, e);
    });
    return [...map.entries()].sort((a, b) => b[1].margin - a[1].margin);
  }, [orders]);

  const formatUsd = (v: number) => v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const getUserLabel = (userId: string) => {
    const p = profiles.get(userId);
    return p?.full_name || `#${p?.meta_id || userId.slice(0, 8)}`;
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
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-primary" />
            Risk Yönetimi
          </h2>
          <p className="text-sm text-muted-foreground">{orders.length} açık pozisyon • {userRisk.length} kullanıcı • Canlı izleme</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="h-2 w-2 rounded-full bg-buy animate-pulse" />
            <span>Canlı</span>
          </div>
          <Button variant="outline" size="sm" onClick={loadAll} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Yenile
          </Button>
        </div>
      </div>

      {/* Alert Banner */}
      {criticalUsers.length > 0 && (
        <div className="bg-sell/10 border border-sell/30 rounded-xl p-3 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-sell shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-sell">{criticalUsers.length} kullanıcı kritik teminat seviyesinde!</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {criticalUsers.map(u => `${getUserLabel(u.userId)} (%${u.marginLevel.toFixed(0)})`).join(", ")}
            </p>
          </div>
        </div>
      )}

      {/* Top-level Risk Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-card border-border">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1 rounded bg-primary/10"><DollarSign className="h-3.5 w-3.5 text-primary" /></div>
              <span className="text-xs text-muted-foreground">Toplam Teminat</span>
            </div>
            <p className="text-lg font-bold font-mono">{formatUsd(totalMargin)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Maruziyet: {formatUsd(totalExposure)}</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <div className={`p-1 rounded ${totalPnl >= 0 ? "bg-buy/10" : "bg-sell/10"}`}>
                {totalPnl >= 0 ? <TrendingUp className="h-3.5 w-3.5 text-buy" /> : <TrendingDown className="h-3.5 w-3.5 text-sell" />}
              </div>
              <span className="text-xs text-muted-foreground">Toplam K/Z</span>
            </div>
            <p className={`text-lg font-bold font-mono ${totalPnl >= 0 ? "text-buy" : "text-sell"}`}>
              {totalPnl >= 0 ? "+" : ""}{formatUsd(totalPnl)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Swap: <span className={`font-mono ${totalSwap >= 0 ? "text-buy" : "text-sell"}`}>{formatUsd(totalSwap)}</span>
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1 rounded bg-sell/10"><AlertTriangle className="h-3.5 w-3.5 text-sell" /></div>
              <span className="text-xs text-muted-foreground">Korumasız Pozisyon</span>
            </div>
            <p className="text-lg font-bold font-mono text-sell">{noSlOrders.length}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Toplam: {unprotectedOrders.length} SL+TP yok
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1 rounded bg-primary/10"><Users className="h-3.5 w-3.5 text-primary" /></div>
              <span className="text-xs text-muted-foreground">Risk Dağılımı</span>
            </div>
            <div className="flex items-center gap-2 text-sm font-bold font-mono">
              <span className="text-sell">{criticalUsers.length}</span>
              <span className="text-muted-foreground text-xs">/</span>
              <span className="text-yellow-500">{warningUsers.length}</span>
              <span className="text-muted-foreground text-xs">/</span>
              <span className="text-buy">{userRisk.length - criticalUsers.length - warningUsers.length}</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Kritik / Uyarı / Normal</p>
          </CardContent>
        </Card>
      </div>

      {/* Symbol Concentration */}
      {symbolConcentration.length > 0 && (
        <Card className="bg-card border-border">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Sembol Konsantrasyonu</span>
            </div>
            <div className="space-y-2">
              {symbolConcentration.slice(0, 8).map(([symbol, stats]) => {
                const pct = totalMargin > 0 ? (stats.margin / totalMargin) * 100 : 0;
                return (
                  <div key={symbol} className="flex items-center gap-3">
                    <span className="text-xs font-semibold w-16 shrink-0">{symbol}</span>
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-primary/60 transition-all" style={{ width: `${Math.min(100, pct)}%` }} />
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground w-10 text-right shrink-0">%{pct.toFixed(0)}</span>
                    <span className={`text-[10px] font-mono w-20 text-right shrink-0 ${stats.pnl >= 0 ? "text-buy" : "text-sell"}`}>
                      {stats.pnl >= 0 ? "+" : ""}{formatUsd(stats.pnl)}
                    </span>
                    <div className="flex items-center gap-1 text-[9px] w-16 shrink-0">
                      <span className="text-buy">{stats.buyLots.toFixed(2)}A</span>
                      <span className="text-sell">{stats.sellLots.toFixed(2)}S</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Kullanıcı adı veya Meta ID ara..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 bg-muted/50" />
      </div>

      {/* User Risk Table */}
      <div className="space-y-2">
        {filteredUsers.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">Açık pozisyon bulunamadı.</p>
        )}

        {filteredUsers.map(user => {
          const riskColor = user.riskScore >= 3 ? "border-sell/50 bg-sell/5" :
            user.riskScore >= 2 ? "border-sell/30 bg-sell/5" :
            user.riskScore >= 1 ? "border-yellow-500/30 bg-yellow-500/5" : "border-border";

          return (
            <Card key={user.userId} className={`overflow-hidden ${riskColor}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{getUserLabel(user.userId)}</p>
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">#{user.profile?.meta_id || "—"}</Badge>
                      {user.riskScore >= 2 && (
                        <Badge className="text-[9px] px-1.5 py-0 h-4 bg-sell/15 text-sell border-0">
                          <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                          {user.riskScore >= 3 ? "KRİTİK" : "YÜKSEK RİSK"}
                        </Badge>
                      )}
                      {user.riskScore === 1 && (
                        <Badge className="text-[9px] px-1.5 py-0 h-4 bg-yellow-500/15 text-yellow-600 border-0">UYARI</Badge>
                      )}
                    </div>

                    {/* Stats grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1 mt-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Bakiye:</span>
                        <span className="font-mono ml-1">{formatUsd(user.profile?.balance || 0)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Varlık:</span>
                        <span className={`font-mono ml-1 ${user.equity < (user.profile?.balance || 0) ? "text-sell" : "text-foreground"}`}>{formatUsd(user.equity)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Teminat:</span>
                        <span className="font-mono ml-1">{formatUsd(user.margin)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">S. Teminat:</span>
                        <span className={`font-mono ml-1 ${user.freeMargin < 0 ? "text-sell" : "text-foreground"}`}>{formatUsd(user.freeMargin)}</span>
                      </div>
                    </div>

                    {/* Margin level bar */}
                    {user.margin > 0 && user.marginLevel !== Infinity && (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[9px] text-muted-foreground w-14 shrink-0">Teminat %</span>
                        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${user.marginLevel > 200 ? "bg-buy" : user.marginLevel > 100 ? "bg-yellow-500" : "bg-sell"}`}
                            style={{ width: `${Math.min(100, (user.marginLevel / 500) * 100)}%` }}
                          />
                        </div>
                        <span className={`text-[10px] font-mono font-bold w-12 text-right ${user.marginLevel > 200 ? "text-buy" : user.marginLevel > 100 ? "text-yellow-500" : "text-sell"}`}>
                          %{user.marginLevel.toFixed(0)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Right side summary */}
                  <div className="text-right shrink-0 space-y-1">
                    <p className={`text-base font-bold font-mono ${user.pnl >= 0 ? "text-buy" : "text-sell"}`}>
                      {user.pnl >= 0 ? "+" : ""}{formatUsd(user.pnl)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{user.orders.length} pozisyon</p>
                    {user.noSlCount > 0 && (
                      <p className="text-[10px] text-sell font-medium">{user.noSlCount} SL yok</p>
                    )}
                    {user.swap !== 0 && (
                      <p className="text-[10px] text-muted-foreground font-mono">
                        Swap: <span className={user.swap >= 0 ? "text-buy" : "text-sell"}>{formatUsd(user.swap)}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Individual positions summary */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {user.orders.map(o => (
                    <div key={o.id} className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono ${
                      o.pnl >= 0 ? "bg-buy/10 text-buy" : "bg-sell/10 text-sell"
                    }`}>
                      <span className="font-semibold">{o.symbol_name}</span>
                      <span>{o.type === "buy" ? "↑" : "↓"}{o.lots}</span>
                      <span>{o.pnl >= 0 ? "+" : ""}{formatUsd(o.pnl)}</span>
                      {!o.stop_loss && <ShieldAlert className="h-2.5 w-2.5 text-sell" />}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default AdminRisk;
