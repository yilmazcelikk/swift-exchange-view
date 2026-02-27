import { mockUser, mockOrders } from "@/data/mockData";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Dashboard = () => {
  const user = mockUser;
  const navigate = useNavigate();

  const openOrders = mockOrders.filter(o => o.status === 'open');
  const closedOrders = mockOrders.filter(o => o.status === 'closed');
  const totalOpenPnl = openOrders.reduce((sum, o) => sum + o.pnl, 0);

  const accountStats = [
    { label: "Bakiye", value: user.balance },
    { label: "Varlık", value: user.equity },
    { label: "Teminat", value: 0 },
    { label: "Serbest teminat", value: user.freeMargin },
    { label: "Teminat seviyesi (%)", value: 0 },
  ];

  // History summary
  const closedPnlTotal = closedOrders.reduce((sum, o) => sum + o.pnl, 0);

  return (
    <div className="flex flex-col h-full animate-slide-up">
      {/* Top PnL Display */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex-1" />
        <p className={`text-lg md:text-xl font-bold font-mono ${totalOpenPnl >= 0 ? 'text-buy' : 'text-sell'}`}>
          {totalOpenPnl >= 0 ? '+' : ''}{totalOpenPnl.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} USD
        </p>
        <div className="flex-1 flex justify-end">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={() => navigate('/trading')}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Account Stats */}
      <div className="px-4 pb-3 space-y-1">
        {accountStats.map((stat) => (
          <div key={stat.label} className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{stat.label}:</span>
            <span className="text-xs font-mono font-medium text-foreground">
              {stat.value.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        ))}
      </div>

      {/* Positions & History Tabs */}
      <Tabs defaultValue="positions" className="flex-1 flex flex-col min-h-0">
        <TabsList className="mx-4 mb-0 bg-muted/50 h-9">
          <TabsTrigger value="positions" className="text-xs flex-1">
            Pozisyonlar ({openOrders.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs flex-1">
            Geçmiş
          </TabsTrigger>
        </TabsList>

        <TabsContent value="positions" className="flex-1 overflow-auto mt-0 px-4 pb-4">
          {openOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Açık pozisyon bulunmuyor.</p>
          ) : (
            <div className="divide-y divide-border">
              {openOrders.map((order) => (
                <div key={order.id} className="py-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-sm font-semibold text-foreground">{order.symbolName}</span>
                      {' '}
                      <span className={`text-sm font-medium ${order.type === 'buy' ? 'text-buy' : 'text-sell'}`}>
                        {order.type} {order.lots}
                      </span>
                    </div>
                    <span className={`text-sm font-mono font-bold ${order.pnl >= 0 ? 'text-buy' : 'text-sell'}`}>
                      {order.pnl >= 0 ? '+' : ''}{order.pnl.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">
                    {order.entryPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} → {order.currentPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="flex-1 overflow-auto mt-0 px-4 pb-4">
          {closedOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Kapatılmış işlem bulunmuyor.</p>
          ) : (
            <>
              <div className="divide-y divide-border">
                {closedOrders.map((order) => (
                  <div key={order.id} className="py-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-sm font-semibold text-foreground">{order.symbolName}</span>
                        {' '}
                        <span className={`text-sm font-medium ${order.type === 'buy' ? 'text-buy' : 'text-sell'}`}>
                          {order.type} {order.lots}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className={`text-sm font-mono font-bold ${order.pnl >= 0 ? 'text-buy' : 'text-sell'}`}>
                          {order.pnl >= 0 ? '+' : ''}{order.pnl.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-xs text-muted-foreground font-mono">
                        {order.entryPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} → {order.currentPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString('tr-TR')} {new Date(order.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              {/* History Summary */}
              <div className="mt-3 pt-3 border-t border-border space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Kâr</span>
                  <span className={`font-mono font-medium ${closedPnlTotal >= 0 ? 'text-buy' : 'text-sell'}`}>
                    {closedPnlTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Swap</span>
                  <span className="font-mono font-medium text-foreground">0.00</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Komisyon</span>
                  <span className="font-mono font-medium text-foreground">0.00</span>
                </div>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Dashboard;
