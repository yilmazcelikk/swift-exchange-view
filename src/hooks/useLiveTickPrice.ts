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

      const volatilityFactor = Math.min(Math.abs(changePercent) * 0.000003, 0.0001);
      const baseDrift = Math.max(real * 0.000015, volatilityFactor * real);

      setTickPrice((prev) => {
        const meanRevertStrength = 0.03;
        const revert = (real - prev) * meanRevertStrength;
        const seed = (Math.random() - 0.5) * 2;
        const next = prev + seed * baseDrift + revert;
        const clamp = clampPercent / 100;
        const min = real * (1 - clamp);
        const max = real * (1 + clamp);
        return Math.min(max, Math.max(min, next));
      });
    }, tickMs);

    return () => clearInterval(interval);
  }, [enabled, tickMs, changePercent, clampPercent]);

  return enabled ? tickPrice : realPrice;
}
