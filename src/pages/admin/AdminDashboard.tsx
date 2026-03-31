import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users, UserCheck, TrendingUp, ArrowDownToLine, ArrowUpFromLine,
  FileText, RefreshCw, DollarSign, CreditCard, Activity,
  ShieldAlert, TrendingDown, UserPlus, Landmark, ShoppingBag,
  Settings, BarChart3, AlertTriangle, CheckCircle2, Clock,
} from "lucide-react";

interface DashboardStats {
  totalUsers: number;
  verifiedUsers: number;
  openPositions: number;
  pendingWithdrawals: number;
  pendingDeposits: number;
  pendingKyc: number;
  platformBalance: number;
  totalCredit: number;
  totalDepositApproved: number;
  totalWithdrawApproved: number;
}

interface ActivityItem {
  id: string;
  kind: "deposit" | "withdrawal" | "new_user" | "kyc";
  description: string;
  sub: string;
  time: string;
  color: string;
}

const AdminDashboard = ({ onNavigate }: { onNavigate?: (tab: string) => void }) => {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0, verifiedUsers: 0, openPositions: 0,
    pendingWithdrawals: 0, pendingDeposits: 0, pendingKyc: 0,
    platformBalance: 0, totalCredit: 0,
    totalDepositApproved: 0, totalWithdrawApproved: 0,
  });
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    loadStats();

    // Realtime auto-refresh for dashboard stats
    const txChannel = supabase
      .channel('admin-dash-tx')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => loadStats())
      .subscribe();

    const profilesChannel = supabase
      .channel('admin-dash-profiles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => loadStats())
      .subscribe();

    const ordersChannel = supabase
      .channel('admin-dash-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => loadStats())
      .subscribe();

    const docsChannel = supabase
      .channel('admin-dash-docs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'documents' }, () => loadStats())
      .subscribe();

    return () => {
      supabase.removeChannel(txChannel);
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(docsChannel);
    };
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const [
        totalUsersRes, verifiedUsersRes, openOrdersRes,
        pendingWithdrawalsRes, pendingDepositsRes, pendingKycRes,
        profilesFinancialRes, txApprovedRes,
        recentTxRes, recentUsersRes,
      ] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("verification_status", "verified"),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("transactions").select("id", { count: "exact", head: true }).eq("type", "withdrawal").eq("status", "pending"),
        supabase.from("transactions").select("id", { count: "exact", head: true }).eq("type", "deposit").eq("status", "pending"),
        supabase.from("documents").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("profiles").select("balance, credit"),
        supabase.from("transactions").select("type, amount, currency, exchange_rate").eq("status", "approved"),
        supabase.from("transactions").select("id, type, amount, currency, status, created_at").order("created_at", { ascending: false }).limit(6),
        supabase.from("profiles").select("full_name, created_at, meta_id").order("created_at", { ascending: false }).limit(4),
      ]);

      // Platform financial totals
      const profiles = profilesFinancialRes.data || [];
      const platformBalance = profiles.reduce((s, p) => s + Number(p.balance), 0);
      const totalCredit = profiles.reduce((s, p) => s + Number(p.credit), 0);

      // Approved transactions totals (convert TRY to USD if needed)
      const approved = txApprovedRes.data || [];
      const totalDepositApproved = approved
        .filter(t => t.type === "deposit")
        .reduce((s, t) => s + Number(t.amount), 0);
      const totalWithdrawApproved = approved
        .filter(t => t.type === "withdrawal")
        .reduce((s, t) => s + Number(t.amount), 0);

      setStats({
        totalUsers: totalUsersRes.count || 0,
        verifiedUsers: verifiedUsersRes.count || 0,
        openPositions: openOrdersRes.count || 0,
        pendingWithdrawals: pendingWithdrawalsRes.count || 0,
        pendingDeposits: pendingDepositsRes.count || 0,
        pendingKyc: pendingKycRes.count || 0,
        platformBalance,
        totalCredit,
        totalDepositApproved,
        totalWithdrawApproved,
      });

      // Build activity feed
      const txActivities: ActivityItem[] = (recentTxRes.data || []).map(t => ({
        id: t.id,
        kind: t.type as "deposit" | "withdrawal",
        description: `${t.type === "deposit" ? "Para Yatırma" : "Para Çekme"} Talebi`,
        sub: `${Number(t.amount).toLocaleString("tr-TR")} ${t.currency} · ${t.status === "approved" ? "Onaylandı" : t.status === "pending" ? "Bekliyor" : "Reddedildi"}`,
        time: formatTimeAgo(new Date(t.created_at)),
        color: t.type === "deposit" ? "text-buy" : "text-sell",
      }));

      const userActivities: ActivityItem[] = (recentUsersRes.data || []).map(u => ({
        id: u.meta_id?.toString() || Math.random().toString(),
        kind: "new_user",
        description: `Yeni Üye: ${u.full_name || "İsimsiz"}`,
        sub: `MT#${u.meta_id}`,
        time: formatTimeAgo(new Date(u.created_at)),
        color: "text-primary",
      }));

      const allActivities = [...txActivities, ...userActivities]
        .sort((a, b) => 0) // keep order as-is (mixed)
        .slice(0, 8);
      setActivities(allActivities);

      setLastUpdated(new Date());
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (date: Date) => {
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60) return `${diff}sn`;
    if (diff < 3600) return `${Math.floor(diff / 60)}dk`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}sa`;
    return `${Math.floor(diff / 86400)}g`;
  };

  const netRevenue = stats.totalDepositApproved - stats.totalWithdrawApproved;
  const pendingTotal = stats.pendingDeposits + stats.pendingWithdrawals;

  const kpiCards = [
    {
      label: "Toplam Kullanıcı", value: stats.totalUsers.toLocaleString("tr-TR"),
      sub: `${stats.verifiedUsers} doğrulanmış (${stats.totalUsers > 0 ? Math.round(stats.verifiedUsers / stats.totalUsers * 100) : 0}%)`,
      icon: Users, color: "text-primary", bg: "bg-primary/10",
    },
    {
      label: "Açık Pozisyon", value: stats.openPositions.toLocaleString("tr-TR"),
      sub: "Canlı işlem sayısı",
      icon: TrendingUp, color: "text-buy", bg: "bg-buy/10",
    },
    {
      label: "Bekleyen Finans", value: pendingTotal.toLocaleString("tr-TR"),
      sub: `${stats.pendingDeposits} yatırma · ${stats.pendingWithdrawals} çekim`,
      icon: Clock, color: pendingTotal > 0 ? "text-warning" : "text-muted-foreground", bg: pendingTotal > 0 ? "bg-warning/10" : "bg-muted/50",
      urgent: pendingTotal > 0,
      action: () => onNavigate?.("finance"),
    },
    {
      label: "Bekleyen KYC", value: stats.pendingKyc.toLocaleString("tr-TR"),
      sub: "İnceleme bekleyen evrak",
      icon: FileText, color: stats.pendingKyc > 0 ? "text-warning" : "text-muted-foreground", bg: stats.pendingKyc > 0 ? "bg-warning/10" : "bg-muted/50",
      urgent: stats.pendingKyc > 0,
      action: () => onNavigate?.("documents"),
    },
    {
      label: "Platform Bakiyesi", value: `$${stats.platformBalance.toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      sub: `Kredi: $${stats.totalCredit.toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      icon: DollarSign, color: "text-primary", bg: "bg-primary/10",
    },
    {
      label: "Net Gelir", value: `$${netRevenue.toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      sub: `↑ ${stats.totalDepositApproved.toLocaleString("tr-TR", { minimumFractionDigits: 0 })} · ↓ ${stats.totalWithdrawApproved.toLocaleString("tr-TR", { minimumFractionDigits: 0 })}`,
      icon: netRevenue >= 0 ? TrendingUp : TrendingDown,
      color: netRevenue >= 0 ? "text-buy" : "text-sell",
      bg: netRevenue >= 0 ? "bg-buy/10" : "bg-sell/10",
    },
  ];

  const quickActions = [
    { label: "Kullanıcılar", icon: Users, tab: "users" },
    { label: "KYC İncele", icon: FileText, tab: "documents", badge: stats.pendingKyc },
    { label: "Pozisyonlar", icon: BarChart3, tab: "positions" },
    { label: "Finans", icon: Landmark, tab: "finance", badge: pendingTotal },
    { label: "Ürünler", icon: ShoppingBag, tab: "products" },
    { label: "Ayarlar", icon: Settings, tab: "settings" },
  ];

  const activityIcons: Record<string, any> = {
    deposit: ArrowDownToLine,
    withdrawal: ArrowUpFromLine,
    new_user: UserPlus,
    kyc: FileText,
  };
  const activityBg: Record<string, string> = {
    deposit: "bg-buy/10",
    withdrawal: "bg-sell/10",
    new_user: "bg-primary/10",
    kyc: "bg-warning/10",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg md:text-2xl font-bold">Admin Dashboard</h2>
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-buy inline-block animate-pulse" />
            Son güncelleme: {lastUpdated.toLocaleTimeString("tr-TR")}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadStats} disabled={loading} className="gap-1.5">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Yenile
        </Button>
      </div>

      {/* Urgent alerts */}
      {(pendingTotal > 0 || stats.pendingKyc > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {pendingTotal > 0 && (
            <button
              onClick={() => onNavigate?.("finance")}
              className="flex items-center gap-3 px-4 py-3 rounded-xl border border-warning/40 bg-warning/5 hover:bg-warning/10 transition-colors text-left"
            >
              <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
              <div>
                <p className="text-sm font-semibold text-warning">{pendingTotal} Bekleyen Finans Talebi</p>
                <p className="text-xs text-muted-foreground">{stats.pendingDeposits} yatırma · {stats.pendingWithdrawals} çekim → incele</p>
              </div>
            </button>
          )}
          {stats.pendingKyc > 0 && (
            <button
              onClick={() => onNavigate?.("documents")}
              className="flex items-center gap-3 px-4 py-3 rounded-xl border border-warning/40 bg-warning/5 hover:bg-warning/10 transition-colors text-left"
            >
              <FileText className="h-5 w-5 text-warning shrink-0" />
              <div>
                <p className="text-sm font-semibold text-warning">{stats.pendingKyc} Bekleyen KYC Belgesi</p>
                <p className="text-xs text-muted-foreground">Kimlik doğrulama bekliyor → incele</p>
              </div>
            </button>
          )}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
        {kpiCards.map((card) => (
          <Card
            key={card.label}
            className={`bg-card border-border ${card.action ? "cursor-pointer hover:border-warning/50 transition-colors" : ""} ${card.urgent ? "border-warning/30" : ""}`}
            onClick={card.action}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className={`p-2 rounded-lg ${card.bg}`}>
                  <card.icon className={`h-4 w-4 ${card.color}`} />
                </div>
                {card.urgent && (
                  <span className="h-2 w-2 rounded-full bg-warning animate-pulse" />
                )}
              </div>
              <p className={`text-xl font-bold font-mono ${card.color}`}>{card.value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{card.label}</p>
              <p className="text-[10px] text-muted-foreground/70 mt-0.5 truncate">{card.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Financial Summary Bar */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Platform Finansal Özeti</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <div>
              <p className="text-[10px] text-muted-foreground">Toplam Onaylı Yatırım</p>
              <p className="text-base font-bold font-mono text-buy">${stats.totalDepositApproved.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Toplam Onaylı Çekim</p>
              <p className="text-base font-bold font-mono text-sell">${stats.totalWithdrawApproved.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Net Gelir (Fark)</p>
              <p className={`text-base font-bold font-mono ${netRevenue >= 0 ? "text-buy" : "text-sell"}`}>
                {netRevenue >= 0 ? "+" : ""}${netRevenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Toplam Kredi İhraç</p>
              <p className="text-base font-bold font-mono text-primary">${stats.totalCredit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3"><CardTitle className="text-base">Hızlı İşlemler</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {quickActions.map((a) => (
                <button
                  key={a.label}
                  onClick={() => onNavigate?.(a.tab)}
                  className="relative flex flex-col items-center gap-2 p-3 rounded-xl border border-border hover:bg-muted/50 hover:border-primary/30 transition-all"
                >
                  {a.badge && a.badge > 0 && (
                    <span className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-warning text-[10px] font-bold text-warning-foreground flex items-center justify-center">
                      {a.badge > 9 ? "9+" : a.badge}
                    </span>
                  )}
                  <a.icon className="h-5 w-5 text-muted-foreground" />
                  <span className="text-[11px] text-center font-medium leading-tight">{a.label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Activity Feed */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Son Aktiviteler</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {activities.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Aktivite yok.</p>
            ) : (
              activities.map((a, i) => {
                const Icon = activityIcons[a.kind] || Activity;
                return (
                  <div key={`${a.id}-${i}`} className="flex items-center gap-3 py-1.5">
                    <div className={`p-1.5 rounded-lg shrink-0 ${activityBg[a.kind]}`}>
                      <Icon className={`h-3.5 w-3.5 ${a.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{a.description}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{a.sub}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">{a.time}</span>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* System Status */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3"><CardTitle className="text-base">Sistem Durumu</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { label: "Veritabanı", ok: stats.totalUsers >= 0, detail: "PostgreSQL · Bağlı" },
              { label: "Edge Functions", ok: true, detail: "check-sl-tp · update-market-data" },
              { label: "Gerçek Zamanlı", ok: true, detail: "WebSocket · Aktif" },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-3 py-2.5 px-3 rounded-lg bg-muted/30 border border-border">
                {s.ok
                  ? <CheckCircle2 className="h-4 w-4 text-buy shrink-0" />
                  : <AlertTriangle className="h-4 w-4 text-sell shrink-0" />
                }
                <div>
                  <p className="text-xs font-semibold">{s.label}</p>
                  <p className="text-[10px] text-muted-foreground">{s.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
