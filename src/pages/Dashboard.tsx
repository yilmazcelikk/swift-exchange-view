import { mockUser, mockOrders } from "@/data/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, UserCircle } from "lucide-react";
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
    { label: "Piyasalar", icon: TrendingUp, path: "/trading", color: "text-buy" },
    { label: "Hesabım", icon: UserCircle, path: "/profile", color: "text-primary" },
  ];

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 animate-slide-up">
      <div>
        <h1 className="text-xl md:text-2xl font-bold">Hoş Geldiniz, {user.fullName}</h1>
        <p className="text-muted-foreground text-xs md:text-sm">Hesap özetiniz</p>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-2 gap-3">
        {balanceCards.map((card) => (
          <Card key={card.label} className="bg-card border-border">
            <CardContent className="p-3">
              <p className="text-[10px] md:text-xs text-muted-foreground mb-0.5">{card.label}</p>
              <p className={`text-sm md:text-lg font-bold font-mono ${
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
      <div className="grid grid-cols-2 gap-3">
        {quickActions.map((action) => (
          <Card
            key={action.label}
            className="bg-card border-border hover:border-primary/30 transition-colors cursor-pointer active:scale-[0.98]"
            onClick={() => navigate(action.path)}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-xl bg-muted ${action.color}`}>
                <action.icon className="h-5 w-5" />
              </div>
              <p className="font-semibold text-sm">{action.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Open Positions */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Açık Pozisyonlar</CardTitle>
        </CardHeader>
        <CardContent>
          {mockOrders.filter(o => o.status === 'open').length === 0 ? (
            <p className="text-sm text-muted-foreground">Açık pozisyon bulunmuyor.</p>
          ) : (
            <div className="space-y-2">
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
  );
};

export default Dashboard;
