import { memo, useState, useEffect, forwardRef, useCallback, useMemo } from "react";
import { resolveLogoUrls } from "@/data/symbolLogos";

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

function getAvatarColor(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function getInitials(s: string): string {
  return s.replace(/(USD[T]?|EUR|GBP|JPY|TRY)$/i, "").slice(0, 2).toUpperCase();
}

export const SymbolLogo = memo(forwardRef<HTMLDivElement, SymbolLogoProps>(function SymbolLogo({ symbol, category, size = "md" }, ref) {
  const [urlIdx, setUrlIdx] = useState(0);
  const [allFailed, setAllFailed] = useState(false);

  const urls = useMemo(() => resolveLogoUrls(symbol, category), [symbol, category]);

  useEffect(() => {
    setUrlIdx(0);
    setAllFailed(false);
  }, [symbol]);

  const handleError = useCallback(() => {
    setUrlIdx(prev => {
      const next = prev + 1;
      if (next >= urls.length) {
        setAllFailed(true);
        return prev;
      }
      return next;
    });
  }, [urls.length]);

  if (!allFailed && urls.length > 0 && urlIdx < urls.length) {
    return (
      <div ref={ref} className={`${sizeClasses[size]} rounded-full bg-card border border-border/50 flex items-center justify-center shrink-0 overflow-hidden`}>
        <img
          src={urls[urlIdx]}
          alt={symbol}
          className={`${imgSizeClasses[size]} object-contain`}
          onError={handleError}
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  // Last resort text avatar
  return (
    <div ref={ref} className={`${sizeClasses[size]} rounded-full bg-gradient-to-br ${getAvatarColor(symbol)} flex items-center justify-center shrink-0 border border-border/30 overflow-hidden`}>
      <span className={`${textSizeClasses[size]} font-bold text-white leading-none select-none`}>
        {getInitials(symbol)}
      </span>
    </div>
  );
}));
