import { useEffect, useRef, useState } from "react";

interface UseLiveTickPriceOptions {
  enabled?: boolean;
  tickMs?: number;
  changePercent?: number;
  clampPercent?: number;
}

export function useLiveTickPrice(
  realPrice: number,
  {
    enabled = false,
    tickMs = 1000,
    changePercent = 0,
    clampPercent = 0.25,
  }: UseLiveTickPriceOptions = {},
): number {
  const [tickPrice, setTickPrice] = useState(realPrice);
  const realPriceRef = useRef(realPrice);

  useEffect(() => {
    realPriceRef.current = realPrice;
    setTickPrice(realPrice);
  }, [realPrice]);

  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      const real = realPriceRef.current;
      if (!real || real <= 0) {
        setTickPrice(real);
        return;
      }

      const driftFromTrend = Math.abs(changePercent) * 0.0000025 * real;
      const baseDrift = Math.max(real * 0.00002, driftFromTrend);

      setTickPrice((prev) => {
        const seed = Math.random() - 0.5;
        const next = prev + seed * 2 * baseDrift;
        const min = real * (1 - clampPercent / 100);
        const max = real * (1 + clampPercent / 100);
        return Math.min(max, Math.max(min, next));
      });
    }, tickMs);

    return () => clearInterval(interval);
  }, [enabled, tickMs, changePercent, clampPercent]);

  return enabled ? tickPrice : realPrice;
}
