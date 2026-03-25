import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook to get live USDTRY exchange rate for converting TRY-denominated PnL to USD.
 * Used primarily for BIST stock positions.
 */
export function useUsdTryRate(): number {
  const [rate, setRate] = useState(38); // sensible default

  useEffect(() => {
    supabase
      .from("symbols")
      .select("current_price")
      .eq("name", "USDTRY")
      .single()
      .then(({ data }) => {
        if (data?.current_price && Number(data.current_price) > 0) {
          setRate(Number(data.current_price));
        }
      });

    const channel = supabase
      .channel("usdtry-rate")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "symbols", filter: "name=eq.USDTRY" },
        (payload) => {
          const price = Number((payload.new as any)?.current_price);
          if (price > 0) setRate(price);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return rate;
}
