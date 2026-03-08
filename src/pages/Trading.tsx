import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { generateCandleData } from "@/data/mockData";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Search, Minus, Plus, ChevronLeft, Gem, BarChart3, Bitcoin, Building2, Globe, ZoomIn, ZoomOut, Maximize2, ChevronDown } from "lucide-react";
import { AnimatedPrice } from "@/components/AnimatedPrice";
import { SymbolLogo } from "@/components/SymbolLogo";
import { resolveLogoUrl } from "@/data/symbolLogos";
import { getMarketStatus } from "@/lib/marketHours";
import { toast } from "sonner";
import { getSpread as calcSpread } from "@/lib/trading";

interface CandleRow {
  bucket_time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const TIMEFRAMES = [
  { key: "1m", label: "1D" },
  { key: "15m", label: "15D" },
  { key: "1h", label: "1S" },
  { key: "4h", label: "4S" },
  { key: "1d", label: "1G" },
] as const;

type Timeframe = typeof TIMEFRAMES[number]["key"];

interface DBSymbol {
  id: string;
  name: string;
  display_name: string;
  category: string;
  exchange: string | null;
  current_price: number;
  change_percent: number;
  high: number;
  low: number;
  volume: number;
}

const categories = [
  { key: "all", label: "Tümü", icon: Globe },
  { key: "stock", label: "Hisse", icon: Building2 },
  { key: "commodity", label: "Emtia", icon: Gem },
  { key: "index", label: "Endeks", icon: BarChart3 },
  { key: "crypto", label: "Kripto", icon: Bitcoin },
];

const CONTRACT_SIZE = 100000; // Standard forex lot size (unused but kept for reference)

const Trading = () => {
  const { user: authUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSymbol, setSelectedSymbol] = useState<DBSymbol | null>(null);
  const [symbols, setSymbols] = useState<DBSymbol[]>([]);
  const [loading, setLoading] = useState(true);
  const [lots, setLots] = useState(0.1);
  const [leverage, setLeverage] = useState("1:200");
  const [accountType, setAccountType] = useState("standard");
  const [orderType, setOrderType] = useState<"market" | "buy_limit" | "sell_limit" | "buy_stop" | "sell_stop">("market");
  const [targetPrice, setTargetPrice] = useState("");
  const [orderTypeOpen, setOrderTypeOpen] = useState(false);
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [timeframe, setTimeframe] = useState<Timeframe>("15m");
  const [realCandles, setRealCandles] = useState<CandleRow[]>([]);
  const [candlesLoading, setCandlesLoading] = useState(false);
  const [chartVisibleCount, setChartVisibleCount] = useState(50);
  const [chartOffset, setChartOffset] = useState(0); // 0 = latest candles
  const chartRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; dist: number } | null>(null);

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

    // Realtime subscription for symbols
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

    // Poll every 1s for fluid price updates
    const interval = setInterval(() => {
      loadSymbols();
    }, 1000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
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

  // Auto-select symbol from URL query param
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

  const filteredSymbols = symbols
    .filter((s) => {
      const matchesCategory = selectedCategory === "all" || s.category === selectedCategory;
      const matchesSearch =
        !searchQuery ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.display_name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => {
      // Always put items without logos at the bottom
      const aHasLogo = resolveLogoUrl(a.name, a.category) ? 0 : 1;
      const bHasLogo = resolveLogoUrl(b.name, b.category) ? 0 : 1;
      if (aHasLogo !== bHasLogo) return aHasLogo - bHasLogo;
      if (selectedCategory === "all" || selectedCategory === "stock") {
        // Among those with logos, BIST stocks first (identified by known BIST tickers)
        const BIST_NAMES = new Set([
          "THYAO","GARAN","AKBNK","SISE","EREGL","KCHOL","SAHOL","TUPRS","YKBNK",
          "ISCTR","ASELS","BIMAS","PGSUS","EKGYO","PETKM","TOASO","TAVHL","FROTO",
          "TCELL","HALKB","VAKBN","DOHOL","ENKAI","ARCLK","VESTL","MGROS","SOKM",
          "GUBRF","SASA","OYAKC","TTKOM","TSKB","AKSA","CIMSA","AEFES","ULKER",
          "DOAS","OTKAR","ISGYO","KRDMD","GESAN","KONTR","ODAS","BRYAT","TTRAK",
          "EUPWR","AGHOL","MAVI","LOGO",
        ]);
        const aIsBist = a.category === "stock" && BIST_NAMES.has(a.name) ? 0 : 1;
        const bIsBist = b.category === "stock" && BIST_NAMES.has(b.name) ? 0 : 1;
        if (aIsBist !== bIsBist) return aIsBist - bIsBist;
      }
      if (selectedCategory === "all" || selectedCategory === "commodity") {
        const COMMODITY_ORDER = ["XAUUSD", "XAGUSD"];
        const aIdx = COMMODITY_ORDER.indexOf(a.name);
        const bIdx = COMMODITY_ORDER.indexOf(b.name);
        const aPri = aIdx >= 0 ? aIdx : 999;
        const bPri = bIdx >= 0 ? bIdx : 999;
        if (aPri !== bPri) return aPri - bPri;
      }
      // Crypto: sort by price descending
      if ((selectedCategory === "crypto") || (selectedCategory === "all" && a.category === "crypto" && b.category === "crypto")) {
        return (b.current_price || 0) - (a.current_price || 0);
      }
      return a.name.localeCompare(b.name);
    });

  // Fetch real candle data from DB
  const loadCandles = useCallback(async (symbolId: string, tf: Timeframe) => {
    setCandlesLoading(true);
    const limits: Record<string, number> = { "1m": 120, "15m": 96, "1h": 168, "4h": 120, "1d": 90 };
    const limit = limits[tf] || 100;
    const { data, error } = await supabase
      .from("candles")
      .select("bucket_time, open, high, low, close, volume")
      .eq("symbol_id", symbolId)
      .eq("timeframe", tf)
      .order("bucket_time", { ascending: true })
      .limit(limit);
    if (!error && data && data.length > 0) {
      setRealCandles(data as CandleRow[]);
    } else {
      setRealCandles([]);
    }
    setCandlesLoading(false);
  }, []);

  // Load candles when symbol or timeframe changes
  useEffect(() => {
    if (selectedSymbol) {
      loadCandles(selectedSymbol.id, timeframe);
    }
  }, [selectedSymbol?.id, timeframe, loadCandles]);

  // Realtime subscription for new candles
  useEffect(() => {
    if (!selectedSymbol) return;
    const channel = supabase
      .channel(`candles-${selectedSymbol.id}-${timeframe}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'candles',
        filter: `symbol_id=eq.${selectedSymbol.id}`,
      }, (payload) => {
        if (payload.new) {
          const newCandle = payload.new as any;
          if (newCandle.timeframe !== timeframe) return;
          setRealCandles(prev => {
            const exists = prev.findIndex(c => c.bucket_time === newCandle.bucket_time);
            if (exists >= 0) {
              const updated = [...prev];
              updated[exists] = newCandle;
              return updated;
            }
            return [...prev, newCandle].slice(-200);
          });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedSymbol?.id, timeframe]);

  // Fallback mock data when no real candles exist
  const mockCandleData = useMemo(
    () => generateCandleData(selectedSymbol?.current_price || 100, 80),
    [selectedSymbol?.id]
  );

  // Use real candles if available, otherwise mock
  const candleData = realCandles.length > 0
    ? realCandles.map(c => ({ time: c.bucket_time, open: Number(c.open), high: Number(c.high), low: Number(c.low), close: Number(c.close), volume: Number(c.volume) }))
    : mockCandleData;

  const quickLots = [0.01, 0.05, 0.1, 0.5, 1.0, 5.0];

  // Spread is now calculated via trading.ts based on account type

  const [orderLoading, setOrderLoading] = useState(false);

  const handleOrder = async (type: "buy" | "sell") => {
    if (!selectedSymbol || !authUser) return;

    const isPending = orderType !== "market";
    const pendingTargetPrice = isPending ? parseFloat(targetPrice) : null;

    // Validate target price for pending orders
    if (isPending) {
      if (!pendingTargetPrice || isNaN(pendingTargetPrice) || pendingTargetPrice <= 0) {
        toast.error("Bekleyen emir için geçerli bir hedef fiyat girin.");
        return;
      }
      const midPrice = selectedSymbol.current_price || 0;
      if (orderType === "buy_limit" && pendingTargetPrice >= midPrice) {
        toast.error("Buy Limit fiyatı güncel fiyatın altında olmalıdır.");
        return;
      }
      if (orderType === "sell_limit" && pendingTargetPrice <= midPrice) {
        toast.error("Sell Limit fiyatı güncel fiyatın üzerinde olmalıdır.");
        return;
      }
      if (orderType === "buy_stop" && pendingTargetPrice <= midPrice) {
        toast.error("Buy Stop fiyatı güncel fiyatın üzerinde olmalıdır.");
        return;
      }
      if (orderType === "sell_stop" && pendingTargetPrice >= midPrice) {
        toast.error("Sell Stop fiyatı güncel fiyatın altında olmalıdır.");
        return;
      }
    }

    // Check market hours
    const status = getMarketStatus(selectedSymbol.name, selectedSymbol.category);
    if (!status.isOpen) {
      toast.error("Piyasa kapalı. Bu enstrümanda şu an işlem açılamaz.", {
        description: status.scheduleLabel,
      });
      return;
    }

    // Check balance
    const { data: profileData } = await supabase
      .from("profiles")
      .select("balance")
      .eq("user_id", authUser.id)
      .single();

    if (!profileData || profileData.balance <= 0) {
      toast.error("Yetersiz bakiye. İşlem açmak için hesabınıza para yatırın.");
      return;
    }

    setOrderLoading(true);
    try {
      const midPrice = selectedSymbol.current_price || 0;
      const slValue = stopLoss ? parseFloat(stopLoss) : null;
      const tpValue = takeProfit ? parseFloat(takeProfit) : null;

      let entryPrice: number;
      if (isPending) {
        // For pending orders, entry_price is 0 (set when triggered), target_price is the desired price
        entryPrice = 0;
      } else {
        const currentSpread = calcSpread(selectedSymbol.name, midPrice, accountType);
        entryPrice = type === "buy" ? midPrice + currentSpread / 2 : midPrice - currentSpread / 2;
      }

      // SL/TP validation (use target price for pending, entry price for market)
      const refPrice = isPending ? pendingTargetPrice! : entryPrice;
      if (type === "buy") {
        if (slValue !== null && slValue >= refPrice) {
          toast.error("Alış emrinde Zarar Durdur, fiyatın altında olmalıdır.");
          setOrderLoading(false);
          return;
        }
        if (tpValue !== null && tpValue <= refPrice) {
          toast.error("Alış emrinde Kâr Al, fiyatın üzerinde olmalıdır.");
          setOrderLoading(false);
          return;
        }
      } else {
        if (slValue !== null && slValue <= refPrice) {
          toast.error("Satış emrinde Zarar Durdur, fiyatın üzerinde olmalıdır.");
          setOrderLoading(false);
          return;
        }
        if (tpValue !== null && tpValue >= refPrice) {
          toast.error("Satış emrinde Kâr Al, fiyatın altında olmalıdır.");
          setOrderLoading(false);
          return;
        }
      }

      const insertData: any = {
        user_id: authUser.id,
        symbol_id: selectedSymbol.id,
        symbol_name: selectedSymbol.name,
        type,
        order_type: orderType,
        lots,
        leverage,
        entry_price: entryPrice,
        current_price: midPrice,
        stop_loss: slValue,
        take_profit: tpValue,
        status: isPending ? "pending" : "open",
        target_price: pendingTargetPrice,
      };

      const { error } = await supabase.from("orders").insert(insertData);
      if (error) throw error;

      const orderTypeLabels: Record<string, string> = {
        market: type === "buy" ? "ALIŞ" : "SATIŞ",
        buy_limit: "BUY LIMIT",
        sell_limit: "SELL LIMIT",
        buy_stop: "BUY STOP",
        sell_stop: "SELL STOP",
      };

      toast.success(`${selectedSymbol.name} ${orderTypeLabels[orderType]} emri verildi`, {
        description: isPending ? `${lots} lot @ ${formatPrice(pendingTargetPrice!)}` : `${lots} lot`,
      });
      setStopLoss("");
      setTakeProfit("");
      setTargetPrice("");
      setOrderType("market");
      navigate("/dashboard");
    } catch (err: any) {
      toast.error("Emir başarısız: " + err.message);
    }
    setOrderLoading(false);
  };

  const categoryLabel = (cat: string) => categories.find((c) => c.key === cat)?.label ?? cat;

  const countByCategory = (cat: string) =>
    cat === "all" ? symbols.length : symbols.filter((s) => s.category === cat).length;

  const formatPrice = (price: number) => {
    if (!price || price === 0) return "—";
    if (price < 1) return price.toFixed(5);
    if (price < 10) return price.toFixed(4);
    if (price < 1000) return price.toFixed(2);
    return price.toLocaleString("tr-TR", { minimumFractionDigits: 2 });
  };

  // Symbol list view
  if (!selectedSymbol) {
    return (
      <div className="flex flex-col h-[calc(100vh-3.5rem)] animate-slide-up">
        <div className="p-3 border-b border-border space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Sembol ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-muted/50 h-9 text-sm"
            />
          </div>
          <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(cat.key)}
                className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <cat.icon className="h-3 w-3" />
                {cat.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : filteredSymbols.length === 0 ? (
            <div className="text-center py-16 text-sm text-muted-foreground">Enstrüman bulunamadı.</div>
          ) : (
            filteredSymbols.map((symbol) => {
              const marketStatus = getMarketStatus(symbol.name, symbol.category);
              return (
                <button
                  key={symbol.id}
                  onClick={() => setSelectedSymbol(symbol)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 active:bg-muted/50 transition-all border-b border-border/30"
                >
                  <SymbolLogo symbol={symbol.name} category={symbol.category} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{symbol.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{symbol.display_name}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <AnimatedPrice value={symbol.current_price} live={marketStatus.isOpen} changePercent={symbol.change_percent ?? 0} className="text-sm font-mono font-semibold" />
                    <div className="flex items-center justify-end gap-1 mt-0.5">
                      {!marketStatus.isOpen && (
                        <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          KAPALI
                        </span>
                      )}
                      <span
                        className={`inline-flex items-center text-[11px] font-mono font-medium px-1.5 py-0.5 rounded ${
                          (symbol.change_percent ?? 0) >= 0 ? "bg-buy/10 text-buy" : "bg-sell/10 text-sell"
                        }`}
                      >
                        {(symbol.change_percent ?? 0) >= 0 ? "+" : ""}
                        {(symbol.change_percent ?? 0).toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    );
  }

  // Symbol detail + chart + order panel
  const price = selectedSymbol.current_price || 0;
  const spread = calcSpread(selectedSymbol.name, price, accountType);
  const bid = price - spread / 2;
  const ask = price + spread / 2;
  const currentMarketStatus = getMarketStatus(selectedSymbol.name, selectedSymbol.category);

  // Chart calculations with zoom
  const totalCandles = candleData.length;
  const clampedOffset = Math.min(chartOffset, Math.max(0, totalCandles - chartVisibleCount));
  const startIdx = Math.max(0, totalCandles - chartVisibleCount - clampedOffset);
  const endIdx = startIdx + chartVisibleCount;
  const displayCandles = candleData.slice(startIdx, endIdx);
  const chartHigh = Math.max(...displayCandles.map(c => c.high));
  const chartLow = Math.min(...displayCandles.map(c => c.low));
  const chartRange = chartHigh - chartLow || 1;

  // Price levels for Y-axis
  const priceSteps = 5;
  const priceLevels = Array.from({ length: priceSteps + 1 }, (_, i) =>
    chartLow + (chartRange * i) / priceSteps
  );

  const zoomIn = () => setChartVisibleCount(prev => Math.max(15, prev - 10));
  const zoomOut = () => setChartVisibleCount(prev => Math.min(totalCandles, prev + 10));
  const resetZoom = () => { setChartVisibleCount(50); setChartOffset(0); };

  // Mouse wheel zoom on chart
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      if (e.deltaY > 0) zoomOut();
      else zoomIn();
    } else if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      setChartOffset(prev => Math.max(0, Math.min(totalCandles - chartVisibleCount, prev + (e.deltaX > 0 ? -3 : 3))));
    } else {
      if (e.deltaY > 0) zoomOut();
      else zoomIn();
    }
  };

  // Touch gestures for pan
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartRef.current = { x: e.touches[0].clientX, dist: 0 };
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      touchStartRef.current = { x: 0, dist };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    if (e.touches.length === 1 && touchStartRef.current.dist === 0) {
      const dx = e.touches[0].clientX - touchStartRef.current.x;
      if (Math.abs(dx) > 10) {
        const candlesMoved = Math.round(dx / 8);
        setChartOffset(prev => Math.max(0, Math.min(totalCandles - chartVisibleCount, prev + candlesMoved)));
        touchStartRef.current.x = e.touches[0].clientX;
      }
    } else if (e.touches.length === 2 && touchStartRef.current.dist > 0) {
      const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      const diff = dist - touchStartRef.current.dist;
      if (Math.abs(diff) > 15) {
        if (diff > 0) setChartVisibleCount(prev => Math.max(15, prev - 5));
        else setChartVisibleCount(prev => Math.min(totalCandles, prev + 5));
        touchStartRef.current.dist = dist;
      }
    }
  };

  const ohlcv = displayCandles.length > 0 ? displayCandles[displayCandles.length - 1] : null;
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

      {/* Timeframe + OHLC Info Bar */}
      <div className="flex items-center gap-1 px-2 py-1 border-b border-border/40 bg-card/50">
        <div className="flex gap-0.5">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.key}
              onClick={() => setTimeframe(tf.key)}
              className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all ${
                timeframe === tf.key
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
        {ohlcv && (
          <div className="ml-auto flex items-center gap-2 text-[9px] font-mono text-muted-foreground">
            <span>O<span className="text-foreground/70 ml-0.5">{formatPrice(ohlcv.open)}</span></span>
            <span>H<span className="text-buy/70 ml-0.5">{formatPrice(ohlcv.high)}</span></span>
            <span>L<span className="text-sell/70 ml-0.5">{formatPrice(ohlcv.low)}</span></span>
            <span>C<span className="text-foreground/70 ml-0.5">{formatPrice(ohlcv.close)}</span></span>
          </div>
        )}
      </div>

      {/* Chart Area */}
      <div className="h-[260px] md:flex-1 md:h-auto min-h-[220px] relative shrink-0 bg-background">
        {/* Zoom controls overlay */}
        <div className="absolute top-1.5 left-1.5 z-20 flex gap-0.5">
          <button onClick={() => zoomIn()} className="h-6 w-6 rounded-md bg-card/90 backdrop-blur-sm border border-border/40 flex items-center justify-center hover:bg-muted transition-colors active:scale-95">
            <ZoomIn className="h-3 w-3 text-muted-foreground" />
          </button>
          <button onClick={() => zoomOut()} className="h-6 w-6 rounded-md bg-card/90 backdrop-blur-sm border border-border/40 flex items-center justify-center hover:bg-muted transition-colors active:scale-95">
            <ZoomOut className="h-3 w-3 text-muted-foreground" />
          </button>
          <button onClick={resetZoom} className="h-6 w-6 rounded-md bg-card/90 backdrop-blur-sm border border-border/40 flex items-center justify-center hover:bg-muted transition-colors active:scale-95">
            <Maximize2 className="h-3 w-3 text-muted-foreground" />
          </button>
        </div>


        <div className="h-full flex">
          {/* Candle area */}
          <div
            ref={chartRef}
            className="flex-1 relative overflow-hidden bg-background cursor-crosshair"
            onWheel={handleWheel}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
          >
            {/* Horizontal grid lines */}
            {priceLevels.map((_, i) => (
              <div
                key={i}
                className="absolute left-0 right-0 border-t border-border/10"
                style={{ bottom: `${(i / priceSteps) * 100}%` }}
              />
            ))}

            {/* Current price line */}
            <div
              className="absolute left-0 right-0 z-10 border-t border-dashed"
              style={{
                bottom: `${Math.min(Math.max(((price - chartLow) / chartRange) * 100, 1), 99)}%`,
                borderColor: isPositive ? 'hsl(var(--buy))' : 'hsl(var(--sell))',
              }}
            >
              <span
                className={`absolute right-0 text-[9px] font-mono px-1 py-px rounded-l translate-y-[-50%] ${
                  isPositive ? "bg-buy text-buy-foreground" : "bg-sell text-sell-foreground"
                }`}
              >
                {formatPrice(price)}
              </span>
            </div>

            {/* Candles */}
            <div className="absolute inset-0 flex items-end px-0.5 gap-px">
              {displayCandles.map((candle, i) => {
                const isGreen = candle.close >= candle.open;
                const bodyTop = ((Math.max(candle.open, candle.close) - chartLow) / chartRange) * 100;
                const bodyBottom = ((Math.min(candle.open, candle.close) - chartLow) / chartRange) * 100;
                const wickTop = ((candle.high - chartLow) / chartRange) * 100;
                const wickBottom = ((candle.low - chartLow) / chartRange) * 100;
                const bodyHeight = Math.max(bodyTop - bodyBottom, 0.3);

                return (
                  <div key={i} className="relative flex-1" style={{ height: "100%", minWidth: "2px" }}>
                    <div
                      className={`absolute left-1/2 -translate-x-1/2 ${isGreen ? "bg-buy/80" : "bg-sell/80"}`}
                      style={{ bottom: `${wickBottom}%`, height: `${wickTop - wickBottom}%`, width: "1px" }}
                    />
                    <div
                      className={`absolute left-[10%] right-[10%] rounded-[0.5px] ${isGreen ? "bg-buy" : "bg-sell"}`}
                      style={{ bottom: `${bodyBottom}%`, height: `${bodyHeight}%` }}
                    />
                  </div>
                );
              })}
            </div>

            {/* Volume bars at bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-[12%] flex items-end px-0.5 gap-px opacity-15">
              {displayCandles.map((candle, i) => {
                const maxVol = Math.max(...displayCandles.map(c => c.volume));
                const volHeight = (candle.volume / maxVol) * 100;
                const isGreen = candle.close >= candle.open;
                return (
                  <div
                    key={i}
                    className={`flex-1 rounded-t-sm ${isGreen ? "bg-buy" : "bg-sell"}`}
                    style={{ height: `${volHeight}%`, minWidth: "2px" }}
                  />
                );
              })}
            </div>
          </div>

          {/* Y-axis price labels */}
          <div className="w-12 sm:w-14 shrink-0 border-l border-border/20 flex flex-col justify-between py-1.5 bg-background">
            {[...priceLevels].reverse().map((p, i) => (
              <span key={i} className="text-[8px] font-mono text-muted-foreground/70 text-right pr-1 leading-none">
                {formatPrice(p)}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Bid/Ask mini strip */}
      <div className="flex items-center border-y border-border/40 bg-card/50">
        <div className="flex-1 flex items-center justify-center gap-1 py-1.5 border-r border-border/30">
          <span className="text-[9px] text-muted-foreground font-medium">BID</span>
          <span className="text-xs font-mono font-bold text-sell">{formatPrice(bid)}</span>
        </div>
        <div className="flex-1 flex items-center justify-center gap-1 py-1.5">
          <span className="text-[9px] text-muted-foreground font-medium">ASK</span>
          <span className="text-xs font-mono font-bold text-buy">{formatPrice(ask)}</span>
        </div>
      </div>

      {/* Order Panel */}
      <div className="border-t border-border bg-card p-3 space-y-3 overflow-y-auto flex-1 md:flex-none md:overflow-visible">
        {/* Market closed warning */}
        {!currentMarketStatus.isOpen && (
          <div className="text-center py-1.5 px-3 rounded-lg bg-muted text-muted-foreground text-xs font-medium">
            Piyasa kapalı
          </div>
        )}

        {/* Order Type Dropdown */}
        <div className="relative">
          <button
            onClick={() => setOrderTypeOpen(!orderTypeOpen)}
            className="w-full flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2 text-xs font-semibold transition-colors hover:bg-muted/70 active:bg-muted"
          >
            <span className={
              orderType === "market" ? "text-foreground" :
              orderType.startsWith("buy") ? "text-buy" : "text-sell"
            }>
              {orderType === "market" ? "Piyasa" : orderType === "buy_limit" ? "Buy Limit" : orderType === "sell_limit" ? "Sell Limit" : orderType === "buy_stop" ? "Buy Stop" : "Sell Stop"}
            </span>
            <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${orderTypeOpen ? "rotate-180" : ""}`} />
          </button>

           {orderTypeOpen && (
             <>
               {/* Backdrop to close on outside tap */}
               <div className="fixed inset-0 z-40" onClick={() => setOrderTypeOpen(false)} />
               <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                {([
                  { key: "market" as const, label: "Piyasa", desc: "Anlık piyasa fiyatından" },
                  { key: "buy_limit" as const, label: "Buy Limit", desc: "Fiyat düşünce al" },
                  { key: "sell_limit" as const, label: "Sell Limit", desc: "Fiyat yükselince sat" },
                  { key: "buy_stop" as const, label: "Buy Stop", desc: "Fiyat yükselince al" },
                  { key: "sell_stop" as const, label: "Sell Stop", desc: "Fiyat düşünce sat" },
                ]).map((ot) => {
                  const isActive = orderType === ot.key;
                  const isBuy = ot.key.startsWith("buy");
                  return (
                    <button
                      key={ot.key}
                      onClick={() => { setOrderType(ot.key); setOrderTypeOpen(false); }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors active:bg-muted/80 ${
                        isActive ? "bg-muted/60" : "hover:bg-muted/30"
                      }`}
                    >
                      <div>
                        <span className={`text-xs font-semibold ${
                          ot.key === "market" ? "text-foreground" : isBuy ? "text-buy" : "text-sell"
                        }`}>{ot.label}</span>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{ot.desc}</p>
                      </div>
                      {isActive && <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Target Price for pending orders */}
        {orderType !== "market" && (
          <div className="relative">
            <label className="text-[10px] text-muted-foreground mb-0.5 block">Hedef Fiyat</label>
            <Input
              type="number"
              step="any"
              placeholder="Tetikleme fiyatı girin"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              className="bg-muted/50 h-9 text-xs font-mono pr-16"
            />
            <span className="absolute right-3 top-[22px] text-[10px] text-muted-foreground font-mono">
              Şuan: {formatPrice(price)}
            </span>
          </div>
        )}

        {/* Lots row */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={() => setLots(Math.max(0.01, parseFloat((lots - 0.01).toFixed(2))))}>
            <Minus className="h-3 w-3" />
          </Button>
          <Input type="number" value={lots} onChange={(e) => setLots(parseFloat(e.target.value) || 0)} className="text-center font-mono bg-muted/50 h-8 text-sm" step={0.01} />
          <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={() => setLots(parseFloat((lots + 0.01).toFixed(2)))}>
            <Plus className="h-3 w-3" />
          </Button>
        </div>

        {/* Quick lots */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {quickLots.map((l) => (
            <button
              key={l}
              onClick={() => setLots(l)}
              className={`px-2.5 py-1 rounded text-xs font-mono font-medium whitespace-nowrap transition-colors ${
                lots === l ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        {/* SL / TP */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-muted-foreground mb-0.5 block">Zarar Durdur (SL)</label>
            <Input type="number" placeholder="Opsiyonel" value={stopLoss} onChange={(e) => setStopLoss(e.target.value)} className="bg-muted/50 h-8 text-xs font-mono" />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground mb-0.5 block">Kâr Al (TP)</label>
            <Input type="number" placeholder="Opsiyonel" value={takeProfit} onChange={(e) => setTakeProfit(e.target.value)} className="bg-muted/50 h-8 text-xs font-mono" />
          </div>
        </div>

        {/* Action Buttons */}
        {orderType === "market" ? (
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={() => handleOrder("sell")} disabled={orderLoading || !currentMarketStatus.isOpen} className="h-14 bg-sell hover:bg-sell/90 text-sell-foreground font-bold disabled:opacity-50 flex flex-col items-center gap-0.5">
              <span className="text-xs opacity-80">SAT</span>
              <span className="text-sm font-mono">{formatPrice(bid)}</span>
            </Button>
            <Button onClick={() => handleOrder("buy")} disabled={orderLoading || !currentMarketStatus.isOpen} className="h-14 bg-buy hover:bg-buy/90 text-buy-foreground font-bold disabled:opacity-50 flex flex-col items-center gap-0.5">
              <span className="text-xs opacity-80">AL</span>
              <span className="text-sm font-mono">{formatPrice(ask)}</span>
            </Button>
          </div>
        ) : (
          <Button
            onClick={() => handleOrder(orderType.startsWith("buy") ? "buy" : "sell")}
            disabled={orderLoading || !currentMarketStatus.isOpen || !targetPrice}
            className={`w-full h-12 font-bold disabled:opacity-50 ${
              orderType.startsWith("buy")
                ? "bg-buy hover:bg-buy/90 text-buy-foreground"
                : "bg-sell hover:bg-sell/90 text-sell-foreground"
            }`}
          >
            {orderType === "buy_limit" ? "BUY LIMIT" : orderType === "sell_limit" ? "SELL LIMIT" : orderType === "buy_stop" ? "BUY STOP" : "SELL STOP"}
            {targetPrice ? ` @ ${formatPrice(parseFloat(targetPrice))}` : " Emri Ver"}
          </Button>
        )}
      </div>

    </div>
  );
};

export default Trading;
