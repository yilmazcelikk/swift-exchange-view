import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  RefreshCw,
  Search,
  TrendingUp,
  Gem,
  BarChart3,
  Bitcoin,
  Building2,
} from "lucide-react";

interface Symbol {
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
  is_active: boolean;
  updated_at: string;
}

const categories = [
  { key: "all", label: "Tümü", icon: BarChart3 },
  { key: "forex", label: "Forex", icon: TrendingUp },
  { key: "commodity", label: "Emtia", icon: Gem },
  { key: "index", label: "Endeks", icon: BarChart3 },
  { key: "crypto", label: "Kripto", icon: Bitcoin },
  { key: "stock", label: "Hisse", icon: Building2 },
];

const AdminProducts = () => {
  const [symbols, setSymbols] = useState<Symbol[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadSymbols();
  }, []);

  const loadSymbols = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("symbols")
      .select("*")
      .order("category")
      .order("name");
    if (error) {
      toast.error("Enstrümanlar yüklenemedi");
    } else {
      setSymbols((data as Symbol[]) || []);
    }
    setLoading(false);
  };

  const toggleActive = async (id: string, currentActive: boolean) => {
    const { error } = await supabase
      .from("symbols")
      .update({ is_active: !currentActive })
      .eq("id", id);
    if (error) {
      toast.error("Güncelleme başarısız");
    } else {
      setSymbols((prev) =>
        prev.map((s) => (s.id === id ? { ...s, is_active: !currentActive } : s))
      );
      toast.success(!currentActive ? "Enstrüman aktif edildi" : "Enstrüman devre dışı bırakıldı");
    }
  };

  const filtered = symbols.filter((s) => {
    const matchCategory = activeCategory === "all" || s.category === activeCategory;
    const matchSearch =
      !searchQuery ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.display_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  const countByCategory = (cat: string) =>
    cat === "all"
      ? symbols.length
      : symbols.filter((s) => s.category === cat).length;

  const categoryColor = (cat: string) => {
    switch (cat) {
      case "forex": return "bg-primary/10 text-primary";
      case "commodity": return "bg-warning/10 text-warning";
      case "index": return "bg-blue-500/10 text-blue-500";
      case "crypto": return "bg-orange-500/10 text-orange-500";
      case "stock": return "bg-emerald-500/10 text-emerald-500";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const categoryLabel = (cat: string) => {
    return categories.find((c) => c.key === cat)?.label ?? cat;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Ürünler / Enstrümanlar</h2>
          <p className="text-sm text-muted-foreground">
            Toplam {symbols.length} enstrüman • {symbols.filter((s) => s.is_active).length} aktif
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadSymbols} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
          Yenile
        </Button>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 flex-wrap">
        {categories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeCategory === cat.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            <cat.icon className="h-4 w-4" />
            {cat.label}
            <span className="text-xs opacity-70">({countByCategory(cat.key)})</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Enstrüman ara..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 bg-muted/50"
        />
      </div>

      {/* Instruments Table */}
      <Card className="border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Sembol</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">İsim</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Kategori</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Borsa</th>
                  <th className="text-right text-xs font-semibold text-muted-foreground px-4 py-3">Fiyat</th>
                  <th className="text-right text-xs font-semibold text-muted-foreground px-4 py-3">Değişim %</th>
                  <th className="text-center text-xs font-semibold text-muted-foreground px-4 py-3">Durum</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((sym) => (
                  <tr key={sym.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-sm font-mono font-bold">{sym.name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm">{sym.display_name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className={`text-[10px] ${categoryColor(sym.category)}`}>
                        {categoryLabel(sym.category)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-muted-foreground">{sym.exchange || "—"}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-mono">
                        {sym.current_price > 0 ? sym.current_price.toLocaleString("tr-TR", { minimumFractionDigits: 2 }) : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-sm font-mono font-medium ${
                        sym.change_percent > 0 ? "text-buy" : sym.change_percent < 0 ? "text-sell" : "text-muted-foreground"
                      }`}>
                        {sym.change_percent !== 0
                          ? `${sym.change_percent > 0 ? "+" : ""}${sym.change_percent.toFixed(2)}%`
                          : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Switch
                        checked={sym.is_active}
                        onCheckedChange={() => toggleActive(sym.id, sym.is_active)}
                      />
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-sm text-muted-foreground">
                      Enstrüman bulunamadı.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminProducts;
