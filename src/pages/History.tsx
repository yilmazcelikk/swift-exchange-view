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

interface Transaction {
  id: string;
  type: string;
  amount: number;
  currency: string;
  created_at: string;
  status: string;
  method: string | null;
  description: string | null;
  original_amount?: number | null;
  original_currency?: string | null;
  exchange_rate?: number | null;
}

type HistoryItem = 
  | { itemType: 'order'; data: ClosedOrder }
  | { itemType: 'transaction'; data: Transaction };

const formatNum = (v: number) =>
  v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const generateRefNumber = (id: string) => {
  const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return `REF-${String(hash).slice(0, 6).padStart(6, '0')}`;
};

// Transactions may store either:
// - amount already converted to USD (currency=USD), OR
// - amount in original currency (e.g., TRY) with exchange_rate to derive USD.
// History should always display the USD equivalent.
//
// NOTE: Some older approved rows may have currency=TRY but missing exchange_rate.
// In that case we fall back to the fixed USDTRY rate requested by the business.
const FIXED_USDTRY_RATE = 44;

const getTxnUsdAmount = (
  t: Pick<Transaction, "amount" | "currency" | "original_amount" | "original_currency" | "exchange_rate">,
) => {
  const amount = Number(t.amount) || 0;
  const originalAmount = t.original_amount != null ? Number(t.original_amount) : null;
  const explicitRate = t.exchange_rate != null ? Number(t.exchange_rate) : null;
  const currency = (t.currency || "").toUpperCase();
  const originalCurrency = (t.original_currency || "").toUpperCase();

  // Preferred: already-approved USD amount is stored as amount with currency=USD
  if (currency === "USD") return amount;

  // If original explicitly stored USD equivalent exists, prefer it
  if (originalCurrency === "USD" && originalAmount != null && !Number.isNaN(originalAmount)) {
    return originalAmount;
  }

  // If stored in TRY (or any non-USD), convert using exchange_rate, else fallback fixed rate
  const rate = explicitRate != null && explicitRate > 0 && !Number.isNaN(explicitRate)
    ? explicitRate
    : currency === "TRY"
      ? FIXED_USDTRY_RATE
      : null;

  if (rate != null && rate > 0) return amount / rate;

  // Last resort: show stored amount
  return amount;
};

const History = () => {
  const { user: authUser } = useAuth();
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [balance, setBalance] = useState(0);
  const [totalDeposit, setTotalDeposit] = useState(0);
  const [totalWithdrawal, setTotalWithdrawal] = useState(0);
  const [accountType, setAccountType] = useState("standard");
  const [historyLoading, setHistoryLoading] = useState(true);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (authUser?.id) {
      loadHistory();

      const ordersChannel = supabase
        .channel("history-orders")
        .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `user_id=eq.${authUser.id}` }, () => { loadHistory(false); })
        .subscribe();

      const transactionsChannel = supabase
        .channel("history-transactions")
        .on("postgres_changes", { event: "*", schema: "public", table: "transactions", filter: `user_id=eq.${authUser.id}` }, () => { loadHistory(false); })
        .subscribe();

      return () => { 
        supabase.removeChannel(ordersChannel);
        supabase.removeChannel(transactionsChannel);
      };
    }
  }, [authUser?.id]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [historyItems.length]);

  const loadHistory = async (showSpinner = true) => {
    if (showSpinner) setHistoryLoading(true);
    const [ordersRes, profileRes, transactionsRes] = await Promise.all([
      supabase.from("orders").select("*").eq("user_id", authUser!.id).eq("status", "closed").order("closed_at", { ascending: true }),
      supabase.from("profiles").select("balance, account_type").eq("user_id", authUser!.id).single(),
      supabase.from("transactions").select("*").eq("user_id", authUser!.id).eq("status", "approved").order("created_at", { ascending: true }),
    ]);

    // Combine orders and transactions into unified history
    const items: HistoryItem[] = [];
    
    if (ordersRes.data) {
      ordersRes.data.forEach((o: any) => {
        items.push({
          itemType: 'order',
          data: { ...o, swap: Number(o.swap) || 0 } as ClosedOrder
        });
      });
    }

    if (transactionsRes.data) {
      transactionsRes.data.forEach((t: any) => {
        items.push({
          itemType: 'transaction',
          data: {
            ...t,
            amount: Number(t.amount),
            original_amount: t.original_amount == null ? null : Number(t.original_amount),
            exchange_rate: t.exchange_rate == null ? null : Number(t.exchange_rate),
          } as Transaction
        });
      });
    }

    // Sort by date (use closed_at for orders, created_at for transactions) - ascending (oldest first)
    items.sort((a, b) => {
      const dateA = a.itemType === 'order' ? new Date(a.data.closed_at || a.data.created_at) : new Date(a.data.created_at);
      const dateB = b.itemType === 'order' ? new Date(b.data.closed_at || b.data.created_at) : new Date(b.data.created_at);
      return dateA.getTime() - dateB.getTime();
    });

    setHistoryItems(items);

    if (profileRes.data) {
      setBalance(Number(profileRes.data.balance));
      setAccountType(profileRes.data.account_type || "standard");
    }

    if (transactionsRes.data) {
      const deposits = transactionsRes.data.filter((t: any) => t.type === 'deposit');
      const withdrawals = transactionsRes.data.filter((t: any) => t.type === 'withdrawal');
      
      // Always sum using the approved USD equivalent
      setTotalDeposit(deposits.reduce((s: number, t: any) => s + getTxnUsdAmount(t), 0));
      setTotalWithdrawal(withdrawals.reduce((s: number, t: any) => s + getTxnUsdAmount(t), 0));
    }
    setHistoryLoading(false);
  };

  const closedOrders = historyItems.filter(item => item.itemType === 'order').map(item => item.data as ClosedOrder);
  const totalPnl = closedOrders.reduce((s, o) => s + Number(o.pnl), 0);
  const totalSwap = closedOrders.reduce((s, o) => s + o.swap, 0);
  const totalCommission = closedOrders.reduce(
    (s, o) => s + calculateCommission(o.symbol_name, Number(o.lots), Number(o.current_price), accountType),
    0,
  );

  const summaryRows = [
    { label: "Para çek", value: -totalWithdrawal, color: "text-sell" },
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
        {historyItems.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Geçmiş bulunmuyor.</p>
        ) : (
          <div className="divide-y divide-border">
            {historyItems.map((item) => {
              if (item.itemType === 'transaction') {
                const txn = item.data as Transaction;
                const isDeposit = txn.type === 'deposit';
                const refNumber = generateRefNumber(txn.id);
                return (
                  <div
                    key={txn.id}
                    className={`py-3 rounded-xl px-3 -mx-1 transition-all ${
                      isDeposit
                        ? "bg-gradient-to-r from-buy/10 via-buy/5 to-transparent border border-buy/20 shadow-[0_0_12px_-4px] shadow-buy/20"
                        : "bg-gradient-to-r from-sell/10 via-sell/5 to-transparent border border-sell/20 shadow-[0_0_12px_-4px] shadow-sell/20"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-7 rounded-full ${isDeposit ? "bg-buy" : "bg-sell"}`} />
                        <div>
                          <span className="text-sm font-semibold text-foreground">
                            {isDeposit ? "Para Yatırma" : "Para Çekme"}
                          </span>
                          <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                            {refNumber}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-sm font-mono font-bold ${isDeposit ? "text-buy" : "text-sell"}`}>
                          {isDeposit ? "+" : "-"}{formatNum(getTxnUsdAmount(txn))} USD
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <div>
                        {txn.method && (
                          <p className="text-xs text-muted-foreground">
                            {txn.method}
                          </p>
                        )}
                        {txn.description && (
                          <p className={`text-muted-foreground ${txn.method ? "text-[10px] text-muted-foreground/70 italic mt-0.5" : "text-xs"}`}>
                            {txn.description}
                          </p>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(txn.created_at).toLocaleDateString("tr-TR")} {new Date(txn.created_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                );
              } else {
                const order = item.data as ClosedOrder;
                const pnl = Number(order.pnl);
                const commission = calculateCommission(order.symbol_name, Number(order.lots), Number(order.current_price), accountType);
                return (
                  <div
                    key={order.id}
                    className={`py-3 rounded-xl px-3 -mx-1 transition-all ${
                      order.close_reason === "take_profit"
                        ? "bg-gradient-to-r from-buy/10 via-buy/5 to-transparent border border-buy/20 shadow-[0_0_12px_-4px] shadow-buy/20"
                        : (order.close_reason === "stop_loss" || order.close_reason === "stop_out")
                        ? "bg-gradient-to-r from-sell/10 via-sell/5 to-transparent border border-sell/20 shadow-[0_0_12px_-4px] shadow-sell/20"
                        : "bg-card/50"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {(order.close_reason === "take_profit" || order.close_reason === "stop_loss" || order.close_reason === "stop_out") && (
                          <div className={`w-1.5 h-7 rounded-full ${order.close_reason === "take_profit" ? "bg-buy" : "bg-sell"}`} />
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
              }
            })}
          </div>
        )}
      </div>

      {/* Summary - static at bottom, NOT fixed */}
      <div className="shrink-0 px-4 py-2 border-t border-border bg-background space-y-1">
        {summaryRows.map((row) => (
          <div key={row.label} className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{row.label}</span>
            <span className={`text-sm font-mono font-bold ${row.color}`}>
              {row.value < 0 ? "-" : ""}{formatNum(Math.abs(row.value))} USD
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default History;
