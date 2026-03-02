import { useEffect, useRef, useState, useCallback } from "react";

/**
 * Manages live tick prices for multiple symbols simultaneously.
 * Takes a map of symbolId -> { price, changePercent } and returns
 * a ticking version that updates every second.
 */
interface SymbolPriceInput {
  price: number;
  changePercent?: number;
}

export function useLiveSymbolPrices(
  symbolPrices: Record<string, SymbolPriceInput>,
  enabled = true,
  tickMs = 1000,
): Record<string, number> {
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});
  const realPricesRef = useRef<Record<string, SymbolPriceInput>>({});

  // Update real prices ref when input changes
  useEffect(() => {
    realPricesRef.current = symbolPrices;
    // Seed live prices with real prices for any new symbols
    setLivePrices((prev) => {
      const next = { ...prev };
      for (const [id, { price }] of Object.entries(symbolPrices)) {
        if (!(id in next)) next[id] = price;
        // Also snap to real price when it changes from server
        if (Math.abs((prev[id] || 0) - price) / (price || 1) > 0.005) {
          next[id] = price;
        }
      }
      // Remove symbols no longer in input
      for (const id of Object.keys(next)) {
        if (!(id in symbolPrices)) delete next[id];
      }
      return next;
    });
  }, [symbolPrices]);

  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      setLivePrices((prev) => {
        const next: Record<string, number> = {};
        for (const [id, input] of Object.entries(realPricesRef.current)) {
          const real = input.price;
          if (!real || real <= 0) {
            next[id] = real;
            continue;
          }
          const cp = Math.abs(input.changePercent || 0);
          const driftFromTrend = cp * 0.0000025 * real;
          const baseDrift = Math.max(real * 0.00002, driftFromTrend);
          const prevPrice = prev[id] ?? real;
          const seed = Math.random() - 0.5;
          const nextPrice = prevPrice + seed * 2 * baseDrift;
          const min = real * (1 - 0.25 / 100);
          const max = real * (1 + 0.25 / 100);
          next[id] = Math.min(max, Math.max(min, nextPrice));
        }
        return next;
      });
    }, tickMs);

    return () => clearInterval(interval);
  }, [enabled, tickMs]);

  return enabled ? livePrices : Object.fromEntries(
    Object.entries(symbolPrices).map(([id, { price }]) => [id, price])
  );
}
