import { useEffect, useRef, memo } from "react";
import { useTheme } from "next-themes";
import { getTvSymbol } from "@/lib/tvSymbolMap";

interface TradingViewChartProps {
  symbolName: string;
}

export const TradingViewChart = memo(({ symbolName }: TradingViewChartProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const tvSymbol = getTvSymbol(symbolName);
    const theme = resolvedTheme === "dark" ? "dark" : "light";

    const params = new URLSearchParams({
      symbol: tvSymbol,
      interval: "15",
      timezone: "Europe/Istanbul",
      theme,
      style: "1",
      locale: "tr",
      enable_publishing: "0",
      allow_symbol_change: "0",
      hide_top_toolbar: "0",
      hide_legend: "1",
      save_image: "0",
      withdateranges: "0",
      hide_side_toolbar: "1",
      hide_volume: "1",
      studies: "[]",
    });

    const src = `https://s.tradingview.com/widgetembed/?hideideas=1&overrides={}&studies_overrides={}&${params.toString()}#{"utm_source":"","utm_medium":"widget_new","utm_campaign":"chart"}`;

    container.innerHTML = "";
    const iframe = document.createElement("iframe");
    iframe.src = src;
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "none";
    iframe.style.display = "block";
    iframe.setAttribute("allowtransparency", "true");
    iframe.setAttribute("frameborder", "0");
    iframe.allow = "autoplay; encrypted-media";
    container.appendChild(iframe);

    return () => {
      if (container) container.innerHTML = "";
    };
  }, [symbolName, resolvedTheme]);

  return (
    <div
      ref={containerRef}
      className="flex-1 w-full min-h-[280px] md:min-h-0"
      style={{ height: "100%" }}
    />
  );
});

TradingViewChart.displayName = "TradingViewChart";
