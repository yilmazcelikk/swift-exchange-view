import { memo } from "react";

const SYMBOL_LOGOS: Record<string, { emoji: string; bg: string }> = {
  // Forex
  "EURUSD": { emoji: "🇪🇺", bg: "from-blue-500/20 to-blue-600/10" },
  "GBPUSD": { emoji: "🇬🇧", bg: "from-red-500/20 to-blue-600/10" },
  "USDJPY": { emoji: "🇯🇵", bg: "from-red-500/20 to-white/10" },
  "USDCHF": { emoji: "🇨🇭", bg: "from-red-500/20 to-white/10" },
  "AUDUSD": { emoji: "🇦🇺", bg: "from-blue-500/20 to-yellow-500/10" },
  "USDCAD": { emoji: "🇨🇦", bg: "from-red-500/20 to-white/10" },
  "NZDUSD": { emoji: "🇳🇿", bg: "from-blue-600/20 to-red-500/10" },
  "EURGBP": { emoji: "🇪🇺", bg: "from-blue-500/20 to-red-500/10" },
  "EURJPY": { emoji: "🇪🇺", bg: "from-blue-500/20 to-red-400/10" },
  "GBPJPY": { emoji: "🇬🇧", bg: "from-red-500/20 to-red-400/10" },
  "USDTRY": { emoji: "🇹🇷", bg: "from-red-600/20 to-white/10" },
  "EURTRY": { emoji: "🇹🇷", bg: "from-red-600/20 to-blue-500/10" },

  // Commodities
  "XAUUSD": { emoji: "🥇", bg: "from-yellow-500/20 to-amber-600/10" },
  "XAGUSD": { emoji: "🥈", bg: "from-gray-400/20 to-gray-500/10" },
  "XPTUSD": { emoji: "💎", bg: "from-gray-300/20 to-blue-200/10" },
  "XPDUSD": { emoji: "✨", bg: "from-gray-300/20 to-teal-200/10" },
  "USOIL":  { emoji: "🛢️", bg: "from-amber-700/20 to-gray-800/10" },
  "UKOIL":  { emoji: "🛢️", bg: "from-amber-600/20 to-gray-700/10" },
  "NGAS":   { emoji: "🔥", bg: "from-orange-500/20 to-red-500/10" },
  "COPPER": { emoji: "🔶", bg: "from-orange-600/20 to-amber-500/10" },

  // Crypto
  "BTCUSD": { emoji: "₿", bg: "from-orange-500/20 to-yellow-500/10" },
  "ETHUSD": { emoji: "⟠", bg: "from-indigo-500/20 to-purple-500/10" },
  "BNBUSD": { emoji: "◆", bg: "from-yellow-500/20 to-yellow-600/10" },
  "XRPUSD": { emoji: "✕", bg: "from-blue-400/20 to-gray-500/10" },
  "SOLUSD": { emoji: "◎", bg: "from-purple-500/20 to-teal-500/10" },
  "ADAUSD": { emoji: "◇", bg: "from-blue-600/20 to-blue-400/10" },
  "DOTUSD": { emoji: "●", bg: "from-pink-500/20 to-pink-600/10" },
  "DOGEUSD": { emoji: "🐕", bg: "from-yellow-400/20 to-amber-400/10" },
  "AVAXUSD": { emoji: "🔺", bg: "from-red-500/20 to-red-600/10" },
  "LINKUSD": { emoji: "⬡", bg: "from-blue-500/20 to-blue-600/10" },

  // Indices
  "US30":   { emoji: "🇺🇸", bg: "from-blue-600/20 to-red-500/10" },
  "US500":  { emoji: "🇺🇸", bg: "from-blue-500/20 to-red-400/10" },
  "US100":  { emoji: "🇺🇸", bg: "from-blue-400/20 to-indigo-500/10" },
  "GER40":  { emoji: "🇩🇪", bg: "from-yellow-500/20 to-red-500/10" },
  "UK100":  { emoji: "🇬🇧", bg: "from-red-500/20 to-blue-500/10" },
  "JP225":  { emoji: "🇯🇵", bg: "from-red-400/20 to-white/10" },
  "FRA40":  { emoji: "🇫🇷", bg: "from-blue-500/20 to-red-400/10" },
  "AUS200": { emoji: "🇦🇺", bg: "from-blue-500/20 to-yellow-500/10" },
  "XU100":  { emoji: "🇹🇷", bg: "from-red-600/20 to-white/10" },
  "BIST100": { emoji: "🇹🇷", bg: "from-red-600/20 to-white/10" },

  // Stocks
  "AAPL":   { emoji: "🍎", bg: "from-gray-500/20 to-gray-600/10" },
  "MSFT":   { emoji: "🪟", bg: "from-blue-500/20 to-cyan-500/10" },
  "GOOGL":  { emoji: "🔍", bg: "from-blue-500/20 to-green-500/10" },
  "AMZN":   { emoji: "📦", bg: "from-orange-500/20 to-yellow-500/10" },
  "TSLA":   { emoji: "⚡", bg: "from-red-500/20 to-gray-500/10" },
  "META":   { emoji: "Ⓜ", bg: "from-blue-600/20 to-blue-400/10" },
  "NVDA":   { emoji: "🟢", bg: "from-green-500/20 to-green-600/10" },
  "NFLX":   { emoji: "🎬", bg: "from-red-600/20 to-red-700/10" },
};

const DEFAULT_LOGO = { emoji: "📊", bg: "from-muted to-muted" };

interface SymbolLogoProps {
  symbol: string;
  size?: "sm" | "md" | "lg";
}

export const SymbolLogo = memo(function SymbolLogo({ symbol, size = "md" }: SymbolLogoProps) {
  const normalized = symbol.replace(/[^A-Z0-9]/gi, "").toUpperCase();
  const logo = SYMBOL_LOGOS[normalized] || DEFAULT_LOGO;

  const sizeClasses = {
    sm: "h-7 w-7 text-xs",
    md: "h-9 w-9 text-sm",
    lg: "h-11 w-11 text-base",
  };

  return (
    <div
      className={`${sizeClasses[size]} rounded-xl bg-gradient-to-br ${logo.bg} flex items-center justify-center shrink-0 border border-border/50`}
    >
      <span className="leading-none">{logo.emoji}</span>
    </div>
  );
});
