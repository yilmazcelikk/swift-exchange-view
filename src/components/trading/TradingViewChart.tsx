import { useEffect, useRef, memo } from "react";
import { useTheme } from "next-themes";
import { getTvSymbol } from "@/lib/tvSymbolMap";

interface TradingViewChartProps {
  symbolName: string;
}

declare global {
  interface Window {
    TradingView: any;
  }
}

let scriptLoaded = false;
let scriptLoading = false;
const scriptCallbacks: (() => void)[] = [];

function loadTvScript(cb: () => void) {
  if (scriptLoaded) { cb(); return; }
  scriptCallbacks.push(cb);
  if (scriptLoading) return;
  scriptLoading = true;
  const s = document.createElement("script");
  s.src = "https://s3.tradingview.com/tv.js";
  s.async = true;
  s.onload = () => {
    scriptLoaded = true;
    scriptLoading = false;
    scriptCallbacks.forEach(fn => fn());
    scriptCallbacks.length = 0;
  };
  document.head.appendChild(s);
}

export const TradingViewChart = memo(({ symbolName }: TradingViewChartProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<any>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const tvSymbol = getTvSymbol(symbolName);
    const theme = resolvedTheme === "dark" ? "dark" : "light";
    const containerId = `tv_${symbolName.replace(/[^a-zA-Z0-9]/g, "_")}_${Math.random().toString(36).slice(2, 7)}`;

    // Clear previous content
    container.innerHTML = `<div id="${containerId}" style="height:100%;width:100%"></div>`;

    const createWidget = () => {
      if (!window.TradingView || !document.getElementById(containerId)) return;
      try {
        widgetRef.current = new window.TradingView.widget({
          autosize: true,
          symbol: tvSymbol,
          interval: "15",
          timezone: "Europe/Istanbul",
          theme,
          style: "1",
          locale: "tr",
          enable_publishing: false,
          allow_symbol_change: false,
          container_id: containerId,
          hide_top_toolbar: false,
          hide_legend: true,
          save_image: false,
          withdateranges: true,
          hide_side_toolbar: true,
          studies: [],
          show_popup_button: false,
          popup_width: "1000",
          popup_height: "650",
          no_referral_id: true,
          toolbar_bg: theme === "dark" ? "#151922" : "#f0f0f0",
          drawings_access: { type: "black", tools: [{ name: "Regression Trend" }] },
          disabled_features: [
            "header_symbol_search",
            "header_compare",
            "header_undo_redo",
            "header_screenshot",
            "header_fullscreen_button",
            "header_settings",
            "header_indicators",
            "header_chart_type",
            "left_toolbar",
            "context_menus",
            "control_bar",
            "timeframes_toolbar",
            "edit_buttons_in_legend",
            "border_around_the_chart",
            "go_to_date",
            "symbol_info",
            "symbol_search_hot_key",
            "compare_symbol",
            "display_market_status",
            "study_templates",
          ],
          enabled_features: ["hide_left_toolbar_by_default"],
        });
      } catch (e) {
        console.error("TradingView widget error:", e);
      }
    };

    loadTvScript(createWidget);

    return () => {
      widgetRef.current = null;
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
