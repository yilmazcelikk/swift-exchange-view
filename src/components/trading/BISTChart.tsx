import { useState, useEffect, useRef, memo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

interface Candle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const TIMEFRAMES = [
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
  const [chartVisibleCount, setChartVisibleCount] = useState(40);
  const [chartOffset, setChartOffset] = useState(0);
  const chartRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number; dist: number; time: number } | null>(null);
  const isDraggingRef = useRef(false);

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
        const simulated = generateSimulatedCandles(currentPrice, timeframe, symbolName);
        setCandleData(simulated);
      }
      setLoading(false);
      setChartOffset(0);
    };

    loadCandles();

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
  const maxOffset = Math.max(0, totalCandles - chartVisibleCount);
  const clampedOffset = Math.min(Math.max(0, chartOffset), maxOffset);
  const startIdx = Math.max(0, totalCandles - chartVisibleCount - clampedOffset);
  const endIdx = Math.min(startIdx + chartVisibleCount, totalCandles);
  const displayCandles = candleData.slice(startIdx, endIdx);

  // Calculate chart bounds with padding
  const rawHigh = displayCandles.length > 0 ? Math.max(...displayCandles.map(c => c.high)) : currentPrice * 1.01;
  const rawLow = displayCandles.length > 0 ? Math.min(...displayCandles.map(c => c.low)) : currentPrice * 0.99;
  const padding = (rawHigh - rawLow) * 0.1 || currentPrice * 0.01;
  const chartHigh = rawHigh + padding;
  const chartLow = Math.max(0, rawLow - padding);
  const chartRange = chartHigh - chartLow || 1;

  const priceSteps = 5;
  const priceLevels = Array.from({ length: priceSteps + 1 }, (_, i) =>
    chartLow + (chartRange * i) / priceSteps
  );

  const zoomIn = useCallback(() => setChartVisibleCount(prev => Math.max(10, prev - 8)), []);
  const zoomOut = useCallback(() => setChartVisibleCount(prev => Math.min(Math.max(totalCandles, 100), prev + 8)), [totalCandles]);
  const resetZoom = useCallback(() => { setChartVisibleCount(40); setChartOffset(0); }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.ctrlKey || e.metaKey) {
      if (e.deltaY > 0) zoomOut(); else zoomIn();
    } else if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      setChartOffset(prev => Math.max(0, Math.min(maxOffset, prev + (e.deltaX > 0 ? -2 : 2))));
    } else {
      setChartOffset(prev => Math.max(0, Math.min(maxOffset, prev + (e.deltaY > 0 ? -3 : 3))));
    }
  }, [maxOffset, zoomIn, zoomOut]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartRef.current = { 
        x: e.touches[0].clientX, 
        y: e.touches[0].clientY,
        dist: 0, 
        time: Date.now() 
      };
      isDraggingRef.current = false;
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX, 
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchStartRef.current = { x: 0, y: 0, dist, time: Date.now() };
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    
    if (e.touches.length === 1 && touchStartRef.current.dist === 0) {
      const dx = e.touches[0].clientX - touchStartRef.current.x;
      const dy = e.touches[0].clientY - touchStartRef.current.y;
      
      // Determine if horizontal scrolling
      if (!isDraggingRef.current && Math.abs(dx) > 8) {
        isDraggingRef.current = true;
        e.preventDefault();
      }
      
      if (isDraggingRef.current && Math.abs(dx) > Math.abs(dy)) {
        e.preventDefault();
        const sensitivity = Math.max(4, chartVisibleCount / 12);
        const candlesMoved = Math.round(dx / sensitivity);
        if (candlesMoved !== 0) {
          setChartOffset(prev => Math.max(0, Math.min(maxOffset, prev + candlesMoved)));
          touchStartRef.current.x = e.touches[0].clientX;
        }
      }
    } else if (e.touches.length === 2 && touchStartRef.current.dist > 0) {
      e.preventDefault();
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX, 
        e.touches[0].clientY - e.touches[1].clientY
      );
      const diff = dist - touchStartRef.current.dist;
      if (Math.abs(diff) > 20) {
        if (diff > 0) zoomIn();
        else zoomOut();
        touchStartRef.current.dist = dist;
      }
    }
  }, [chartVisibleCount, maxOffset, zoomIn, zoomOut]);

  const handleTouchEnd = useCallback(() => {
    touchStartRef.current = null;
    isDraggingRef.current = false;
  }, []);

  const ohlcv = displayCandles.length > 0 ? displayCandles[displayCandles.length - 1] : null;

  if (loading && candleData.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-muted-foreground text-sm">Grafik yükleniyor...</div>
      </div>
    );
  }

  const candleWidth = displayCandles.length > 0 ? 100 / displayCandles.length : 2;

  return (
    <div className="flex flex-col h-full bg-background select-none touch-none">
      {/* Timeframe + OHLC Info Bar */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-border/40 bg-card/50 shrink-0 overflow-x-auto">
        <div className="flex gap-0.5 shrink-0">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.key}
              onClick={() => setTimeframe(tf.key)}
              className={`px-2 py-1 rounded-md text-[10px] md:text-[11px] font-semibold transition-all whitespace-nowrap ${
                timeframe === tf.key
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50 active:bg-muted"
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
        {ohlcv && (
          <div className="ml-auto flex items-center gap-1.5 md:gap-2.5 text-[9px] md:text-[10px] font-mono text-muted-foreground shrink-0">
            <span>A<span className="text-foreground/80 ml-0.5">{formatPrice(ohlcv.open)}</span></span>
            <span>Y<span className="text-buy/80 ml-0.5">{formatPrice(ohlcv.high)}</span></span>
            <span>D<span className="text-sell/80 ml-0.5">{formatPrice(ohlcv.low)}</span></span>
            <span>K<span className="text-foreground/80 ml-0.5">{formatPrice(ohlcv.close)}</span></span>
          </div>
        )}
      </div>

      {/* Chart Area */}
      <div className="flex-1 relative min-h-0">
        {/* Zoom controls */}
        <div className="absolute top-2 left-2 z-20 flex gap-1">
          <button 
            onClick={zoomIn} 
            className="h-8 w-8 md:h-7 md:w-7 rounded-lg bg-card/95 backdrop-blur-sm border border-border/50 flex items-center justify-center hover:bg-muted transition-colors active:scale-90 shadow-sm"
          >
            <ZoomIn className="h-4 w-4 md:h-3.5 md:w-3.5 text-muted-foreground" />
          </button>
          <button 
            onClick={zoomOut} 
            className="h-8 w-8 md:h-7 md:w-7 rounded-lg bg-card/95 backdrop-blur-sm border border-border/50 flex items-center justify-center hover:bg-muted transition-colors active:scale-90 shadow-sm"
          >
            <ZoomOut className="h-4 w-4 md:h-3.5 md:w-3.5 text-muted-foreground" />
          </button>
          <button 
            onClick={resetZoom} 
            className="h-8 w-8 md:h-7 md:w-7 rounded-lg bg-card/95 backdrop-blur-sm border border-border/50 flex items-center justify-center hover:bg-muted transition-colors active:scale-90 shadow-sm"
          >
            <RotateCcw className="h-4 w-4 md:h-3.5 md:w-3.5 text-muted-foreground" />
          </button>
        </div>

        <div className="h-full flex">
          <div
            ref={chartRef}
            className="flex-1 relative overflow-hidden bg-background"
            onWheel={handleWheel}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{ touchAction: 'none' }}
          >
            {/* Grid lines */}
            {priceLevels.map((_, i) => (
              <div
                key={i}
                className="absolute left-0 right-0 border-t border-border/15"
                style={{ bottom: `${(i / priceSteps) * 100}%` }}
              />
            ))}

            {/* Open Position Lines */}
            {positions.map((pos) => {
              const entryPct = ((pos.entry_price - chartLow) / chartRange) * 100;
              const slPct = pos.stop_loss ? ((pos.stop_loss - chartLow) / chartRange) * 100 : null;
              const tpPct = pos.take_profit ? ((pos.take_profit - chartLow) / chartRange) * 100 : null;
              const isBuy = pos.type === "buy";

              return (
                <div key={pos.id}>
                  {/* Entry Price Line */}
                  {entryPct >= -5 && entryPct <= 105 && (
                    <div
                      className="absolute left-0 right-0 z-8 border-t-2 border-solid"
                      style={{
                        bottom: `${Math.min(Math.max(entryPct, 0), 100)}%`,
                        borderColor: isBuy ? 'hsl(var(--buy))' : 'hsl(var(--sell))',
                      }}
                    >
                      <span
                        className={`absolute left-0 text-[9px] font-mono font-medium px-1.5 py-0.5 rounded-r translate-y-[-50%] ${
                          isBuy ? "bg-buy/90 text-buy-foreground" : "bg-sell/90 text-sell-foreground"
                        }`}
                      >
                        {isBuy ? "AL" : "SAT"} {formatPrice(pos.entry_price)}
                      </span>
                    </div>
                  )}

                  {/* Stop Loss Line */}
                  {slPct !== null && slPct >= -5 && slPct <= 105 && (
                    <div
                      className="absolute left-0 right-0 z-7 border-t border-dashed border-sell/80"
                      style={{ bottom: `${Math.min(Math.max(slPct, 0), 100)}%` }}
                    >
                      <span className="absolute left-0 text-[8px] font-mono px-1 py-0.5 rounded-r translate-y-[-50%] bg-sell/70 text-sell-foreground">
                        SL {formatPrice(pos.stop_loss!)}
                      </span>
                    </div>
                  )}

                  {/* Take Profit Line */}
                  {tpPct !== null && tpPct >= -5 && tpPct <= 105 && (
                    <div
                      className="absolute left-0 right-0 z-7 border-t border-dashed border-buy/80"
                      style={{ bottom: `${Math.min(Math.max(tpPct, 0), 100)}%` }}
                    >
                      <span className="absolute left-0 text-[8px] font-mono px-1 py-0.5 rounded-r translate-y-[-50%] bg-buy/70 text-buy-foreground">
                        TP {formatPrice(pos.take_profit!)}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Current price line */}
            {(() => {
              const pricePct = ((currentPrice - chartLow) / chartRange) * 100;
              if (pricePct < -10 || pricePct > 110) return null;
              return (
                <div
                  className="absolute left-0 right-0 z-10 border-t-2 border-dashed"
                  style={{
                    bottom: `${Math.min(Math.max(pricePct, 1), 99)}%`,
                    borderColor: isPositive ? 'hsl(var(--buy))' : 'hsl(var(--sell))',
                  }}
                >
                  <span
                    className={`absolute right-0 text-[10px] font-mono font-bold px-2 py-0.5 rounded-l translate-y-[-50%] shadow-lg ${
                      isPositive ? "bg-buy text-buy-foreground" : "bg-sell text-sell-foreground"
                    }`}
                  >
                    {formatPrice(currentPrice)}
                  </span>
                </div>
              );
            })()}

            {/* Candlesticks */}
            <div className="absolute inset-0 flex items-end px-0.5">
              {displayCandles.map((candle, i) => {
                const isGreen = candle.close >= candle.open;
                const bodyTop = ((Math.max(candle.open, candle.close) - chartLow) / chartRange) * 100;
                const bodyBottom = ((Math.min(candle.open, candle.close) - chartLow) / chartRange) * 100;
                const wickTop = ((candle.high - chartLow) / chartRange) * 100;
                const wickBottom = ((candle.low - chartLow) / chartRange) * 100;
                const bodyHeight = Math.max(bodyTop - bodyBottom, 0.3);

                return (
                  <div 
                    key={i} 
                    className="relative h-full"
                    style={{ 
                      width: `${candleWidth}%`,
                      minWidth: '2px',
                    }}
                  >
                    {/* Wick */}
                    <div
                      className={`absolute left-1/2 -translate-x-1/2 ${isGreen ? "bg-buy/60" : "bg-sell/60"}`}
                      style={{ 
                        bottom: `${Math.max(wickBottom, 0)}%`, 
                        height: `${Math.max(wickTop - wickBottom, 0.2)}%`, 
                        width: '1px' 
                      }}
                    />
                    {/* Body */}
                    <div
                      className={`absolute left-[10%] right-[10%] rounded-sm ${isGreen ? "bg-buy" : "bg-sell"}`}
                      style={{ 
                        bottom: `${Math.max(bodyBottom, 0)}%`, 
                        height: `${bodyHeight}%`,
                        minHeight: '1px',
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Y-axis price labels */}
          <div className="w-12 md:w-14 shrink-0 border-l border-border/30 flex flex-col justify-between py-1.5 bg-background/95">
            {[...priceLevels].reverse().map((p, i) => (
              <span key={i} className="text-[8px] md:text-[9px] font-mono text-muted-foreground/80 text-right pr-1 leading-none">
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

// Seeded PRNG for consistent per-symbol candle generation
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
  }
  return Math.abs(hash);
}

// Generate simulated candle data for when DB has no data yet
function generateSimulatedCandles(basePrice: number, timeframe: Timeframe, symbolName?: string): Candle[] {
  const count = 80;
  const candles: Candle[] = [];
  const seed = hashString(symbolName || "default");
  const rng = seededRandom(seed);
  
  // Each symbol gets a unique starting bias and volatility multiplier
  const startBias = 0.92 + rng() * 0.10; // 0.92 to 1.02
  const volMult = 0.002 + rng() * 0.006; // 0.002 to 0.008
  const trendBias = (rng() - 0.5) * 0.3; // -0.15 to 0.15
  
  let price = basePrice * startBias;
  const volatility = basePrice * volMult;

  const now = new Date();
  let interval: number;
  switch (timeframe) {
    case "15m": interval = 15 * 60 * 1000; break;
    case "1h": interval = 60 * 60 * 1000; break;
    case "4h": interval = 4 * 60 * 60 * 1000; break;
    case "1d": interval = 24 * 60 * 60 * 1000; break;
    default: interval = 15 * 60 * 1000;
  }

  for (let i = 0; i < count; i++) {
    const time = new Date(now.getTime() - (count - i) * interval);
    // Progress toward basePrice in last 20% of candles
    const progress = i / count;
    const pullStrength = progress > 0.8 ? (progress - 0.8) / 0.2 : 0;
    const pullToBase = (basePrice - price) * pullStrength * 0.15;
    
    const change = (rng() - 0.48 + trendBias * 0.1) * volatility + pullToBase;
    const open = price;
    price = Math.max(price + change, basePrice * 0.7);
    const close = price;
    const wickUp = rng() * volatility * 0.5;
    const wickDown = rng() * volatility * 0.5;
    const high = Math.max(open, close) + wickUp;
    const low = Math.min(open, close) - wickDown;
    const volume = Math.floor(rng() * 10000 + 1000);

    candles.push({ time: time.toISOString(), open, high, low, close, volume });
  }

  if (candles.length > 0) {
    const lastCandle = candles[candles.length - 1];
    lastCandle.close = basePrice;
    lastCandle.high = Math.max(lastCandle.high, basePrice);
    lastCandle.low = Math.min(lastCandle.low, basePrice);
  }

  return candles;
}
