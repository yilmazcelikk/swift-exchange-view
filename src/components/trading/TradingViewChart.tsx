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

    // Use the TradingView advanced chart widget via iframe - this version doesn't show popups
    const config = {
      autosize: true,
      symbol: tvSymbol,
      interval: "15",
      timezone: "Etc/UTC",
      theme,
      style: "1",
      locale: "tr",
      allow_symbol_change: false,
      save_image: false,
      hide_volume: true,
      hide_side_toolbar: true,
      calendar: false,
      support_host: "https://www.tradingview.com",
    };

    container.innerHTML = "";

    const iframe = document.createElement("iframe");
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "none";
    iframe.style.display = "block";
    iframe.setAttribute("allowtransparency", "true");
    iframe.setAttribute("frameborder", "0");
    iframe.setAttribute("sandbox", "allow-scripts allow-same-origin allow-popups");

    // Build the advanced chart embed URL
    const encodedConfig = encodeURIComponent(JSON.stringify(config));
    iframe.src = `https://www.tradingview-widget.com/embed-widget/advanced-chart/?locale=tr#${encodedConfig}`;

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
