import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingUp, DollarSign, Activity } from "lucide-react";

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPositions: 0,
    totalPnl: 0,
    totalMargin: 0,
    activeUsers: 0,
  });
  const [detailedStats, setDetailedStats] = useState({
    winning: 0,
    losing: 0,
    buyCount: 0,
    sellCount: 0,
    totalLots: 0,
  });
  const [topSymbols, setTopSymbols] = useState<{ name: string; count: number }[]>([]);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const [profilesRes, ordersRes] = await Promise.all([
      supabase.from("profiles").select("*"),
      supabase.from("orders").select("*"),
    ]);

    const profiles = profilesRes.data || [];
    const orders = ordersRes.data || [];
    const openOrders = orders.filter((o) => o.status === "open");

    const totalPnl = openOrders.reduce((s, o) => s + Number(o.pnl), 0);
    const totalMargin = profiles.reduce((s, p) => s + Number(p.balance), 0);

    setStats({
      totalUsers: profiles.length,
      totalPositions: openOrders.length,
      totalPnl: totalPnl,
      totalMargin: totalMargin,
      activeUsers: new Set(openOrders.map((o) => o.user_id)).size,
    });

    const winning = orders.filter((o) => Number(o.pnl) > 0).length;
    const losing = orders.filter((o) => Number(o.pnl) < 0).length;
    const buyCount = orders.filter((o) => o.type === "buy").length;
    const sellCount = orders.filter((o) => o.type === "sell").length;
    const totalLots = orders.reduce((s, o) => s + Number(o.lots), 0);

    setDetailedStats({ winning, losing, buyCount, sellCount, totalLots });

    // Top symbols
    const symbolMap: Record<string, number> = {};
    orders.forEach((o) => {
      symbolMap[o.symbol_name] = (symbolMap[o.symbol_name] || 0) + 1;
    });
    const sorted = Object.entries(symbolMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));
    setTopSymbols(sorted);
  };

  const statCards = [
    { label: "Toplam Pozisyon", value: stats.totalPositions, icon: TrendingUp, color: "text-primary" },
    { label: "Toplam P&L", value: `$${stats.totalPnl.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`, icon: DollarSign, color: stats.totalPnl >= 0 ? "text-buy" : "text-sell" },
    { label: "Kullanılan Margin", value: `$${stats.totalMargin.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`, icon: DollarSign, color: "text-warning" },
    { label: "Aktif Kullanıcı", value: stats.activeUsers, icon: Users, color: "text-primary" },
  ];

  const detailCards = [
    { label: "Kazanan", value: detailedStats.winning, color: "text-buy" },
    { label: "Kaybeden", value: detailedStats.losing, color: "text-sell" },
    { label: "Win Rate", value: detailedStats.winning + detailedStats.losing > 0 ? `${((detailedStats.winning / (detailedStats.winning + detailedStats.losing)) * 100).toFixed(1)}%` : "0%", color: "text-primary" },
    { label: "Buy", value: detailedStats.buyCount, color: "text-buy" },
    { label: "Sell", value: detailedStats.sellCount, color: "text-sell" },
    { label: "Toplam Lot", value: detailedStats.totalLots.toFixed(2), color: "text-foreground" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Pozisyon Yönetimi</h2>
        <p className="text-sm text-muted-foreground">Açık pozisyonlar ve işlem geçmişi</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <Card key={s.label} className="bg-card border-border">
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detailed Stats */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Detaylı İstatistikler</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {detailCards.map((d) => (
              <div key={d.label} className="p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-xs text-muted-foreground">{d.label}</p>
                <p className={`text-lg font-bold ${d.color}`}>{d.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Symbols */}
      {topSymbols.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">En Çok İşlem Gören Pariteler</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {topSymbols.map((s) => (
                <span key={s.name} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted text-sm font-medium">
                  {s.name}
                  <span className="bg-primary/20 text-primary text-xs px-1.5 py-0.5 rounded-full">{s.count}</span>
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminDashboard;
