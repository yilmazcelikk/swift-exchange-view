import { memo, forwardRef, useRef, useEffect, useState } from "react";
import { useAnimatedPrice } from "@/hooks/useAnimatedPrice";

interface AnimatedPriceProps {
  value: number;
  className?: string;
  duration?: number;
}

function formatAnimatedPrice(price: number): string {
  if (!price || price === 0) return "—";
  if (price < 1) return price.toFixed(5);
  if (price < 10) return price.toFixed(4);
  if (price < 1000) return price.toFixed(2);
  return price.toLocaleString("tr-TR", { minimumFractionDigits: 2 });
}

const AnimatedPriceBase = forwardRef<HTMLSpanElement, AnimatedPriceProps>(function AnimatedPrice(
  { value, className = "", duration = 600 },
  ref,
) {
  const displayValue = useAnimatedPrice(value, duration);
  const prevValueRef = useRef(value);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);

  useEffect(() => {
    if (prevValueRef.current !== value && prevValueRef.current !== 0) {
      setFlash(value > prevValueRef.current ? "up" : "down");
      const timer = setTimeout(() => setFlash(null), 400);
      prevValueRef.current = value;
      return () => clearTimeout(timer);
    }
    prevValueRef.current = value;
  }, [value]);

  const flashClass = flash === "up" 
    ? "text-buy" 
    : flash === "down" 
      ? "text-sell" 
      : "";

  return (
    <span 
      ref={ref} 
      className={`tabular-nums transition-colors duration-300 ${flashClass || className}`}
      style={!flash ? undefined : undefined}
    >
      {formatAnimatedPrice(displayValue)}
    </span>
  );
});

export const AnimatedPrice = memo(AnimatedPriceBase);
