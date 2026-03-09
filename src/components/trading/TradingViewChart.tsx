import { memo, useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { getTvSymbol } from "@/lib/tvSymbolMap";

interface TradingViewChartProps {
  symbolName: string;
  exchange?: string | null;
  category?: string | null;
}

export const TradingViewChart = memo(
  ({ symbolName, exchange, category }: TradingViewChartProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const { resolvedTheme } = useTheme();

    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const tvSymbol = getTvSymbol(symbolName, { exchange, category });
      const theme = resolvedTheme === "dark" ? "dark" : "light";

      const widgetConfig = {
        autosize: true,
        symbol: tvSymbol,
        interval: "15",
        timezone: "Europe/Istanbul",
        theme,
        style: "1",
        locale: "tr",
        enable_publishing: false,
        allow_symbol_change: false,
        hide_top_toolbar: false,
        hide_legend: true,
        save_image: false,
        withdateranges: false,
        hide_side_toolbar: true,
        hide_volume: true,
        studies: [],
      };

      const srcDoc = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      html, body { height: 100%; margin: 0; background: transparent; }
      .tradingview-widget-container { height: 100%; width: 100%; }
    </style>
  </head>
  <body>
    <div class="tradingview-widget-container">
      <script type="text/javascript" src="https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js" async>
        ${JSON.stringify(widgetConfig)}
      </script>
    </div>
  </body>
</html>`;

      container.innerHTML = "";
      const iframe = document.createElement("iframe");
      iframe.style.width = "100%";
      iframe.style.height = "100%";
      iframe.style.border = "none";
      iframe.style.display = "block";
      iframe.sandbox.add("allow-scripts");
      iframe.sandbox.add("allow-same-origin");
      iframe.srcdoc = srcDoc;
      container.appendChild(iframe);

      return () => {
        container.innerHTML = "";
      };
    }, [symbolName, exchange, category, resolvedTheme]);

    return (
      <div
        ref={containerRef}
        className="flex-1 w-full min-h-[280px] md:min-h-0"
        style={{ height: "100%" }}
      />
    );
  }
);

TradingViewChart.displayName = "TradingViewChart";
