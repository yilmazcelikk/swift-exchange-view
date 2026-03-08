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
      <div className={`${sizeClasses[size]} rounded-full bg-card border border-border/50 flex items-center justify-center shrink-0 overflow-hidden`}>
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

  // Generic fallback - chart icon (no letters)
  return (
    <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-muted to-muted-foreground/20 flex items-center justify-center shrink-0 border border-border/50 overflow-hidden`}>
      <svg className={`${imgSizeClasses[size]} text-muted-foreground`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    </div>
  );
}));
