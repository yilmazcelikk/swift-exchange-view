import { memo, forwardRef } from "react";
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
  { value, className = "", duration = 400 },
  ref,
) {
  const displayValue = useAnimatedPrice(value, duration);

  return (
    <span ref={ref} className={`tabular-nums transition-colors duration-150 ${className}`}>
      {formatAnimatedPrice(displayValue)}
    </span>
  );
});

export const AnimatedPrice = memo(AnimatedPriceBase);
