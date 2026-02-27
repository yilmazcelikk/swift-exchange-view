import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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
  const { user: authUser } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [closingOrder, setClosingOrder] = useState<Order | null>(null);
  const [profile, setProfile] = useState({ balance: 0, equity: 0, freeMargin: 0 });

  useEffect(() => {
    if (authUser?.id) {
      loadData();
    }
  }, [authUser?.id]);

  const loadData = async () => {
    const [profileRes, ordersRes] = await Promise.all([
      supabase.from("profiles").select("balance, equity, free_margin").eq("user_id", authUser!.id).single(),
      supabase.from("orders").select("*").eq("user_id", authUser!.id).eq("status", "open"),
    ]);

    if (profileRes.data) {
      setProfile({
        balance: Number(profileRes.data.balance),
        equity: Number(profileRes.data.equity),
        freeMargin: Number(profileRes.data.free_margin),
      });
    }

    if (ordersRes.data) {
      setOrders(ordersRes.data.map((o: any) => ({
        id: o.id,
        symbolId: o.symbol_id,
        symbolName: o.symbol_name,
        type: o.type as "buy" | "sell",
        lots: Number(o.lots),
        entryPrice: Number(o.entry_price),
        currentPrice: Number(o.current_price),
        stopLoss: o.stop_loss ? Number(o.stop_loss) : undefined,
        takeProfit: o.take_profit ? Number(o.take_profit) : undefined,
        pnl: Number(o.pnl),
        status: o.status as "open" | "closed",
        openTime: o.created_at,
      })));
    }
  };

  const openOrders = orders.filter(o => o.status === 'open');
  const totalOpenPnl = openOrders.reduce((sum, o) => sum + o.pnl, 0);

  const accountStats = [
    { label: "Bakiye", value: profile.balance },
    { label: "Varlık", value: profile.equity },
    { label: "Teminat", value: 0 },
    { label: "Serbest teminat", value: profile.freeMargin },
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
      <div className="flex items-center justify-center px-4 pt-4 pb-2">
        <p className={`text-lg md:text-xl font-bold font-mono ${totalOpenPnl >= 0 ? 'text-buy' : 'text-sell'}`}>
          {totalOpenPnl >= 0 ? '+' : ''}{totalOpenPnl.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} USD
        </p>
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

      {/* Positions Header */}
      <div className="px-4 pb-2">
        <h2 className="text-sm font-semibold text-foreground">Pozisyonlar ({openOrders.length})</h2>
      </div>

      {/* Open Positions List */}
      <div className="flex-1 overflow-auto px-4 pb-4">
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
      </div>

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
