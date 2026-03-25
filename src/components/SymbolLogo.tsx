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

// Persistent cache backed by localStorage
const CACHE_KEY = "symbol_logo_cache_v1";
const logoCache = new Map<string, string | null>();
const preloadPromises = new Map<string, Promise<string | null>>();

// Load persisted cache on startup
try {
  const stored = localStorage.getItem(CACHE_KEY);
  if (stored) {
    const parsed = JSON.parse(stored) as Record<string, string | null>;
    for (const [k, v] of Object.entries(parsed)) {
      logoCache.set(k, v);
    }
  }
} catch {}

function persistCache() {
  try {
    const obj: Record<string, string | null> = {};
    logoCache.forEach((v, k) => { obj[k] = v; });
    localStorage.setItem(CACHE_KEY, JSON.stringify(obj));
  } catch {}
}

function preloadLogo(symbol: string, category?: string): Promise<string | null> {
  const key = `${symbol}|${category || ""}`;
  
  const cached = logoCache.get(key);
  if (cached !== undefined) return Promise.resolve(cached);
  
  const existing = preloadPromises.get(key);
  if (existing) return existing;
  
  const urls = resolveLogoUrls(symbol, category);
  if (urls.length === 0) {
    logoCache.set(key, null);
    return Promise.resolve(null);
  }
  
  const promise = tryLoadUrls(urls).then(url => {
    logoCache.set(key, url);
    preloadPromises.delete(key);
    return url;
  });
  
  preloadPromises.set(key, promise);
  return promise;
}

function tryLoadUrls(urls: string[]): Promise<string | null> {
  return new Promise(resolve => {
    let idx = 0;
    
    function tryNext() {
      if (idx >= urls.length) {
        resolve(null);
        return;
      }
      const url = urls[idx];
      const img = new Image();
      img.referrerPolicy = "no-referrer";
      img.onload = () => resolve(url);
      img.onerror = () => {
        idx++;
        tryNext();
      };
      img.src = url;
    }
    
    tryNext();
  });
}

export const SymbolLogo = memo(forwardRef<HTMLDivElement, SymbolLogoProps>(function SymbolLogo({ symbol, category, size = "md" }, ref) {
  const cacheKey = `${symbol}|${category || ""}`;
  const cachedUrl = logoCache.get(cacheKey);
  
  // Start with cached value if available
  const [resolvedUrl, setResolvedUrl] = useState<string | null | undefined>(
    cachedUrl !== undefined ? cachedUrl : undefined
  );

  useEffect(() => {
    const key = `${symbol}|${category || ""}`;
    const cached = logoCache.get(key);
    if (cached !== undefined) {
      setResolvedUrl(cached);
      return;
    }
    
    // Reset to loading
    setResolvedUrl(undefined);
    
    let cancelled = false;
    preloadLogo(symbol, category).then(url => {
      if (!cancelled) setResolvedUrl(url);
    });
    
    return () => { cancelled = true; };
  }, [symbol, category]);

  // Show loaded image
  if (resolvedUrl) {
    return (
      <div ref={ref} className={`${sizeClasses[size]} rounded-full bg-card border border-border/50 flex items-center justify-center shrink-0 overflow-hidden`}>
        <img
          src={resolvedUrl}
          alt={symbol}
          className={`${imgSizeClasses[size]} object-contain`}
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  // Show text avatar (both during loading and after all URLs failed)
  return (
    <div ref={ref} className={`${sizeClasses[size]} rounded-full bg-gradient-to-br ${getAvatarColor(symbol)} flex items-center justify-center shrink-0 border border-border/30 overflow-hidden`}>
      <span className={`${textSizeClasses[size]} font-bold text-white leading-none select-none`}>
        {getInitials(symbol)}
      </span>
    </div>
  );
}));
