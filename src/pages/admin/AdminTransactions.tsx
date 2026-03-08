import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CheckCircle, XCircle, ArrowDownToLine, ArrowUpFromLine,
  RefreshCw, Wallet, Clock, Eye, User,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

interface TransactionRow {
  id: string;
  user_id: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  method: string | null;
  created_at: string;
  receipt_url?: string | null;
  user_name?: string;
}

type TabKey = "all" | "deposits" | "withdrawals";

const tabs: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: "all", label: "Tümü", icon: Wallet },
  { key: "deposits", label: "Yatırma", icon: ArrowDownToLine },
  { key: "withdrawals", label: "Çekme", icon: ArrowUpFromLine },
];

const AdminTransactions = () => {
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState<string | null>(null);
  const [receiptPreviewOpen, setReceiptPreviewOpen] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data: txData } = await supabase
      .from("transactions")
      .select("*")
      .order("created_at", { ascending: false });

    const txList = (txData || []) as any[];
    if (txList.length > 0) {
      const userIds = [...new Set(txList.map(t => t.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);
      const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);
      setTransactions(txList.map(t => ({
        ...t,
        user_name: profileMap.get(t.user_id) || t.user_id.slice(0, 8) + "...",
      })));
    } else {
      setTransactions([]);
    }
    setLoading(false);
  };

  const getUsdTryRate = async (): Promise<number> => {
    const { data } = await supabase
      .from("symbols")
      .select("current_price")
      .eq("name", "USDTRY")
      .single();
    return data?.current_price && Number(data.current_price) > 0 ? Number(data.current_price) : 32.0;
  };

  const updateTxStatus = async (id: string, status: string) => {
    const tx = transactions.find(t => t.id === id);
    const { error } = await supabase.from("transactions").update({ status }).eq("id", id);
    if (error) { toast.error("Güncelleme başarısız"); return; }

    if (status === "approved" && tx) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("balance, equity, free_margin")
        .eq("user_id", tx.user_id)
        .single();

      if (profile) {
        let amount = Number(tx.amount);
        if (tx.currency === "TRY") {
          const rate = await getUsdTryRate();
          amount = Number((amount / rate).toFixed(2));
          toast.info(`Kur: 1 USD = ${rate.toFixed(2)} TRY → ${amount.toFixed(2)} USD`);
        }

        const sign = tx.type === "deposit" ? 1 : -1;
        await supabase.from("profiles").update({
          balance: Number(profile.balance) + sign * amount,
          equity: Number(profile.equity) + sign * amount,
          free_margin: Number(profile.free_margin) + sign * amount,
        }).eq("user_id", tx.user_id);
      }
    }

    toast.success(status === "approved" ? "Onaylandı" : "Reddedildi");
    load();
  };

  const pendingCount = transactions.filter(t => t.status === "pending").length;
  const depositTotal = transactions.filter(t => t.type === "deposit" && t.status === "approved").reduce((s, t) => s + Number(t.amount), 0);
  const withdrawTotal = transactions.filter(t => t.type === "withdrawal" && t.status === "approved").reduce((s, t) => s + Number(t.amount), 0);

  const filteredTx = transactions.filter(tx => {
    if (activeTab === "deposits") return tx.type === "deposit";
    if (activeTab === "withdrawals") return tx.type === "withdrawal";
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Finans Talepleri</h2>
          <p className="text-sm text-muted-foreground">Para yatırma ve çekme taleplerini yönetin</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
          Yenile
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="border-border bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-warning/10">
              <Clock className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingCount}</p>
              <p className="text-xs text-muted-foreground">Bekleyen Talep</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-buy/10">
              <ArrowDownToLine className="h-5 w-5 text-buy" />
            </div>
            <div>
              <p className="text-2xl font-bold font-mono">{depositTotal.toLocaleString("tr-TR")} ₺</p>
              <p className="text-xs text-muted-foreground">Toplam Yatırma</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sell/10">
              <ArrowUpFromLine className="h-5 w-5 text-sell" />
            </div>
            <div>
              <p className="text-2xl font-bold font-mono">{withdrawTotal.toLocaleString("tr-TR")} ₺</p>
              <p className="text-xs text-muted-foreground">Toplam Çekim</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === tab.key
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/60 text-muted-foreground hover:bg-muted"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
            <span className="text-xs opacity-70 ml-0.5">
              ({activeTab === tab.key ? filteredTx.length : 
                tab.key === "all" ? transactions.length :
                tab.key === "deposits" ? transactions.filter(t => t.type === "deposit").length :
                transactions.filter(t => t.type === "withdrawal").length
              })
            </span>
          </button>
        ))}
      </div>

      {/* Transactions Table */}
      <Card className="border-border overflow-hidden">
        <CardContent className="p-0">
          {filteredTx.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Wallet className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-sm font-medium">İşlem bulunamadı</p>
              <p className="text-xs opacity-60 mt-1">Henüz bir finans talebi yok</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Tür</th>
                    <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Kullanıcı</th>
                    <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Tarih</th>
                    <th className="text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Tutar</th>
                    <th className="text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Dekont</th>
                    <th className="text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Durum</th>
                    <th className="text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTx.map((tx) => (
                    <tr key={tx.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className={`p-1.5 rounded-lg ${tx.type === "deposit" ? "bg-buy/10" : "bg-sell/10"}`}>
                            {tx.type === "deposit"
                              ? <ArrowDownToLine className="h-4 w-4 text-buy" />
                              : <ArrowUpFromLine className="h-4 w-4 text-sell" />
                            }
                          </div>
                          <span className="text-sm font-medium">{tx.type === "deposit" ? "Yatırma" : "Çekme"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div>
                            <p className="text-sm font-medium leading-tight">{tx.user_name}</p>
                            <p className="text-[10px] font-mono text-muted-foreground">{tx.user_id.slice(0, 8)}...</p>
                          </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-sm">{new Date(tx.created_at).toLocaleDateString("tr-TR")}</p>
                        <p className="text-[10px] text-muted-foreground">{new Date(tx.created_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}</p>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className={`text-sm font-mono font-bold ${tx.type === "deposit" ? "text-buy" : "text-sell"}`}>
                          {tx.type === "deposit" ? "+" : "-"}{Number(tx.amount).toLocaleString("tr-TR")} {tx.currency}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {tx.receipt_url ? (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-primary hover:bg-primary/10"
                            onClick={async () => {
                              const { data } = await supabase.storage.from("receipts").createSignedUrl(tx.receipt_url!, 300);
                              if (data?.signedUrl) {
                                setReceiptPreviewUrl(data.signedUrl);
                                setReceiptPreviewOpen(true);
                              } else {
                                toast.error("Dekont yüklenemedi");
                              }
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full ${
                          tx.status === "approved" ? "bg-buy/15 text-buy" :
                          tx.status === "pending" ? "bg-warning/15 text-warning" :
                          "bg-sell/15 text-sell"
                        }`}>
                          {tx.status === "approved" ? "Onaylı" : tx.status === "pending" ? "Bekliyor" : "Reddedildi"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {tx.status === "pending" ? (
                          <div className="flex justify-center gap-1">
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-buy hover:bg-buy/10 rounded-lg" onClick={() => updateTxStatus(tx.id, "approved")}>
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-sell hover:bg-sell/10 rounded-lg" onClick={() => updateTxStatus(tx.id, "rejected")}>
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Receipt Preview Dialog */}
      <Dialog open={receiptPreviewOpen} onOpenChange={setReceiptPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Dekont Önizleme</DialogTitle>
          </DialogHeader>
          {receiptPreviewUrl && (
            <div className="flex items-center justify-center overflow-auto max-h-[65vh]">
              {receiptPreviewUrl.includes(".pdf") ? (
                <iframe src={receiptPreviewUrl} className="w-full h-[60vh] rounded-lg border" />
              ) : (
                <img src={receiptPreviewUrl} alt="Dekont" className="max-w-full max-h-[60vh] rounded-lg object-contain" />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminTransactions;
