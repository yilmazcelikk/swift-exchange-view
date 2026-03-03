import { memo, forwardRef, useRef, useEffect, useState } from "react";
import { useAnimatedPrice } from "@/hooks/useAnimatedPrice";
import { useLiveTickPrice } from "@/hooks/useLiveTickPrice";

interface AnimatedPriceProps {
  value: number;
  className?: string;
  duration?: number;
  live?: boolean;
  changePercent?: number;
  disableFlashColor?: boolean;
  formatFn?: (price: number) => string;
}

function formatAnimatedPrice(price: number): string {
  if (!price || price === 0) return "—";
  if (price < 1) return price.toFixed(5);
  if (price < 10) return price.toFixed(4);
  if (price < 1000) return price.toFixed(2);
  return price.toLocaleString("tr-TR", { minimumFractionDigits: 2 });
}

const AnimatedPriceBase = forwardRef<HTMLSpanElement, AnimatedPriceProps>(function AnimatedPrice(
  { value, className = "", duration = 600, live = false, changePercent = 0, disableFlashColor = false, formatFn },
  ref,
) {
  const liveValue = useLiveTickPrice(value, { enabled: live, changePercent });
  const displayValue = useAnimatedPrice(liveValue, duration);
  const prevValueRef = useRef(liveValue);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);

  useEffect(() => {
    if (prevValueRef.current !== liveValue && prevValueRef.current !== 0) {
      setFlash(liveValue > prevValueRef.current ? "up" : "down");
      const timer = setTimeout(() => setFlash(null), 350);
      prevValueRef.current = liveValue;
      return () => clearTimeout(timer);
    }
    prevValueRef.current = liveValue;
  }, [liveValue]);

  const flashClass = disableFlashColor ? "" : (flash === "up" ? "text-buy" : flash === "down" ? "text-sell" : "");

  return (
    <span ref={ref} className={`tabular-nums transition-colors duration-300 ${className} ${flashClass}`}>
      {(formatFn || formatAnimatedPrice)(displayValue)}
    </span>
  );
});

export const AnimatedPrice = memo(AnimatedPriceBase);
