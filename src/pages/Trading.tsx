import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSearchParams } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { AnimatedPrice } from "@/components/AnimatedPrice";
import { SymbolLogo } from "@/components/SymbolLogo";
import { getMarketStatus } from "@/lib/marketHours";
import { generateCandleData } from "@/data/mockData";
import { SymbolList, type DBSymbol } from "@/components/trading/SymbolList";
import { CandlestickChart, type Timeframe } from "@/components/trading/CandlestickChart";
import { OrderPanel } from "@/components/trading/OrderPanel";

interface CandleRow {
  bucket_time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const Trading = () => {
  const { user: authUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedSymbol, setSelectedSymbol] = useState<DBSymbol | null>(null);
  const [symbols, setSymbols] = useState<DBSymbol[]>([]);
  const [loading, setLoading] = useState(true);
  const [leverage, setLeverage] = useState("1:200");
  const [accountType, setAccountType] = useState("standard");
  const [timeframe, setTimeframe] = useState<Timeframe>("15m");
  const [realCandles, setRealCandles] = useState<CandleRow[]>([]);
  const [candlesLoading, setCandlesLoading] = useState(false);
  const [chartVisibleCount, setChartVisibleCount] = useState(50);
  const [chartOffset, setChartOffset] = useState(0);

  // Load user leverage from profile
  useEffect(() => {
    if (authUser) {
      supabase.from("profiles").select("leverage, account_type").eq("user_id", authUser.id).single().then(({ data }) => {
        if (data?.leverage) setLeverage(data.leverage);
        if (data?.account_type) setAccountType(data.account_type);
      });
    }
  }, [authUser]);

  useEffect(() => {
    loadSymbols();

    // Realtime subscription for symbols — no polling needed
    const channel = supabase
      .channel('trading-symbols')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'symbols',
      }, (payload) => {
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

  // Auto-select symbol from URL
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

  // Fetch candle data
  const loadCandles = useCallback(async (symbolId: string, tf: Timeframe) => {
    setCandlesLoading(true);
    const limits: Record<string, number> = { "1m": 120, "15m": 96, "1h": 168, "4h": 120, "1d": 90 };
    const { data, error } = await supabase
      .from("candles")
      .select("bucket_time, open, high, low, close, volume")
      .eq("symbol_id", symbolId)
      .eq("timeframe", tf)
      .order("bucket_time", { ascending: true })
      .limit(limits[tf] || 100);
    if (!error && data && data.length > 0) {
      setRealCandles(data as CandleRow[]);
    } else {
      setRealCandles([]);
    }
    setCandlesLoading(false);
  }, []);

  useEffect(() => {
    if (selectedSymbol) loadCandles(selectedSymbol.id, timeframe);
  }, [selectedSymbol?.id, timeframe, loadCandles]);

  // Realtime candles
  useEffect(() => {
    if (!selectedSymbol) return;
    const channel = supabase
      .channel(`candles-${selectedSymbol.id}-${timeframe}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'candles', filter: `symbol_id=eq.${selectedSymbol.id}` }, (payload) => {
        if (payload.new) {
          const newCandle = payload.new as any;
          if (newCandle.timeframe !== timeframe) return;
          setRealCandles(prev => {
            const exists = prev.findIndex(c => c.bucket_time === newCandle.bucket_time);
            if (exists >= 0) { const updated = [...prev]; updated[exists] = newCandle; return updated; }
            return [...prev, newCandle].slice(-200);
          });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedSymbol?.id, timeframe]);

  const mockCandleData = useMemo(() => generateCandleData(selectedSymbol?.current_price || 100, 80), [selectedSymbol?.id]);

  const candleData = realCandles.length > 0
    ? realCandles.map(c => ({ time: c.bucket_time, open: Number(c.open), high: Number(c.high), low: Number(c.low), close: Number(c.close), volume: Number(c.volume) }))
    : mockCandleData;

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
  const currentMarketStatus = getMarketStatus(selectedSymbol.name, selectedSymbol.category);
  const isPositive = (selectedSymbol.change_percent ?? 0) >= 0;

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] animate-slide-up overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
      {/* Compact Header */}
      <div className="px-3 py-2.5 border-b border-border/60 flex items-center gap-2.5 bg-card">
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

      <CandlestickChart
        candleData={candleData}
        price={price}
        isPositive={isPositive}
        timeframe={timeframe}
        onTimeframeChange={setTimeframe}
        chartVisibleCount={chartVisibleCount}
        setChartVisibleCount={setChartVisibleCount}
        chartOffset={chartOffset}
        setChartOffset={setChartOffset}
        formatPrice={formatPrice}
      />

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
