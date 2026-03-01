import { useRef, useState, useEffect } from "react";

/**
 * Smoothly interpolates a numeric value towards a target using requestAnimationFrame.
 * Creates a fluid "ticker" effect for price displays.
 */
export function useAnimatedPrice(targetPrice: number, duration = 400): number {
  const [displayPrice, setDisplayPrice] = useState(targetPrice);
  const animRef = useRef<number | null>(null);
  const startPriceRef = useRef(targetPrice);
  const startTimeRef = useRef(0);
  const currentTargetRef = useRef(targetPrice);

  useEffect(() => {
    // Skip animation on first mount or if target hasn't changed
    if (currentTargetRef.current === targetPrice) return;

    // Start new animation from current display value
    startPriceRef.current = displayPrice;
    currentTargetRef.current = targetPrice;
    startTimeRef.current = performance.now();

    if (animRef.current) cancelAnimationFrame(animRef.current);

    const animate = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out cubic for natural deceleration
      const eased = 1 - Math.pow(1 - progress, 3);

      const interpolated =
        startPriceRef.current +
        (currentTargetRef.current - startPriceRef.current) * eased;

      setDisplayPrice(interpolated);

      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      }
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [targetPrice, duration]);

  return displayPrice;
}
