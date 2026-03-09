import { useState, useEffect, useRef, memo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";

interface Candle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const TIMEFRAMES = [
  { key: "1m", label: "1dk" },
  { key: "15m", label: "15dk" },
  { key: "1h", label: "1sa" },
  { key: "4h", label: "4sa" },
  { key: "1d", label: "1G" },
] as const;

type Timeframe = typeof TIMEFRAMES[number]["key"];

interface OpenPosition {
  id: string;
  type: "buy" | "sell";
  entry_price: number;
  stop_loss: number | null;
  take_profit: number | null;
  lots: number;
}

interface BISTChartProps {
  symbolId: string;
  symbolName: string;
  currentPrice: number;
  isPositive: boolean;
  positions?: OpenPosition[];
}

export const BISTChart = memo(({ symbolId, symbolName, currentPrice, isPositive, positions = [] }: BISTChartProps) => {
  const [timeframe, setTimeframe] = useState<Timeframe>("15m");
  const [candleData, setCandleData] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartVisibleCount, setChartVisibleCount] = useState(50);
  const [chartOffset, setChartOffset] = useState(0);
  const chartRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; dist: number } | null>(null);

  const formatPrice = (price: number) => {
    if (!price || price === 0) return "—";
    if (price < 1) return price.toFixed(5);
    if (price < 10) return price.toFixed(4);
    if (price < 1000) return price.toFixed(2);
    return price.toLocaleString("tr-TR", { minimumFractionDigits: 2 });
  };

  useEffect(() => {
    const loadCandles = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("candles")
        .select("bucket_time, open, high, low, close, volume")
        .eq("symbol_id", symbolId)
        .eq("timeframe", timeframe)
        .order("bucket_time", { ascending: true })
        .limit(500);

      if (data && data.length > 0) {
        setCandleData(data.map(c => ({
          time: c.bucket_time,
          open: Number(c.open),
          high: Number(c.high),
          low: Number(c.low),
          close: Number(c.close),
          volume: Number(c.volume),
        })));
      } else {
        // Generate simulated data based on current price
        const simulated = generateSimulatedCandles(currentPrice, timeframe);
        setCandleData(simulated);
      }
      setLoading(false);
      setChartOffset(0);
    };

    loadCandles();

    // Subscribe to realtime candle updates
    const channel = supabase
      .channel(`bist-candles-${symbolId}-${timeframe}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'candles',
        filter: `symbol_id=eq.${symbolId}`,
      }, (payload) => {
        if (payload.new && (payload.new as any).timeframe === timeframe) {
          const newCandle = payload.new as any;
          setCandleData(prev => {
            const exists = prev.find(c => c.time === newCandle.bucket_time);
            if (exists) {
              return prev.map(c => c.time === newCandle.bucket_time ? {
                time: newCandle.bucket_time,
                open: Number(newCandle.open),
                high: Number(newCandle.high),
                low: Number(newCandle.low),
                close: Number(newCandle.close),
                volume: Number(newCandle.volume),
              } : c);
            } else {
              return [...prev, {
                time: newCandle.bucket_time,
                open: Number(newCandle.open),
                high: Number(newCandle.high),
                low: Number(newCandle.low),
                close: Number(newCandle.close),
                volume: Number(newCandle.volume),
              }].slice(-500);
            }
          });
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [symbolId, timeframe, currentPrice]);

  const totalCandles = candleData.length;
  const clampedOffset = Math.min(chartOffset, Math.max(0, totalCandles - chartVisibleCount));
  const startIdx = Math.max(0, totalCandles - chartVisibleCount - clampedOffset);
  const endIdx = startIdx + chartVisibleCount;
  const displayCandles = candleData.slice(startIdx, endIdx);
  const chartHigh = displayCandles.length > 0 ? Math.max(...displayCandles.map(c => c.high)) : currentPrice * 1.01;
  const chartLow = displayCandles.length > 0 ? Math.min(...displayCandles.map(c => c.low)) : currentPrice * 0.99;
  const chartRange = chartHigh - chartLow || 1;

  const priceSteps = 5;
  const priceLevels = Array.from({ length: priceSteps + 1 }, (_, i) =>
    chartLow + (chartRange * i) / priceSteps
  );

  const zoomIn = () => setChartVisibleCount(prev => Math.max(15, prev - 10));
  const zoomOut = () => setChartVisibleCount(prev => Math.min(totalCandles, prev + 10));
  const resetZoom = () => { setChartVisibleCount(50); setChartOffset(0); };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      if (e.deltaY > 0) zoomOut(); else zoomIn();
    } else if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      setChartOffset(prev => Math.max(0, Math.min(totalCandles - chartVisibleCount, prev + (e.deltaX > 0 ? -3 : 3))));
    } else {
      if (e.deltaY > 0) zoomOut(); else zoomIn();
    }
  };

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

  if (loading && candleData.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-muted-foreground text-sm">Grafik yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Timeframe + OHLC Info Bar */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-border/40 bg-card/50 shrink-0">
        <div className="flex gap-0.5">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.key}
              onClick={() => setTimeframe(tf.key)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
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
          <div className="ml-auto flex items-center gap-2.5 text-[10px] font-mono text-muted-foreground">
            <span>A<span className="text-foreground/80 ml-0.5">{formatPrice(ohlcv.open)}</span></span>
            <span>Y<span className="text-buy/80 ml-0.5">{formatPrice(ohlcv.high)}</span></span>
            <span>D<span className="text-sell/80 ml-0.5">{formatPrice(ohlcv.low)}</span></span>
            <span>K<span className="text-foreground/80 ml-0.5">{formatPrice(ohlcv.close)}</span></span>
          </div>
        )}
      </div>

      {/* Chart Area */}
      <div className="flex-1 relative min-h-0">
        <div className="absolute top-2 left-2 z-20 flex gap-1">
          <button onClick={zoomIn} className="h-7 w-7 rounded-md bg-card/90 backdrop-blur-sm border border-border/40 flex items-center justify-center hover:bg-muted transition-colors active:scale-95">
            <ZoomIn className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          <button onClick={zoomOut} className="h-7 w-7 rounded-md bg-card/90 backdrop-blur-sm border border-border/40 flex items-center justify-center hover:bg-muted transition-colors active:scale-95">
            <ZoomOut className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          <button onClick={resetZoom} className="h-7 w-7 rounded-md bg-card/90 backdrop-blur-sm border border-border/40 flex items-center justify-center hover:bg-muted transition-colors active:scale-95">
            <Maximize2 className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>

        <div className="h-full flex">
          <div
            ref={chartRef}
            className="flex-1 relative overflow-hidden bg-background cursor-crosshair"
            onWheel={handleWheel}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
          >
            {/* Grid lines */}
            {priceLevels.map((_, i) => (
              <div
                key={i}
                className="absolute left-0 right-0 border-t border-border/10"
                style={{ bottom: `${(i / priceSteps) * 100}%` }}
              />
            ))}

            {/* Current price line */}
            <div
              className="absolute left-0 right-0 z-10 border-t-2 border-dashed"
              style={{
                bottom: `${Math.min(Math.max(((currentPrice - chartLow) / chartRange) * 100, 1), 99)}%`,
                borderColor: isPositive ? 'hsl(var(--buy))' : 'hsl(var(--sell))',
              }}
            >
              <span
                className={`absolute right-0 text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-l translate-y-[-50%] ${
                  isPositive ? "bg-buy text-buy-foreground" : "bg-sell text-sell-foreground"
                }`}
              >
                {formatPrice(currentPrice)}
              </span>
            </div>

            {/* Candlesticks */}
            <div className="absolute inset-0 flex items-end px-1 gap-[1px]">
              {displayCandles.map((candle, i) => {
                const isGreen = candle.close >= candle.open;
                const bodyTop = ((Math.max(candle.open, candle.close) - chartLow) / chartRange) * 100;
                const bodyBottom = ((Math.min(candle.open, candle.close) - chartLow) / chartRange) * 100;
                const wickTop = ((candle.high - chartLow) / chartRange) * 100;
                const wickBottom = ((candle.low - chartLow) / chartRange) * 100;
                const bodyHeight = Math.max(bodyTop - bodyBottom, 0.5);

                return (
                  <div key={i} className="relative flex-1" style={{ height: "100%", minWidth: "3px" }}>
                    <div
                      className={`absolute left-1/2 -translate-x-1/2 ${isGreen ? "bg-buy/70" : "bg-sell/70"}`}
                      style={{ bottom: `${wickBottom}%`, height: `${wickTop - wickBottom}%`, width: "1px" }}
                    />
                    <div
                      className={`absolute left-[15%] right-[15%] rounded-[1px] ${isGreen ? "bg-buy" : "bg-sell"}`}
                      style={{ bottom: `${bodyBottom}%`, height: `${bodyHeight}%` }}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Y-axis price labels */}
          <div className="w-14 shrink-0 border-l border-border/20 flex flex-col justify-between py-2 bg-background">
            {[...priceLevels].reverse().map((p, i) => (
              <span key={i} className="text-[9px] font-mono text-muted-foreground/80 text-right pr-1.5 leading-none">
                {formatPrice(p)}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});

BISTChart.displayName = "BISTChart";

// Generate simulated candle data for when DB has no data yet
function generateSimulatedCandles(basePrice: number, timeframe: Timeframe): Candle[] {
  const count = 100;
  const candles: Candle[] = [];
  let price = basePrice * 0.95; // Start slightly lower
  const volatility = basePrice * 0.005; // 0.5% volatility

  const now = new Date();
  let interval: number;
  switch (timeframe) {
    case "1m": interval = 60 * 1000; break;
    case "15m": interval = 15 * 60 * 1000; break;
    case "1h": interval = 60 * 60 * 1000; break;
    case "4h": interval = 4 * 60 * 60 * 1000; break;
    case "1d": interval = 24 * 60 * 60 * 1000; break;
    default: interval = 15 * 60 * 1000;
  }

  for (let i = 0; i < count; i++) {
    const time = new Date(now.getTime() - (count - i) * interval);
    const change = (Math.random() - 0.48) * volatility; // Slight upward bias
    const open = price;
    price = Math.max(price + change, basePrice * 0.8);
    const close = price;
    const high = Math.max(open, close) + Math.random() * volatility * 0.5;
    const low = Math.min(open, close) - Math.random() * volatility * 0.5;
    const volume = Math.floor(Math.random() * 10000 + 1000);

    candles.push({ time: time.toISOString(), open, high, low, close, volume });
  }

  // Make sure the last candle's close is close to current price
  if (candles.length > 0) {
    const lastCandle = candles[candles.length - 1];
    lastCandle.close = basePrice;
    lastCandle.high = Math.max(lastCandle.high, basePrice);
    lastCandle.low = Math.min(lastCandle.low, basePrice);
  }

  return candles;
}
