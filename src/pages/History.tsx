import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";


interface ClosedOrder {
  id: string;
  symbol_name: string;
  type: string;
  lots: number;
  entry_price: number;
  current_price: number;
  pnl: number;
  created_at: string;
  closed_at: string | null;
  close_reason: string | null;
}

const formatUsd = (v: number) => v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const History = () => {
  const { user: authUser } = useAuth();
  const [closedOrders, setClosedOrders] = useState<ClosedOrder[]>([]);
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    if (authUser?.id) {
      loadHistory();

      const channel = supabase
        .channel('history-orders')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${authUser.id}`,
        }, () => {
          loadHistory();
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [authUser?.id]);

  const loadHistory = async () => {
    const [ordersRes, profileRes] = await Promise.all([
      supabase.from("orders").select("*").eq("user_id", authUser!.id).eq("status", "closed").order("closed_at", { ascending: false }),
      supabase.from("profiles").select("balance").eq("user_id", authUser!.id).single(),
    ]);

    if (ordersRes.data) setClosedOrders(ordersRes.data as ClosedOrder[]);
    if (profileRes.data) setBalance(Number(profileRes.data.balance));
  };

  const closedPnlTotal = closedOrders.reduce((sum, o) => sum + Number(o.pnl), 0);

  return (
    <div className="flex flex-col h-full animate-slide-up">
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-lg font-bold text-foreground">İşlem Geçmişi</h1>
      </div>

      <div className="flex-1 overflow-auto px-4 pb-4">
        <div className="mb-3 pt-1 border-b border-border pb-3 space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Kâr/Zarar</span>
            <span className={`font-mono font-medium ${closedPnlTotal >= 0 ? 'text-buy' : 'text-sell'}`}>
              {closedPnlTotal >= 0 ? '+' : ''}{formatUsd(closedPnlTotal)} USD
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Bakiye</span>
            <span className="font-mono font-medium text-foreground">{formatUsd(balance)} USD</span>
          </div>
        </div>

        {closedOrders.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Kapatılmış işlem bulunmuyor.</p>
        ) : (
          <div className="divide-y divide-border">
            {closedOrders.map((order) => {
              const pnl = Number(order.pnl);
              return (
              <div key={order.id} className={`py-3 rounded-xl px-3 -mx-1 transition-all ${
                  order.close_reason === 'stop_loss'
                    ? 'bg-gradient-to-r from-sell/10 via-sell/5 to-transparent border border-sell/20 shadow-[0_0_12px_-4px] shadow-sell/20'
                    : order.close_reason === 'take_profit'
                    ? 'bg-gradient-to-r from-buy/10 via-buy/5 to-transparent border border-buy/20 shadow-[0_0_12px_-4px] shadow-buy/20'
                    : 'bg-card/50'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {order.close_reason && (
                        <div className={`w-1.5 h-7 rounded-full ${
                          order.close_reason === 'stop_loss'
                            ? 'bg-sell'
                            : 'bg-buy'
                        }`} />
                      )}
                      <div>
                        <span className="text-sm font-semibold text-foreground">{order.symbol_name}</span>
                        {' '}
                        <span className={`text-xs font-medium ${order.type === 'buy' ? 'text-buy' : 'text-sell'}`}>
                          {order.type === 'buy' ? 'ALIŞ' : 'SATIŞ'} {Number(order.lots)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-sm font-mono font-bold ${pnl >= 0 ? 'text-buy' : 'text-sell'}`}>
                        {pnl >= 0 ? '+' : ''}{formatUsd(pnl)} USD
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-muted-foreground font-mono">
                      {formatUsd(Number(order.entry_price))} → {formatUsd(Number(order.current_price))}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {order.closed_at ? new Date(order.closed_at).toLocaleDateString('tr-TR') : new Date(order.created_at).toLocaleDateString('tr-TR')}{' '}
                      {order.closed_at ? new Date(order.closed_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : ''}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default History;
