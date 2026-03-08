import { useRef } from "react";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { AnimatedPrice } from "@/components/AnimatedPrice";

interface Candle {
  time: string;
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

export type Timeframe = typeof TIMEFRAMES[number]["key"];

interface CandlestickChartProps {
  candleData: Candle[];
  price: number;
  isPositive: boolean;
  timeframe: Timeframe;
  onTimeframeChange: (tf: Timeframe) => void;
  chartVisibleCount: number;
  setChartVisibleCount: React.Dispatch<React.SetStateAction<number>>;
  chartOffset: number;
  setChartOffset: React.Dispatch<React.SetStateAction<number>>;
  formatPrice: (price: number) => string;
}

export function CandlestickChart({
  candleData,
  price,
  isPositive,
  timeframe,
  onTimeframeChange,
  chartVisibleCount,
  setChartVisibleCount,
  chartOffset,
  setChartOffset,
  formatPrice,
}: CandlestickChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; dist: number } | null>(null);

  const totalCandles = candleData.length;
  const clampedOffset = Math.min(chartOffset, Math.max(0, totalCandles - chartVisibleCount));
  const startIdx = Math.max(0, totalCandles - chartVisibleCount - clampedOffset);
  const endIdx = startIdx + chartVisibleCount;
  const displayCandles = candleData.slice(startIdx, endIdx);
  const chartHigh = Math.max(...displayCandles.map(c => c.high));
  const chartLow = Math.min(...displayCandles.map(c => c.low));
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

  return (
    <>
      {/* Timeframe + OHLC Info Bar */}
      <div className="flex items-center gap-1 px-2 py-1 border-b border-border/40 bg-card/50">
        <div className="flex gap-0.5">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.key}
              onClick={() => onTimeframeChange(tf.key)}
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
        <div className="absolute top-1.5 left-1.5 z-20 flex gap-0.5">
          <button onClick={zoomIn} className="h-6 w-6 rounded-md bg-card/90 backdrop-blur-sm border border-border/40 flex items-center justify-center hover:bg-muted transition-colors active:scale-95">
            <ZoomIn className="h-3 w-3 text-muted-foreground" />
          </button>
          <button onClick={zoomOut} className="h-6 w-6 rounded-md bg-card/90 backdrop-blur-sm border border-border/40 flex items-center justify-center hover:bg-muted transition-colors active:scale-95">
            <ZoomOut className="h-3 w-3 text-muted-foreground" />
          </button>
          <button onClick={resetZoom} className="h-6 w-6 rounded-md bg-card/90 backdrop-blur-sm border border-border/40 flex items-center justify-center hover:bg-muted transition-colors active:scale-95">
            <Maximize2 className="h-3 w-3 text-muted-foreground" />
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
            {priceLevels.map((_, i) => (
              <div
                key={i}
                className="absolute left-0 right-0 border-t border-border/10"
                style={{ bottom: `${(i / priceSteps) * 100}%` }}
              />
            ))}

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

          <div className="w-12 sm:w-14 shrink-0 border-l border-border/20 flex flex-col justify-between py-1.5 bg-background">
            {[...priceLevels].reverse().map((p, i) => (
              <span key={i} className="text-[8px] font-mono text-muted-foreground/70 text-right pr-1 leading-none">
                {formatPrice(p)}
              </span>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
