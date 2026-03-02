import { useRef, useState, useEffect } from "react";

/**
 * Smoothly interpolates a numeric value towards a target using requestAnimationFrame.
 * Creates a fluid "ticker" effect for price displays.
 * Uses spring-like interpolation that seamlessly handles rapid target changes.
 */
export function useAnimatedPrice(targetPrice: number, duration = 600): number {
  const [displayPrice, setDisplayPrice] = useState(targetPrice);
  const animRef = useRef<number | null>(null);
  const currentRef = useRef(targetPrice);
  const velocityRef = useRef(0);
  const targetRef = useRef(targetPrice);
  const lastTimeRef = useRef(0);

  useEffect(() => {
    targetRef.current = targetPrice;

    // If no animation is running, start one
    if (animRef.current === null) {
      lastTimeRef.current = performance.now();

      const animate = (now: number) => {
        const dt = Math.min((now - lastTimeRef.current) / 1000, 0.05); // cap at 50ms
        lastTimeRef.current = now;

        const target = targetRef.current;
        const current = currentRef.current;
        const diff = target - current;

        // Spring-damper system for natural motion
        const stiffness = 12; // How quickly it moves toward target
        const damping = 0.85; // Reduces oscillation

        velocityRef.current = velocityRef.current * damping + diff * stiffness * dt;
        currentRef.current += velocityRef.current * dt;

        // Snap when very close
        if (Math.abs(diff) < Math.abs(target) * 0.000001 && Math.abs(velocityRef.current) < 0.0001) {
          currentRef.current = target;
          velocityRef.current = 0;
          setDisplayPrice(target);
          animRef.current = null;
          return;
        }

        setDisplayPrice(currentRef.current);
        animRef.current = requestAnimationFrame(animate);
      };

      animRef.current = requestAnimationFrame(animate);
    }

    return () => {
      // Don't cancel on target change - let animation continue to new target
    };
  }, [targetPrice]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animRef.current) {
        cancelAnimationFrame(animRef.current);
        animRef.current = null;
      }
    };
  }, []);

  return displayPrice;
}
