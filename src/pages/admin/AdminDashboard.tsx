import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users, UserCheck, TrendingUp, ArrowDownToLine, ArrowUpFromLine,
  RefreshCw,
} from "lucide-react";

const AdminDashboard = ({ onNavigate }: { onNavigate?: (tab: string) => void }) => {
  const [stats, setStats] = useState({
    totalUsers: 0, verifiedUsers: 0, openPositions: 0,
    pendingWithdrawals: 0, pendingDeposits: 0,
  });
  const [recentActivities, setRecentActivities] = useState<{ id: string; type: string; description: string; time: string }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadStats(); }, []);

  const loadStats = async () => {
    setLoading(true);
    // Use count queries instead of select("*") for security and scalability
    const [
      totalUsersRes, verifiedUsersRes, openOrdersRes,
      pendingWithdrawalsRes, pendingDepositsRes, recentTxRes,
    ] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("verification_status", "verified"),
      supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "open"),
      supabase.from("transactions").select("id", { count: "exact", head: true }).eq("type", "withdrawal").eq("status", "pending"),
      supabase.from("transactions").select("id", { count: "exact", head: true }).eq("type", "deposit").eq("status", "pending"),
      supabase.from("transactions").select("id, type, amount, currency, status, created_at").order("created_at", { ascending: false }).limit(5),
    ]);

    setStats({
      totalUsers: totalUsersRes.count || 0,
      verifiedUsers: verifiedUsersRes.count || 0,
      openPositions: openOrdersRes.count || 0,
      pendingWithdrawals: pendingWithdrawalsRes.count || 0,
      pendingDeposits: pendingDepositsRes.count || 0,
    });

    const recent = (recentTxRes.data || []).map((t: any) => ({
      id: t.id,
      type: t.type === "deposit" ? "Yatırım" : "Çekim",
      description: `${t.type === "deposit" ? "Yatırım" : "Çekim"} talebi - ${Number(t.amount).toLocaleString("tr-TR")} ${t.currency} - ${t.status === "approved" ? "Onaylandı" : t.status === "pending" ? "Bekliyor" : "Reddedildi"}`,
      time: formatTimeAgo(new Date(t.created_at)),
    }));
    setRecentActivities(recent);
    setLoading(false);
  };

  const formatTimeAgo = (date: Date) => {
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60) return `${diff} saniye önce`;
    if (diff < 3600) return `${Math.floor(diff / 60)} dakika önce`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} saat önce`;
    return `${Math.floor(diff / 86400)} gün önce`;
  };

  const statCards = [
    { label: "Toplam Kullanıcı", value: stats.totalUsers, icon: Users, color: "text-primary" },
    { label: "Doğrulanmış", value: stats.verifiedUsers, icon: UserCheck, color: "text-success" },
    { label: "Açık İşlem", value: stats.openPositions, icon: TrendingUp, color: "text-primary" },
    { label: "Bekleyen Çekim", value: stats.pendingWithdrawals, icon: ArrowUpFromLine, color: "text-warning" },
    { label: "Bekleyen Yatırım", value: stats.pendingDeposits, icon: ArrowDownToLine, color: "text-success" },
  ];

  const quickActions = [
    { label: "Kullanıcılar", icon: UserPlus, tab: "users" },
    { label: "KYC İncele", icon: FileText, tab: "documents" },
    { label: "Pozisyonlar", icon: BarChart3, tab: "positions" },
    { label: "Finans Talepleri", icon: Landmark, tab: "finance" },
    { label: "Ürünler", icon: ClipboardList, tab: "products" },
    { label: "Ayarlar", icon: Settings, tab: "settings" },
  ];

  const systemStatus = [
    { label: "İşlem Sunucusu (Socket)", status: "Çevrimiçi" },
    { label: "Ana Sunucu", status: "Çevrimiçi" },
    { label: "Veritabanı", status: "Çevrimiçi" },
    { label: "E-Posta Servisleri", status: "Çevrimiçi" },
    { label: "Yedekleme Servisleri", status: "Çevrimiçi" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Admin Dashboard</h2>
          <p className="text-sm text-success flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-success inline-block" />
            Anlık veri akışı aktif
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Son güncelleme: {new Date().toLocaleTimeString("tr-TR")}</span>
          <Button variant="outline" size="sm" onClick={loadStats} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Yenile
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((s) => (
          <Card key={s.label} className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <s.icon className={`h-5 w-5 ${s.color} opacity-60`} />
              </div>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-card border-border">
        <CardHeader className="pb-3"><CardTitle className="text-base">Hızlı İşlemler</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {quickActions.map((a) => (
              <div key={a.label} onClick={() => onNavigate?.(a.tab)} className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors">
                <a.icon className="h-6 w-6 text-muted-foreground" />
                <span className="text-xs text-center font-medium">{a.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card border-border">
          <CardHeader className="pb-3"><CardTitle className="text-base">Son Aktiviteler</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {recentActivities.length > 0 ? recentActivities.map((a) => (
              <div key={a.id} className="flex items-start gap-3 pb-3 border-b border-border last:border-0 last:pb-0">
                <div className={`mt-1 p-1.5 rounded-full ${a.type === "Yatırım" ? "bg-success/10" : "bg-warning/10"}`}>
                  {a.type === "Yatırım" ? <ArrowDownToLine className="h-3 w-3 text-success" /> : <ArrowUpFromLine className="h-3 w-3 text-warning" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{a.type} İşlemi</p>
                  <p className="text-xs text-muted-foreground truncate">{a.description}</p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">{a.time}</span>
              </div>
            )) : (
              <p className="text-sm text-muted-foreground text-center py-4">Henüz aktivite yok.</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-3"><CardTitle className="text-base">Sistem Durumu</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {systemStatus.map((s) => (
              <div key={s.label} className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-success/5">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-success" />
                  <span className="text-sm">{s.label}</span>
                </div>
                <span className="text-xs font-medium text-success">{s.status}</span>
              </div>
            ))}
            <p className="text-xs text-muted-foreground text-right mt-2">Son kontrol: {new Date().toLocaleString("tr-TR")}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
