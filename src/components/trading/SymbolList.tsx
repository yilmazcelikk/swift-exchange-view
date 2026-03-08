import { useState } from "react";
import { Search, Gem, BarChart3, Bitcoin, Building2, Globe } from "lucide-react";
import { Input } from "@/components/ui/input";
import { AnimatedPrice } from "@/components/AnimatedPrice";
import { SymbolLogo } from "@/components/SymbolLogo";
import { resolveLogoUrl } from "@/data/symbolLogos";
import { getMarketStatus } from "@/lib/marketHours";

export interface DBSymbol {
  id: string;
  name: string;
  display_name: string;
  category: string;
  exchange: string | null;
  current_price: number;
  change_percent: number;
  high: number;
  low: number;
  volume: number;
}

const categories = [
  { key: "all", label: "Tümü", icon: Globe },
  { key: "stock", label: "Hisse", icon: Building2 },
  { key: "commodity", label: "Emtia", icon: Gem },
  { key: "index", label: "Endeks", icon: BarChart3 },
  { key: "crypto", label: "Kripto", icon: Bitcoin },
];

const BIST_NAMES = new Set([
  "THYAO","GARAN","AKBNK","SISE","EREGL","KCHOL","SAHOL","TUPRS","YKBNK",
  "ISCTR","ASELS","BIMAS","PGSUS","EKGYO","PETKM","TOASO","TAVHL","FROTO",
  "TCELL","HALKB","VAKBN","DOHOL","ENKAI","ARCLK","VESTL","MGROS","SOKM",
  "GUBRF","SASA","OYAKC","TTKOM","TSKB","AKSA","CIMSA","AEFES","ULKER",
  "DOAS","OTKAR","ISGYO","KRDMD","GESAN","KONTR","ODAS","BRYAT","TTRAK",
  "EUPWR","AGHOL","MAVI","LOGO",
]);

interface SymbolListProps {
  symbols: DBSymbol[];
  loading: boolean;
  onSelectSymbol: (symbol: DBSymbol) => void;
}

export function SymbolList({ symbols, loading, onSelectSymbol }: SymbolListProps) {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSymbols = symbols
    .filter((s) => {
      const matchesCategory = selectedCategory === "all" || s.category === selectedCategory;
      const matchesSearch =
        !searchQuery ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.display_name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => {
      if (a.name === "BIMAS" && b.name !== "BIMAS") return 1;
      if (b.name === "BIMAS" && a.name !== "BIMAS") return -1;
      const aHasLogo = resolveLogoUrl(a.name, a.category) ? 0 : 1;
      const bHasLogo = resolveLogoUrl(b.name, b.category) ? 0 : 1;
      if (aHasLogo !== bHasLogo) return aHasLogo - bHasLogo;
      if (selectedCategory === "all" || selectedCategory === "stock") {
        const aIsBist = a.category === "stock" && BIST_NAMES.has(a.name) ? 0 : 1;
        const bIsBist = b.category === "stock" && BIST_NAMES.has(b.name) ? 0 : 1;
        if (aIsBist !== bIsBist) return aIsBist - bIsBist;
      }
      if (selectedCategory === "all" || selectedCategory === "commodity") {
        const COMMODITY_ORDER = ["XAUUSD", "XAGUSD"];
        const aPri = COMMODITY_ORDER.indexOf(a.name);
        const bPri = COMMODITY_ORDER.indexOf(b.name);
        if (aPri !== bPri) return (aPri >= 0 ? aPri : 999) - (bPri >= 0 ? bPri : 999);
      }
      if ((selectedCategory === "crypto") || (selectedCategory === "all" && a.category === "crypto" && b.category === "crypto")) {
        return (b.current_price || 0) - (a.current_price || 0);
      }
      return a.name.localeCompare(b.name);
    });

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] animate-slide-up">
      <div className="p-3 border-b border-border space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Sembol ara..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 bg-muted/50 h-9 text-sm" />
        </div>
        <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(cat.key)}
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              <cat.icon className="h-3 w-3" />
              {cat.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : filteredSymbols.length === 0 ? (
          <div className="text-center py-16 text-sm text-muted-foreground">Enstrüman bulunamadı.</div>
        ) : (
          filteredSymbols.map((symbol) => {
            const marketStatus = getMarketStatus(symbol.name, symbol.category);
            return (
              <button
                key={symbol.id}
                onClick={() => onSelectSymbol(symbol)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 active:bg-muted/50 transition-all border-b border-border/30"
              >
                <SymbolLogo symbol={symbol.name} category={symbol.category} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{symbol.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{symbol.display_name}</p>
                </div>
                <div className="text-right shrink-0">
                  <AnimatedPrice value={symbol.current_price} live={marketStatus.isOpen} changePercent={symbol.change_percent ?? 0} className="text-sm font-mono font-semibold" />
                  <div className="flex items-center justify-end gap-1 mt-0.5">
                    {!marketStatus.isOpen && (
                      <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground">KAPALI</span>
                    )}
                    <span className={`inline-flex items-center text-[11px] font-mono font-medium px-1.5 py-0.5 rounded ${(symbol.change_percent ?? 0) >= 0 ? "bg-buy/10 text-buy" : "bg-sell/10 text-sell"}`}>
                      {(symbol.change_percent ?? 0) >= 0 ? "+" : ""}{(symbol.change_percent ?? 0).toFixed(2)}%
                    </span>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
