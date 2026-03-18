import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSearchParams } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { AnimatedPrice } from "@/components/AnimatedPrice";
import { SymbolLogo } from "@/components/SymbolLogo";
import { getMarketStatus } from "@/lib/marketHours";
import { SymbolList, type DBSymbol } from "@/components/trading/SymbolList";
import { TradingViewChart } from "@/components/trading/TradingViewChart";
import { BISTChart } from "@/components/trading/BISTChart";
import { OrderPanel } from "@/components/trading/OrderPanel";

// BIST stock symbols that should use our custom chart
const BIST_SYMBOLS = new Set([
  "THYAO","GARAN","AKBNK","SISE","EREGL","KCHOL","SAHOL","TUPRS","YKBNK",
  "ISCTR","ASELS","BIMAS","PGSUS","EKGYO","PETKM","TOASO","TAVHL","FROTO",
  "TCELL","HALKB","VAKBN","DOHOL","ENKAI","ARCLK","VESTL","MGROS","SOKM",
  "GUBRF","SASA","OYAKC","TTKOM","TSKB","AKSA","CIMSA","AEFES","ULKER",
  "DOAS","OTKAR","ISGYO","KRDMD","GESAN","KONTR","ODAS","BRYAT","TTRAK",
  "EUPWR","AGHOL","MAVI","LOGO","KOZAL","KOZAA","TKFEN","TURSG","SKBNK",
  "ALBRK","CCOLA","ISMEN","HLGYO","ENJSA","AKENR","AKSEN","ECZYT","MPARK",
  "ALARK","BERA",
]);

interface OpenPosition {
  id: string;
  type: "buy" | "sell";
  entry_price: number;
  stop_loss: number | null;
  take_profit: number | null;
  lots: number;
  symbol_name: string;
}

const Trading = () => {
  const { user: authUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedSymbol, setSelectedSymbol] = useState<DBSymbol | null>(null);
  const [symbols, setSymbols] = useState<DBSymbol[]>([]);
  const [loading, setLoading] = useState(true);
  const [leverage, setLeverage] = useState("1:200");
  const [accountType, setAccountType] = useState("standard");
  const [openPositions, setOpenPositions] = useState<OpenPosition[]>([]);

  // Load user profile settings and open positions
  useEffect(() => {
    if (authUser) {
      supabase.from("profiles").select("leverage, account_type").eq("user_id", authUser.id).single().then(({ data }) => {
        if (data?.leverage) setLeverage(data.leverage);
        if (data?.account_type) setAccountType(data.account_type);
      });

      // Load open positions
      supabase
        .from("orders")
        .select("id, type, entry_price, stop_loss, take_profit, lots, symbol_name")
        .eq("user_id", authUser.id)
        .eq("status", "open")
        .then(({ data }) => {
          if (data) {
            setOpenPositions(data as OpenPosition[]);
          }
        });
    }
  }, [authUser]);

  useEffect(() => {
    loadSymbols();

    // Realtime subscription for live price updates in symbol list
    const channel = supabase
      .channel('trading-symbols')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'symbols' }, (payload) => {
        if (payload.new) {
          const updated = payload.new as any;
          setSymbols(prev => prev.map(s => s.id === updated.id ? { ...s, ...updated } as DBSymbol : s));
          setSelectedSymbol(prev => prev && prev.id === updated.id ? { ...prev, ...updated } as DBSymbol : prev);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const loadSymbols = async () => {
    const { data, error } = await supabase
      .from("symbols")
      .select("id, name, display_name, category, exchange, current_price, change_percent, high, low, volume")
      .eq("is_active", true)
      .order("category")
      .order("name");
    if (!error && data) {
      setSymbols(data as DBSymbol[]);
      if (selectedSymbol) {
        const upd = data.find((s: any) => s.id === selectedSymbol.id);
        if (upd) setSelectedSymbol(upd as DBSymbol);
      }
    }
    setLoading(false);
  };

  // Auto-select symbol from URL param
  useEffect(() => {
    const symbolParam = searchParams.get("symbol");
    if (symbolParam && symbols.length > 0 && !selectedSymbol) {
      const found = symbols.find(s => s.name === symbolParam);
      if (found) {
        setSelectedSymbol(found);
        searchParams.delete("symbol");
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [symbols, searchParams]);

  const formatPrice = (price: number) => {
    if (!price || price === 0) return "—";
    if (price < 1) return price.toFixed(5);
    if (price < 10) return price.toFixed(4);
    if (price < 1000) return price.toFixed(2);
    return price.toLocaleString("tr-TR", { minimumFractionDigits: 2 });
  };

  // Symbol list view
  if (!selectedSymbol) {
    return <SymbolList symbols={symbols} loading={loading} onSelectSymbol={setSelectedSymbol} />;
  }

  const price = selectedSymbol.current_price || 0;
  const currentMarketStatus = getMarketStatus(selectedSymbol.name, selectedSymbol.category, selectedSymbol.exchange);
  const isPositive = (selectedSymbol.change_percent ?? 0) >= 0;
  const isBISTStock = BIST_SYMBOLS.has(selectedSymbol.name) || selectedSymbol.exchange === "BIST";

  return (
    <div className="flex flex-col h-full animate-slide-up overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
      {/* Compact Header */}
      <div className="px-3 py-2.5 border-b border-border/60 flex items-center gap-2.5 bg-card shrink-0">
        <button onClick={() => setSelectedSymbol(null)} className="p-1.5 -ml-1 hover:bg-muted rounded-lg transition-colors active:scale-95">
          <ChevronLeft className="h-4.5 w-4.5 text-foreground" />
        </button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <SymbolLogo symbol={selectedSymbol.name} category={selectedSymbol.category} size="sm" />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-bold truncate">{selectedSymbol.name}</h2>
              {currentMarketStatus.isOpen ? (
                <span className="h-1.5 w-1.5 rounded-full bg-buy shrink-0 animate-pulse" />
              ) : (
                <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded bg-sell/10 text-sell">KAPALI</span>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground truncate leading-tight">{selectedSymbol.display_name}</p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <AnimatedPrice value={price} live={currentMarketStatus.isOpen} changePercent={selectedSymbol.change_percent ?? 0} className="text-base font-bold font-mono" />
          <span className={`text-[10px] font-mono font-semibold ${isPositive ? "text-buy" : "text-sell"}`}>
            {isPositive ? "+" : ""}{(selectedSymbol.change_percent ?? 0).toFixed(2)}%
          </span>
        </div>
      </div>

      {/* Chart — BIST stocks use custom chart, others use TradingView */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {isBISTStock ? (
          <BISTChart
            symbolId={selectedSymbol.id}
            symbolName={selectedSymbol.name}
            currentPrice={price}
            isPositive={isPositive}
            positions={openPositions.filter(p => p.symbol_name === selectedSymbol.name)}
          />
        ) : (
          <TradingViewChart
            symbolName={selectedSymbol.name}
            exchange={selectedSymbol.exchange}
            category={selectedSymbol.category}
          />
        )}
      </div>

      {/* Order Panel */}
      <OrderPanel
        symbol={selectedSymbol}
        userId={authUser?.id || ""}
        leverage={leverage}
        accountType={accountType}
        formatPrice={formatPrice}
      />
    </div>
  );
};

export default Trading;
