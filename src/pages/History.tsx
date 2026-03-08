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
  swap: number;
  created_at: string;
  closed_at: string | null;
  close_reason: string | null;
}

const formatNum = (v: number) =>
  v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const History = () => {
  const { user: authUser } = useAuth();
  const [closedOrders, setClosedOrders] = useState<ClosedOrder[]>([]);
  const [balance, setBalance] = useState(0);
  const [totalDeposit, setTotalDeposit] = useState(0);

  useEffect(() => {
    if (authUser?.id) {
      loadHistory();

      const channel = supabase
        .channel("history-orders")
        .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `user_id=eq.${authUser.id}` }, () => loadHistory())
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [authUser?.id]);

  const loadHistory = async () => {
    const [ordersRes, profileRes, depositsRes] = await Promise.all([
      supabase.from("orders").select("*").eq("user_id", authUser!.id).eq("status", "closed").order("closed_at", { ascending: true }),
      supabase.from("profiles").select("balance").eq("user_id", authUser!.id).single(),
      supabase.from("transactions").select("amount").eq("user_id", authUser!.id).eq("type", "deposit").eq("status", "approved"),
    ]);

    if (ordersRes.data) setClosedOrders(ordersRes.data.map((o: any) => ({ ...o, swap: Number(o.swap) || 0 })) as ClosedOrder[]);
    if (profileRes.data) setBalance(Number(profileRes.data.balance));
    if (depositsRes.data) setTotalDeposit(depositsRes.data.reduce((s: number, t: any) => s + Number(t.amount), 0));
  };

  // Summary calculations
  const totalPnl = closedOrders.reduce((s, o) => s + Number(o.pnl), 0);
  const totalSwap = closedOrders.reduce((s, o) => s + o.swap, 0);

  // Summary rows like the reference image
  const summaryRows = [
    { label: "Para yatır", value: totalDeposit, color: "text-foreground" },
    { label: "Kâr", value: totalPnl, color: totalPnl >= 0 ? "text-buy" : "text-sell" },
    { label: "Swap", value: totalSwap, color: totalSwap >= 0 ? "text-foreground" : "text-sell" },
    { label: "Bakiye", value: balance, color: "text-foreground" },
  ];

  return (
    <div className="flex flex-col h-full animate-slide-up">
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-lg font-bold text-foreground">İşlem Geçmişi</h1>
      </div>

      <div className="flex-1 overflow-auto px-4 pb-24 md:pb-4">
        {/* Summary section at top */}
        <div className="pb-3 mb-3 border-b border-border space-y-2">
          {summaryRows.map((row) => (
            <div key={row.label} className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{row.label}</span>
              <span className={`text-sm font-mono font-bold ${row.color}`}>
                {row.value < 0 ? "-" : ""}
                {formatNum(Math.abs(row.value))}
              </span>
            </div>
          ))}
        </div>

        {/* Order list below */}
        {closedOrders.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Kapatılmış işlem bulunmuyor.</p>
        ) : (
          <div className="divide-y divide-border">
            {closedOrders.map((order) => {
              const pnl = Number(order.pnl);
              return (
                <div
                  key={order.id}
                  className={`py-3 rounded-xl px-3 -mx-1 transition-all ${
                    order.close_reason === "stop_loss"
                      ? "bg-gradient-to-r from-sell/10 via-sell/5 to-transparent border border-sell/20 shadow-[0_0_12px_-4px] shadow-sell/20"
                      : order.close_reason === "take_profit"
                      ? "bg-gradient-to-r from-buy/10 via-buy/5 to-transparent border border-buy/20 shadow-[0_0_12px_-4px] shadow-buy/20"
                      : "bg-card/50"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {order.close_reason && (
                        <div className={`w-1.5 h-7 rounded-full ${order.close_reason === "stop_loss" ? "bg-sell" : "bg-buy"}`} />
                      )}
                      <div>
                        <span className="text-sm font-semibold text-foreground">{order.symbol_name}</span>{" "}
                        <span className={`text-xs font-medium ${order.type === "buy" ? "text-buy" : "text-sell"}`}>
                          {order.type === "buy" ? "ALIŞ" : "SATIŞ"} {Number(order.lots)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-sm font-mono font-bold ${pnl >= 0 ? "text-buy" : "text-sell"}`}>
                        {pnl >= 0 ? "+" : ""}
                        {formatNum(pnl)} USD
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-muted-foreground font-mono">
                      {formatNum(Number(order.entry_price))} → {formatNum(Number(order.current_price))}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {order.closed_at
                        ? `${new Date(order.closed_at).toLocaleDateString("tr-TR")} ${new Date(order.closed_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}`
                        : new Date(order.created_at).toLocaleDateString("tr-TR")}
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
