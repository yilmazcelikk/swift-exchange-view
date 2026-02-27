import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { mockSymbols, symbolCategories, generateCandleData } from "@/data/mockData";
import { Symbol } from "@/types";
import { Star, Search, Minus, Plus } from "lucide-react";

const Trading = () => {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSymbol, setSelectedSymbol] = useState<Symbol>(mockSymbols[0]);
  const [lots, setLots] = useState(0.1);
  const [orderType, setOrderType] = useState<"market" | "limit">("market");

  const filteredSymbols = mockSymbols.filter((s) => {
    const matchesCategory = selectedCategory === "all" || s.category === selectedCategory;
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.displayName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const candleData = generateCandleData(selectedSymbol.price, 50);

  const quickLots = [0.01, 0.05, 0.1, 0.5, 1.0, 5.0];

  return (
    <div className="flex h-[calc(100vh-3.5rem)] animate-slide-up">
      {/* Left Panel — Symbol List */}
      <div className="w-72 border-r border-border bg-card flex flex-col">
        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Sembol ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-muted/50 h-9 text-sm"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-1 p-2 border-b border-border">
          {symbolCategories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(cat.key)}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                selectedCategory === cat.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredSymbols.map((symbol) => (
            <button
              key={symbol.id}
              onClick={() => setSelectedSymbol(symbol)}
              className={`w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-muted/50 transition-colors border-b border-border/50 ${
                selectedSymbol.id === symbol.id ? "bg-primary/5 border-l-2 border-l-primary" : ""
              }`}
            >
              <div className="flex items-center gap-2">
                {symbol.isFavorite && <Star className="h-3 w-3 text-warning fill-warning" />}
                <div>
                  <p className="text-sm font-semibold">{symbol.name}</p>
                  <p className="text-xs text-muted-foreground">{symbol.displayName}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-mono font-semibold">{symbol.price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</p>
                <p className={`text-xs font-mono ${symbol.changePercent >= 0 ? "text-buy" : "text-sell"}`}>
                  {symbol.changePercent >= 0 ? "+" : ""}{symbol.changePercent.toFixed(2)}%
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Center — Chart Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold">{selectedSymbol.name}</h2>
            <span className="text-sm text-muted-foreground">{selectedSymbol.displayName}</span>
            <span className={`text-sm font-mono font-semibold ${selectedSymbol.changePercent >= 0 ? "text-buy" : "text-sell"}`}>
              {selectedSymbol.price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ({selectedSymbol.changePercent >= 0 ? "+" : ""}{selectedSymbol.changePercent.toFixed(2)}%)
            </span>
          </div>
          <div className="flex gap-2">
            {["1D", "1H", "4H", "1G", "1A"].map((tf) => (
              <button key={tf} className="px-3 py-1 rounded text-xs font-medium text-muted-foreground hover:bg-muted transition-colors">
                {tf}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 p-4">
          {/* Simple candle visualization */}
          <div className="h-full bg-muted/30 rounded-lg border border-border flex items-end justify-center gap-0.5 p-4 overflow-hidden">
            {candleData.slice(-80).map((candle, i) => {
              const isGreen = candle.close >= candle.open;
              const range = Math.max(...candleData.slice(-80).map(c => c.high)) - Math.min(...candleData.slice(-80).map(c => c.low));
              const minPrice = Math.min(...candleData.slice(-80).map(c => c.low));
              const bodyTop = ((Math.max(candle.open, candle.close) - minPrice) / range) * 100;
              const bodyBottom = ((Math.min(candle.open, candle.close) - minPrice) / range) * 100;
              const wickTop = ((candle.high - minPrice) / range) * 100;
              const wickBottom = ((candle.low - minPrice) / range) * 100;

              return (
                <div key={i} className="flex flex-col items-center relative" style={{ height: '100%', width: '1%', minWidth: '3px' }}>
                  {/* Wick */}
                  <div
                    className={`absolute w-px ${isGreen ? 'bg-buy' : 'bg-sell'}`}
                    style={{
                      bottom: `${wickBottom}%`,
                      height: `${wickTop - wickBottom}%`,
                    }}
                  />
                  {/* Body */}
                  <div
                    className={`absolute w-full rounded-sm ${isGreen ? 'bg-buy' : 'bg-sell'}`}
                    style={{
                      bottom: `${bodyBottom}%`,
                      height: `${Math.max(bodyTop - bodyBottom, 0.5)}%`,
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
        {/* Price info bar */}
        <div className="px-4 py-2 border-t border-border flex items-center gap-6 text-xs text-muted-foreground">
          <span>Açılış: <span className="text-foreground font-mono">{selectedSymbol.price.toFixed(2)}</span></span>
          <span>Yüksek: <span className="text-buy font-mono">{selectedSymbol.high.toFixed(2)}</span></span>
          <span>Düşük: <span className="text-sell font-mono">{selectedSymbol.low.toFixed(2)}</span></span>
          <span>Hacim: <span className="text-foreground font-mono">12,450</span></span>
        </div>
      </div>

      {/* Right Panel — Order */}
      <div className="w-80 border-l border-border bg-card flex flex-col">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-sm mb-3">Emir Paneli</h3>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="p-3 rounded-lg bg-sell/10 border border-sell/20 text-center">
              <p className="text-xs text-muted-foreground mb-1">Satış</p>
              <p className="text-lg font-bold font-mono text-sell">{selectedSymbol.bid.toFixed(selectedSymbol.bid < 10 ? 4 : 2)}</p>
            </div>
            <div className="p-3 rounded-lg bg-buy/10 border border-buy/20 text-center">
              <p className="text-xs text-muted-foreground mb-1">Alış</p>
              <p className="text-lg font-bold font-mono text-buy">{selectedSymbol.ask.toFixed(selectedSymbol.ask < 10 ? 4 : 2)}</p>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4 flex-1">
          {/* Order Type */}
          <div className="flex gap-2">
            {(["market", "limit"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setOrderType(t)}
                className={`flex-1 py-2 rounded text-sm font-medium transition-colors ${
                  orderType === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {t === "market" ? "Market" : "Limit"}
              </button>
            ))}
          </div>

          {/* Lots */}
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Lot Miktarı</label>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setLots(Math.max(0.01, lots - 0.01))}>
                <Minus className="h-3 w-3" />
              </Button>
              <Input
                type="number"
                value={lots}
                onChange={(e) => setLots(parseFloat(e.target.value) || 0)}
                className="text-center font-mono bg-muted/50"
                step={0.01}
              />
              <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setLots(lots + 0.01)}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Quick Lots */}
          <div className="flex flex-wrap gap-1.5">
            {quickLots.map((l) => (
              <button
                key={l}
                onClick={() => setLots(l)}
                className={`px-3 py-1.5 rounded text-xs font-mono font-medium transition-colors ${
                  lots === l ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {l}
              </button>
            ))}
          </div>

          {/* SL / TP */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Zarar Durdur</label>
              <Input placeholder="—" className="bg-muted/50 font-mono text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Kâr Al</label>
              <Input placeholder="—" className="bg-muted/50 font-mono text-sm" />
            </div>
          </div>
        </div>

        {/* Buy / Sell Buttons */}
        <div className="p-4 border-t border-border grid grid-cols-2 gap-3">
          <Button className="h-12 bg-sell hover:bg-sell/90 text-sell-foreground font-bold text-base">
            SAT
          </Button>
          <Button className="h-12 bg-buy hover:bg-buy/90 text-buy-foreground font-bold text-base">
            AL
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Trading;
