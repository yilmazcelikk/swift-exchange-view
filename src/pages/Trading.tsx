import { useState, useEffect, useRef, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { generateCandleData } from "@/data/mockData";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Search, Minus, Plus, ChevronLeft, Gem, BarChart3, Bitcoin, Building2, Globe } from "lucide-react";
import { AnimatedPrice } from "@/components/AnimatedPrice";
import { SymbolLogo } from "@/components/SymbolLogo";
import { getMarketStatus } from "@/lib/marketHours";

import { toast } from "sonner";

interface DBSymbol {
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

const CONTRACT_SIZE = 100000; // Standard forex lot size

const Trading = () => {
  const { user: authUser } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSymbol, setSelectedSymbol] = useState<DBSymbol | null>(null);
  const [symbols, setSymbols] = useState<DBSymbol[]>([]);
  const [loading, setLoading] = useState(true);
  const [lots, setLots] = useState(0.1);
  const [leverage, setLeverage] = useState("1:200");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");

  // Load user leverage from profile
  useEffect(() => {
    if (authUser) {
      supabase.from("profiles").select("leverage").eq("user_id", authUser.id).single().then(({ data }) => {
        if (data?.leverage) setLeverage(data.leverage);
      });
    }
  }, [authUser]);

  useEffect(() => {
    loadSymbols();

    // Realtime subscription for symbols
    const channel = supabase
      .channel('trading-symbols')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'symbols',
      }, (payload) => {
        if (payload.new) {
          const updated = payload.new as any;
          setSymbols(prev => prev.map(s => s.id === updated.id ? { ...s, ...updated } as DBSymbol : s));
          setSelectedSymbol(prev => prev && prev.id === updated.id ? { ...prev, ...updated } as DBSymbol : prev);
        }
      })
      .subscribe();

    // Poll every 3s as fallback (Realtime handles instant updates)
    const interval = setInterval(() => {
      loadSymbols();
    }, 3000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  const loadSymbols = async () => {
    const { data, error } = await supabase
      .from("symbols")
      .select("id, name, display_name, category, exchange, current_price, change_percent, high, low, volume")
      .eq("is_active", true)
      .order("category")
      .order("name");
    if (!error && data) {
      setSymbols(data as DBSymbol[]);
      if (selectedSymbol) {
        const upd = data.find((s: any) => s.id === selectedSymbol.id);
        if (upd) setSelectedSymbol(upd as DBSymbol);
      }
    }
    setLoading(false);
  };

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
      if (selectedCategory === "all") {
        // BIST stocks first
        const aIsBist = a.category === "stock" && a.exchange === "BIST" ? 0 : 1;
        const bIsBist = b.category === "stock" && b.exchange === "BIST" ? 0 : 1;
        if (aIsBist !== bIsBist) return aIsBist - bIsBist;
      }
      return a.name.localeCompare(b.name);
    });

  const quickLots = [0.01, 0.05, 0.1, 0.5, 1.0, 5.0];

  const getSpread = (price: number) => {
    if (price > 1000) return price * 0.0001;
    if (price > 10) return price * 0.0005;
    return price * 0.001;
  };

  const [orderLoading, setOrderLoading] = useState(false);

  const handleOrder = async (type: "buy" | "sell") => {
    if (!selectedSymbol || !authUser) return;

    // Check market hours
    const status = getMarketStatus(selectedSymbol.name, selectedSymbol.category);
    if (!status.isOpen) {
      toast.error("Piyasa kapalı. Bu enstrümanda şu an işlem açılamaz.", {
        description: status.scheduleLabel,
      });
      return;
    }

    // Check balance
    const { data: profileData } = await supabase
      .from("profiles")
      .select("balance")
      .eq("user_id", authUser.id)
      .single();

    if (!profileData || profileData.balance <= 0) {
      toast.error("Yetersiz bakiye. İşlem açmak için hesabınıza para yatırın.");
      return;
    }

    setOrderLoading(true);
    try {
      const price = selectedSymbol.current_price || 0;
      const { error } = await supabase.from("orders").insert({
        user_id: authUser.id,
        symbol_id: selectedSymbol.id,
        symbol_name: selectedSymbol.name,
        type,
        order_type: "market",
        lots,
        leverage,
        entry_price: price,
        current_price: price,
        stop_loss: stopLoss ? parseFloat(stopLoss) : null,
        take_profit: takeProfit ? parseFloat(takeProfit) : null,
      });
      if (error) throw error;
      toast.success(`${selectedSymbol.name} ${type === "buy" ? "ALIŞ" : "SATIŞ"} emri verildi`, {
        description: `${lots} lot • Kaldıraç: ${leverage}`,
      });
      setStopLoss("");
      setTakeProfit("");
    } catch (err: any) {
      toast.error("Emir başarısız: " + err.message);
    }
    setOrderLoading(false);
  };

  const categoryLabel = (cat: string) => categories.find((c) => c.key === cat)?.label ?? cat;

  const countByCategory = (cat: string) =>
    cat === "all" ? symbols.length : symbols.filter((s) => s.category === cat).length;

  const formatPrice = (price: number) => {
    if (!price || price === 0) return "—";
    if (price < 1) return price.toFixed(5);
    if (price < 10) return price.toFixed(4);
    if (price < 1000) return price.toFixed(2);
    return price.toLocaleString("tr-TR", { minimumFractionDigits: 2 });
  };

  // Symbol list view
  if (!selectedSymbol) {
    return (
      <div className="flex flex-col h-[calc(100vh-3.5rem)] animate-slide-up">
        <div className="p-3 border-b border-border space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Sembol ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-muted/50 h-9 text-sm"
            />
          </div>
          <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(cat.key)}
                className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
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
                  onClick={() => setSelectedSymbol(symbol)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 active:bg-muted/50 transition-all border-b border-border/30"
                >
                  <SymbolLogo symbol={symbol.name} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{symbol.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{symbol.display_name}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <AnimatedPrice value={symbol.current_price} className="text-sm font-mono font-semibold" />
                    <div className="flex items-center justify-end gap-1 mt-0.5">
                      {!marketStatus.isOpen && (
                        <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          KAPALI
                        </span>
                      )}
                      <span
                        className={`inline-flex items-center text-[11px] font-mono font-medium px-1.5 py-0.5 rounded ${
                          (symbol.change_percent ?? 0) >= 0 ? "bg-buy/10 text-buy" : "bg-sell/10 text-sell"
                        }`}
                      >
                        {(symbol.change_percent ?? 0) >= 0 ? "+" : ""}
                        {(symbol.change_percent ?? 0).toFixed(2)}%
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

  // Symbol detail + chart + order panel
  const price = selectedSymbol.current_price || 0;
  const spread = getSpread(price);
  const bid = price - spread / 2;
  const ask = price + spread / 2;
  const candleData = generateCandleData(price, 50);
  const currentMarketStatus = getMarketStatus(selectedSymbol.name, selectedSymbol.category);

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] animate-slide-up">
      {/* Header */}
      <div className="p-3 border-b border-border flex items-center gap-3">
        <button onClick={() => setSelectedSymbol(null)} className="p-1 hover:bg-muted rounded">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold">{selectedSymbol.name}</h2>
              <span
                className={`text-xs font-mono font-semibold ${
                  (selectedSymbol.change_percent ?? 0) >= 0 ? "text-buy" : "text-sell"
                }`}
              >
                {(selectedSymbol.change_percent ?? 0) >= 0 ? "+" : ""}
                {(selectedSymbol.change_percent ?? 0).toFixed(2)}%
              </span>
              <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${
                currentMarketStatus.isOpen ? "bg-buy/10 text-buy" : "bg-muted text-muted-foreground"
              }`}>
                {currentMarketStatus.label}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{selectedSymbol.display_name} • {currentMarketStatus.scheduleLabel}</p>
          </div>
        </div>
        <AnimatedPrice value={price} className="text-lg font-bold font-mono" />
      </div>

      {/* Chart */}
      <div className="flex-1 p-2 min-h-0">
        <div className="h-full bg-muted/30 rounded-lg border border-border flex items-end justify-center gap-0.5 p-3 overflow-hidden">
          {candleData.slice(-60).map((candle, i) => {
            const isGreen = candle.close >= candle.open;
            const allCandles = candleData.slice(-60);
            const range = Math.max(...allCandles.map((c) => c.high)) - Math.min(...allCandles.map((c) => c.low));
            const minPrice = Math.min(...allCandles.map((c) => c.low));
            const bodyTop = ((Math.max(candle.open, candle.close) - minPrice) / range) * 100;
            const bodyBottom = ((Math.min(candle.open, candle.close) - minPrice) / range) * 100;
            const wickTop = ((candle.high - minPrice) / range) * 100;
            const wickBottom = ((candle.low - minPrice) / range) * 100;

            return (
              <div key={i} className="flex flex-col items-center relative" style={{ height: "100%", width: "1.5%", minWidth: "3px" }}>
                <div className={`absolute w-px ${isGreen ? "bg-buy" : "bg-sell"}`} style={{ bottom: `${wickBottom}%`, height: `${wickTop - wickBottom}%` }} />
                <div className={`absolute w-full rounded-sm ${isGreen ? "bg-buy" : "bg-sell"}`} style={{ bottom: `${bodyBottom}%`, height: `${Math.max(bodyTop - bodyBottom, 0.5)}%` }} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Order Panel */}
      <div className="border-t border-border bg-card p-3 space-y-3">
        {/* Market closed warning */}
        {!currentMarketStatus.isOpen && (
          <div className="text-center py-1.5 px-3 rounded-lg bg-muted text-muted-foreground text-xs font-medium">
            Piyasa kapalı — {currentMarketStatus.scheduleLabel}
          </div>
        )}

        {/* Lots row */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={() => setLots(Math.max(0.01, parseFloat((lots - 0.01).toFixed(2))))}>
            <Minus className="h-3 w-3" />
          </Button>
          <Input type="number" value={lots} onChange={(e) => setLots(parseFloat(e.target.value) || 0)} className="text-center font-mono bg-muted/50 h-8 text-sm" step={0.01} />
          <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={() => setLots(parseFloat((lots + 0.01).toFixed(2)))}>
            <Plus className="h-3 w-3" />
          </Button>
        </div>

        {/* Quick lots */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {quickLots.map((l) => (
            <button
              key={l}
              onClick={() => setLots(l)}
              className={`px-2.5 py-1 rounded text-xs font-mono font-medium whitespace-nowrap transition-colors ${
                lots === l ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        {/* SL / TP */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-muted-foreground mb-0.5 block">Zarar Durdur (SL)</label>
            <Input type="number" placeholder="Opsiyonel" value={stopLoss} onChange={(e) => setStopLoss(e.target.value)} className="bg-muted/50 h-8 text-xs font-mono" />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground mb-0.5 block">Kâr Al (TP)</label>
            <Input type="number" placeholder="Opsiyonel" value={takeProfit} onChange={(e) => setTakeProfit(e.target.value)} className="bg-muted/50 h-8 text-xs font-mono" />
          </div>
        </div>

        {/* Buy / Sell */}
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={() => handleOrder("sell")} disabled={orderLoading || !currentMarketStatus.isOpen} className="h-11 bg-sell hover:bg-sell/90 text-sell-foreground font-bold disabled:opacity-50">SAT</Button>
          <Button onClick={() => handleOrder("buy")} disabled={orderLoading || !currentMarketStatus.isOpen} className="h-11 bg-buy hover:bg-buy/90 text-buy-foreground font-bold disabled:opacity-50">AL</Button>
        </div>
      </div>
    </div>
  );
};

export default Trading;
