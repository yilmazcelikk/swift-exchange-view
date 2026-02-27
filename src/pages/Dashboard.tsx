import { useState } from "react";
import { mockUser, mockOrders } from "@/data/mockData";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
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

const Dashboard = () => {
  const user = mockUser;
  const navigate = useNavigate();
  const [orders, setOrders] = useState(mockOrders);
  const [closingOrder, setClosingOrder] = useState<Order | null>(null);

  const openOrders = orders.filter(o => o.status === 'open');
  const closedOrders = orders.filter(o => o.status === 'closed');
  const totalOpenPnl = openOrders.reduce((sum, o) => sum + o.pnl, 0);
  const closedPnlTotal = closedOrders.reduce((sum, o) => sum + o.pnl, 0);

  const accountStats = [
    { label: "Bakiye", value: user.balance },
    { label: "Varlık", value: user.equity },
    { label: "Teminat", value: 0 },
    { label: "Serbest teminat", value: user.freeMargin },
    { label: "Teminat seviyesi (%)", value: 0 },
  ];

  const handleClosePosition = (order: Order) => {
    setOrders(prev => prev.map(o =>
      o.id === order.id ? { ...o, status: 'closed' as const } : o
    ));
    setClosingOrder(null);
    toast.success(`${order.symbolName} ${order.type === 'buy' ? 'ALIŞ' : 'SATIŞ'} ${order.lots} lot pozisyon kapatıldı`, {
      description: `K/Z: ${order.pnl >= 0 ? '+' : ''}${order.pnl.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} USD`,
    });
  };

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
                    <div className="flex items-center gap-2">
                      <div>
                        <span className="text-sm font-semibold text-foreground">{order.symbolName}</span>
                        {' '}
                        <span className={`text-sm font-medium ${order.type === 'buy' ? 'text-buy' : 'text-sell'}`}>
                          {order.type} {order.lots}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-mono font-bold ${order.pnl >= 0 ? 'text-buy' : 'text-sell'}`}>
                        {order.pnl >= 0 ? '+' : ''}{order.pnl.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </span>
                      <button
                        onClick={() => setClosingOrder(order)}
                        className="p-1 rounded hover:bg-sell/10 text-muted-foreground hover:text-sell transition-colors"
                        title="Pozisyonu Kapat"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
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
                      <span className={`text-sm font-mono font-bold ${order.pnl >= 0 ? 'text-buy' : 'text-sell'}`}>
                        {order.pnl >= 0 ? '+' : ''}{order.pnl.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </span>
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

      {/* Close Position Dialog */}
      <AlertDialog open={!!closingOrder} onOpenChange={(open) => !open && setClosingOrder(null)}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Pozisyonu Kapat</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>Bu pozisyonu kapatmak istediğinize emin misiniz?</p>
                {closingOrder && (
                  <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Sembol</span>
                      <span className="font-semibold">{closingOrder.symbolName}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Yön</span>
                      <span className={closingOrder.type === 'buy' ? 'text-buy font-medium' : 'text-sell font-medium'}>
                        {closingOrder.type === 'buy' ? 'ALIŞ' : 'SATIŞ'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Lot</span>
                      <span className="font-mono">{closingOrder.lots}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Giriş Fiyatı</span>
                      <span className="font-mono">{closingOrder.entryPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Güncel Fiyat</span>
                      <span className="font-mono">{closingOrder.currentPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-sm border-t border-border pt-1 mt-1">
                      <span className="text-muted-foreground font-medium">K/Z</span>
                      <span className={`font-mono font-bold ${closingOrder.pnl >= 0 ? 'text-buy' : 'text-sell'}`}>
                        {closingOrder.pnl >= 0 ? '+' : ''}{closingOrder.pnl.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} USD
                      </span>
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
