import { mockUser, mockOrders } from "@/data/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowDownToLine, ArrowUpFromLine, ShieldCheck, TrendingUp, UserCircle, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const user = mockUser;
  const navigate = useNavigate();

  const balanceCards = [
    { label: "Bakiye", value: user.balance, prefix: "$" },
    { label: "Kredi", value: user.credit, prefix: "$" },
    { label: "Açık K&Z", value: user.openPnl, prefix: "$", colored: true },
    { label: "Varlık", value: user.equity, prefix: "$" },
    { label: "Serbest Teminat", value: user.freeMargin, prefix: "$" },
  ];

  const quickActions = [
    { label: "Para Yatır", icon: ArrowDownToLine, path: "/deposit", color: "text-buy" },
    { label: "Para Çek", icon: ArrowUpFromLine, path: "/withdraw", color: "text-warning" },
    { label: "Kimlik Doğrulama", icon: ShieldCheck, path: "/verification", color: "text-primary" },
  ];

  const otherActions = [
    { label: "Piyasalar", icon: TrendingUp, path: "/trading" },
    { label: "Kişisel Bilgilerim", icon: UserCircle, path: "/profile" },
    { label: "Portföy", icon: BarChart3, path: "/portfolio" },
  ];

  return (
    <div className="p-6 space-y-6 animate-slide-up">
      <div>
        <h1 className="text-2xl font-bold">Hoş Geldiniz, {user.fullName}</h1>
        <p className="text-muted-foreground text-sm">Hesap özetiniz aşağıda yer almaktadır.</p>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {balanceCards.map((card) => (
          <Card key={card.label} className="bg-card border-border">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">{card.label}</p>
              <p className={`text-lg font-bold font-mono ${
                card.colored
                  ? card.value >= 0 ? 'text-buy' : 'text-sell'
                  : 'text-foreground'
              }`}>
                {card.prefix}{card.value.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {quickActions.map((action) => (
          <Card
            key={action.label}
            className="bg-card border-border hover:border-primary/30 transition-colors cursor-pointer"
            onClick={() => navigate(action.path)}
          >
            <CardContent className="p-6 flex items-center gap-4">
              <div className={`p-3 rounded-xl bg-muted ${action.color}`}>
                <action.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold">{action.label}</p>
                <p className="text-xs text-muted-foreground">Hızlı işlem</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Other Actions + Open Positions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base">Diğer İşlemler</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {otherActions.map((action) => (
              <Button
                key={action.label}
                variant="ghost"
                className="w-full justify-start gap-3"
                onClick={() => navigate(action.path)}
              >
                <action.icon className="h-4 w-4" />
                {action.label}
              </Button>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base">Açık Pozisyonlar</CardTitle>
          </CardHeader>
          <CardContent>
            {mockOrders.filter(o => o.status === 'open').length === 0 ? (
              <p className="text-sm text-muted-foreground">Açık pozisyon bulunmuyor.</p>
            ) : (
              <div className="space-y-3">
                {mockOrders.filter(o => o.status === 'open').map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="text-sm font-semibold">{order.symbolName}</p>
                      <p className={`text-xs ${order.type === 'buy' ? 'text-buy' : 'text-sell'}`}>
                        {order.type === 'buy' ? 'ALIŞ' : 'SATIŞ'} • {order.lots} lot
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-mono font-semibold ${order.pnl >= 0 ? 'text-buy' : 'text-sell'}`}>
                        {order.pnl >= 0 ? '+' : ''}{order.pnl.toFixed(2)}$
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">{order.entryPrice}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
