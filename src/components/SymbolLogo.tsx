import { memo, useState, useEffect, forwardRef, useCallback } from "react";
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
  const clean = symbol.replace(/(USD[T]?|EUR|GBP|JPY|TRY)$/i, "");
  return clean.slice(0, 2).toUpperCase();
}

/** Build ordered list of logo URLs to try for a symbol */
function buildLogoUrls(symbol: string, category?: string): string[] {
  const urls: string[] = [];
  
  // 1. Explicit mapping (highest priority)
  const mapped = resolveLogoUrl(symbol, category);
  if (mapped) urls.push(mapped);
  
  // 2. Speculative TradingView S3 (works for many instruments)
  const tvSlug = symbol.toLowerCase().replace(/[^a-z0-9]/g, "");
  urls.push(`https://s3-symbol-logo.tradingview.com/${tvSlug}--big.svg`);
  
  // 3. For crypto, try CoinGecko-style with cleaned name
  if (category === "crypto") {
    const coinName = symbol.replace(/(USD[T]?|EUR)$/i, "").toLowerCase();
    urls.push(`https://s3-symbol-logo.tradingview.com/${coinName}--big.svg`);
  }

  // Deduplicate
  return [...new Set(urls)];
}

export const SymbolLogo = memo(forwardRef<HTMLDivElement, SymbolLogoProps>(function SymbolLogo({ symbol, category, size = "md" }, ref) {
  const [urlIndex, setUrlIndex] = useState(0);
  const [allFailed, setAllFailed] = useState(false);
  
  const urls = buildLogoUrls(symbol, category);

  // Reset on symbol change
  useEffect(() => {
    setUrlIndex(0);
    setAllFailed(false);
  }, [symbol]);

  const handleError = useCallback(() => {
    setUrlIndex(prev => {
      const next = prev + 1;
      if (next >= urls.length) {
        setAllFailed(true);
        return prev;
      }
      return next;
    });
  }, [urls.length]);

  // Show image if we still have URLs to try
  if (!allFailed && urlIndex < urls.length) {
    return (
      <div ref={ref} className={`${sizeClasses[size]} rounded-full bg-card border border-border/50 flex items-center justify-center shrink-0 overflow-hidden`}>
        <img
          src={urls[urlIndex]}
          alt={symbol}
          className={`${imgSizeClasses[size]} object-contain`}
          onError={handleError}
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  // Last resort: text avatar
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
