import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { calculateCommission } from "@/lib/trading";

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
  const [accountType, setAccountType] = useState("standard");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 50;
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (authUser?.id) {
      loadHistory(0);

      const channel = supabase
        .channel("history-orders")
        .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `user_id=eq.${authUser.id}` }, () => { setPage(0); loadHistory(0); })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [authUser?.id]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [closedOrders.length]);

  const loadHistory = async (pageNum = 0) => {
    const from = pageNum * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const [ordersRes, profileRes, depositsRes] = await Promise.all([
      supabase.from("orders").select("*").eq("user_id", authUser!.id).eq("status", "closed").order("closed_at", { ascending: true }).range(from, to),
      supabase.from("profiles").select("balance, account_type").eq("user_id", authUser!.id).single(),
      supabase.from("transactions").select("amount").eq("user_id", authUser!.id).eq("type", "deposit").eq("status", "approved"),
    ]);

    if (ordersRes.data) {
      if (pageNum === 0) {
        setClosedOrders(ordersRes.data.map((o: any) => ({ ...o, swap: Number(o.swap) || 0 })) as ClosedOrder[]);
      } else {
        setClosedOrders(prev => [...prev, ...ordersRes.data!.map((o: any) => ({ ...o, swap: Number(o.swap) || 0 })) as ClosedOrder[]]);
      }
      setHasMore(ordersRes.data.length === PAGE_SIZE);
    }
    if (profileRes.data) {
      setBalance(Number(profileRes.data.balance));
      setAccountType(profileRes.data.account_type || "standard");
    }
    if (depositsRes.data) setTotalDeposit(depositsRes.data.reduce((s: number, t: any) => s + Number(t.amount), 0));
  };

  const totalPnl = closedOrders.reduce((s, o) => s + Number(o.pnl), 0);
  const totalSwap = closedOrders.reduce((s, o) => s + o.swap, 0);
  const totalCommission = closedOrders.reduce(
    (s, o) => s + calculateCommission(o.symbol_name, Number(o.lots), Number(o.current_price), accountType),
    0,
  );

  const summaryRows = [
    { label: "Para yatır", value: totalDeposit, color: "text-foreground" },
    { label: "Net Kâr/Zarar", value: totalPnl, color: totalPnl >= 0 ? "text-buy" : "text-sell" },
    { label: "Komisyon", value: -Math.abs(totalCommission), color: "text-sell" },
    { label: "Swap", value: totalSwap, color: totalSwap >= 0 ? "text-foreground" : "text-sell" },
    { label: "Bakiye", value: balance, color: "text-foreground" },
  ];

  return (
    <div className="flex flex-col h-full animate-slide-up">
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-lg font-bold text-foreground">İşlem Geçmişi</h1>
      </div>

      {/* Scrollable orders area - takes remaining space above summary */}
      <div ref={listRef} className="flex-1 min-h-0 overflow-auto px-4">
        {closedOrders.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Kapatılmış işlem bulunmuyor.</p>
        ) : (
          <div className="divide-y divide-border">
            {closedOrders.map((order) => {
              const pnl = Number(order.pnl);
              const commission = calculateCommission(order.symbol_name, Number(order.lots), Number(order.current_price), accountType);
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
                        {pnl >= 0 ? "+" : ""}{formatNum(pnl)} USD
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
                  <div className="mt-1 text-[10px] text-muted-foreground font-mono text-right">
                    Komisyon: -{formatNum(Math.abs(commission))} USD
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {hasMore && closedOrders.length > 0 && (
          <button
            onClick={() => { const next = page + 1; setPage(next); loadHistory(next); }}
            className="w-full py-2 mt-2 text-xs text-primary font-medium hover:underline"
          >
            Daha fazla yükle...
          </button>
        )}
      </div>

      {/* Summary - static at bottom, NOT fixed */}
      <div className="shrink-0 px-4 py-2 border-t border-border bg-background space-y-1">
        {summaryRows.map((row) => (
          <div key={row.label} className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{row.label}</span>
            <span className={`text-sm font-mono font-bold ${row.color}`}>
              {row.value < 0 ? "-" : ""}{formatNum(Math.abs(row.value))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default History;
