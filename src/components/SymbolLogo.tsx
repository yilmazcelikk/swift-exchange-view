import { memo, useState, useEffect, forwardRef } from "react";
import { resolveLogoUrl } from "@/data/symbolLogos";

interface SymbolLogoProps {
  symbol: string;
  category?: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-12 w-12",
};

const imgSizeClasses = {
  sm: "h-6 w-6",
  md: "h-7 w-7",
  lg: "h-8 w-8",
};

const textSizeClasses = {
  sm: "text-[10px]",
  md: "text-xs",
  lg: "text-sm",
};

// Deterministic color from symbol name
const AVATAR_COLORS = [
  "from-blue-500/80 to-blue-700/80",
  "from-emerald-500/80 to-emerald-700/80",
  "from-amber-500/80 to-amber-700/80",
  "from-rose-500/80 to-rose-700/80",
  "from-violet-500/80 to-violet-700/80",
  "from-cyan-500/80 to-cyan-700/80",
  "from-orange-500/80 to-orange-700/80",
  "from-pink-500/80 to-pink-700/80",
  "from-teal-500/80 to-teal-700/80",
  "from-indigo-500/80 to-indigo-700/80",
];

function getAvatarColor(symbol: string): string {
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) {
    hash = symbol.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(symbol: string): string {
  // Remove USD/USDT suffix for crypto, show first 2 chars
  const clean = symbol.replace(/(USD[T]?|EUR|GBP|JPY|TRY)$/i, "");
  return clean.slice(0, 2).toUpperCase();
}

export const SymbolLogo = memo(forwardRef<HTMLDivElement, SymbolLogoProps>(function SymbolLogo({ symbol, category, size = "md" }, ref) {
  const [imgError, setImgError] = useState(false);
  const logoUrl = resolveLogoUrl(symbol, category);

  // Reset error state when symbol changes
  useEffect(() => {
    setImgError(false);
  }, [symbol]);

  // Image logo (stock, crypto, commodity icon, flag)
  if (logoUrl && !imgError) {
    return (
      <div ref={ref} className={`${sizeClasses[size]} rounded-full bg-card border border-border/50 flex items-center justify-center shrink-0 overflow-hidden`}>
        <img
          src={logoUrl}
          alt={symbol}
          className={`${imgSizeClasses[size]} object-contain`}
          onError={() => setImgError(true)}
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  // Text avatar fallback - show initials with colored gradient
  const initials = getInitials(symbol);
  const colorClass = getAvatarColor(symbol);

  return (
    <div ref={ref} className={`${sizeClasses[size]} rounded-full bg-gradient-to-br ${colorClass} flex items-center justify-center shrink-0 border border-border/30 overflow-hidden`}>
      <span className={`${textSizeClasses[size]} font-bold text-white leading-none select-none`}>
        {initials}
      </span>
    </div>
  );
}));
