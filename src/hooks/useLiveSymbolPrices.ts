import { useEffect, useRef, useState } from "react";

interface SymbolPriceInput {
  price: number;
  changePercent?: number;
  marketOpen?: boolean;
}

export function useLiveSymbolPrices(
  symbolPrices: Record<string, SymbolPriceInput>,
  enabled = true,
  tickMs = 1000,
): Record<string, number> {
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});
  const realPricesRef = useRef<Record<string, SymbolPriceInput>>({});
  const prevKeysRef = useRef<string>("");

  // Update real prices ref — only trigger state update when symbols actually change
  useEffect(() => {
    realPricesRef.current = symbolPrices;

    // Build a stable key from symbol IDs + prices to detect real changes
    const keys = Object.entries(symbolPrices)
      .map(([id, v]) => `${id}:${v.price.toFixed(4)}`)
      .sort()
      .join("|");

    if (keys === prevKeysRef.current) return;
    prevKeysRef.current = keys;

    setLivePrices((prev) => {
      const next = { ...prev };
      for (const [id, { price }] of Object.entries(symbolPrices)) {
        if (!(id in next)) next[id] = price;
        if (Math.abs((prev[id] || 0) - price) / (price || 1) > 0.005) {
          next[id] = price;
        }
      }
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
          if (input.marketOpen === false || !real || real <= 0) {
            next[id] = prev[id] ?? real;
            continue;
          }
          const cp = Math.abs(input.changePercent || 0);
          // More realistic micro-ticks: tighter drift based on volatility
          const volatilityFactor = Math.min(cp * 0.000003, 0.0001);
          const baseDrift = Math.max(real * 0.000015, volatilityFactor * real);
          const prevPrice = prev[id] ?? real;
          // Mean-revert towards real price with slight bias
          const meanRevertStrength = 0.03;
          const revert = (real - prevPrice) * meanRevertStrength;
          const seed = (Math.random() - 0.5) * 2;
          const nextPrice = prevPrice + seed * baseDrift + revert;
          // Tighter clamp: ±0.15% from real
          const clamp = 0.15 / 100;
          const min = real * (1 - clamp);
          const max = real * (1 + clamp);
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
