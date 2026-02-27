import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  CheckCircle, XCircle, ArrowDownToLine, ArrowUpFromLine,
  RefreshCw, Plus, Landmark, FileText, Trash2, Wallet, Clock, Eye, User,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

interface BankAccount {
  id: string;
  bank_name: string;
  account_holder: string;
  iban: string;
  currency: string;
  is_active: boolean;
}

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

type TabKey = "all" | "deposits" | "withdrawals" | "bank";

const tabs: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: "all", label: "Tümü", icon: Wallet },
  { key: "deposits", label: "Yatırma", icon: ArrowDownToLine },
  { key: "withdrawals", label: "Çekme", icon: ArrowUpFromLine },
  { key: "bank", label: "Banka Hesapları", icon: Landmark },
];

const AdminTransactions = () => {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newAccount, setNewAccount] = useState({ bank_name: "", account_holder: "", iban: "", currency: "TRY" });
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState<string | null>(null);
  const [receiptPreviewOpen, setReceiptPreviewOpen] = useState(false);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    const [bankRes, txRes] = await Promise.all([
      supabase.from("bank_accounts").select("*").order("created_at"),
      supabase.from("transactions").select("*").order("created_at", { ascending: false }),
    ]);
    setBankAccounts((bankRes.data as BankAccount[]) || []);
    
    const txData = (txRes.data || []) as any[];
    // Fetch user names
    if (txData.length > 0) {
      const userIds = [...new Set(txData.map(t => t.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);
      const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);
      setTransactions(txData.map(t => ({
        ...t,
        user_name: profileMap.get(t.user_id) || t.user_id.slice(0, 8) + "...",
      })));
    } else {
      setTransactions([]);
    }
    setLoading(false);
  };

  const handleAddAccount = async () => {
    if (!newAccount.bank_name.trim() || !newAccount.iban.trim() || !newAccount.account_holder.trim()) {
      toast.error("Tüm alanları doldurun");
      return;
    }
    const { error } = await supabase.from("bank_accounts").insert({
      bank_name: newAccount.bank_name,
      account_holder: newAccount.account_holder,
      iban: newAccount.iban,
      currency: newAccount.currency,
    });
    if (error) { toast.error("Ekleme başarısız: " + error.message); return; }
    toast.success("Banka hesabı eklendi");
    setNewAccount({ bank_name: "", account_holder: "", iban: "", currency: "TRY" });
    setShowAddDialog(false);
    loadAll();
  };

  const toggleAccount = async (id: string, currentActive: boolean) => {
    await supabase.from("bank_accounts").update({ is_active: !currentActive }).eq("id", id);
    toast.success(!currentActive ? "Hesap aktif edildi" : "Hesap devre dışı bırakıldı");
    loadAll();
  };

  const deleteAccount = async (id: string) => {
    await supabase.from("bank_accounts").delete().eq("id", id);
    toast.success("Hesap silindi");
    loadAll();
  };

  const updateTxStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("transactions").update({ status }).eq("id", id);
    if (error) { toast.error("Güncelleme başarısız"); return; }
    toast.success(status === "approved" ? "Onaylandı" : "Reddedildi");
    loadAll();
  };

  const pendingCount = transactions.filter((t) => t.status === "pending").length;
  const depositTotal = transactions.filter((t) => t.type === "deposit" && t.status === "approved").reduce((s, t) => s + Number(t.amount), 0);
  const withdrawTotal = transactions.filter((t) => t.type === "withdrawal" && t.status === "approved").reduce((s, t) => s + Number(t.amount), 0);

  const filteredTx = transactions.filter((tx) => {
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
          <p className="text-sm text-muted-foreground">Banka hesapları ve para transferi talepleri</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadAll} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
          Yenile
        </Button>
      </div>

      {/* Stats — matches AdminSettings system info style */}
      <Card className="border-border">
        <CardContent className="divide-y divide-border p-0">
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-semibold">Bekleyen Talepler</p>
              <p className="text-xs text-muted-foreground">Onay bekleyen yatırma/çekme</p>
            </div>
            <span className={`flex items-center gap-1.5 text-sm font-bold ${pendingCount > 0 ? "text-warning" : "text-buy"}`}>
              <Clock className="h-4 w-4" />
              {pendingCount}
            </span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-semibold">Toplam Yatırma</p>
              <p className="text-xs text-muted-foreground">Onaylanan yatırma toplamı</p>
            </div>
            <span className="text-sm font-mono font-bold text-buy">
              {depositTotal.toLocaleString("tr-TR")} ₺
            </span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-semibold">Toplam Çekim</p>
              <p className="text-xs text-muted-foreground">Onaylanan çekim toplamı</p>
            </div>
            <span className="text-sm font-mono font-bold text-sell">
              {withdrawTotal.toLocaleString("tr-TR")} ₺
            </span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-semibold">Banka Hesapları</p>
              <p className="text-xs text-muted-foreground">Aktif / Toplam</p>
            </div>
            <span className="flex items-center gap-1.5 text-sm font-bold text-buy">
              <CheckCircle className="h-4 w-4" />
              {bankAccounts.filter((a) => a.is_active).length} / {bankAccounts.length}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
            {tab.key === "all" && <span className="text-xs opacity-70">({transactions.length})</span>}
            {tab.key === "deposits" && <span className="text-xs opacity-70">({transactions.filter((t) => t.type === "deposit").length})</span>}
            {tab.key === "withdrawals" && <span className="text-xs opacity-70">({transactions.filter((t) => t.type === "withdrawal").length})</span>}
            {tab.key === "bank" && <span className="text-xs opacity-70">({bankAccounts.length})</span>}
          </button>
        ))}
      </div>

      {/* Bank Accounts Tab */}
      {activeTab === "bank" && (
        <>
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setShowAddDialog(true)} className="gap-1">
              <Plus className="h-4 w-4" /> Hesap Ekle
            </Button>
          </div>
          <Card className="border-border">
            <CardContent className="p-0">
              {bankAccounts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <FileText className="h-10 w-10 mb-3 opacity-40" />
                  <p className="text-sm">Henüz tanımlı banka bulunmuyor.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Banka</th>
                        <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Hesap Sahibi</th>
                        <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">IBAN</th>
                        <th className="text-center text-xs font-semibold text-muted-foreground px-4 py-3">Birim</th>
                        <th className="text-center text-xs font-semibold text-muted-foreground px-4 py-3">Durum</th>
                        <th className="text-center text-xs font-semibold text-muted-foreground px-4 py-3">İşlem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bankAccounts.map((acc) => (
                        <tr key={acc.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 rounded-lg bg-primary/10">
                                <Landmark className="h-4 w-4 text-primary" />
                              </div>
                              <span className="text-sm font-semibold">{acc.bank_name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm">{acc.account_holder}</td>
                          <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{acc.iban}</td>
                          <td className="px-4 py-3 text-center text-xs font-medium">{acc.currency}</td>
                          <td className="px-4 py-3 text-center">
                            <Switch checked={acc.is_active} onCheckedChange={() => toggleAccount(acc.id, acc.is_active)} />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteAccount(acc.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Transactions List */}
      {activeTab !== "bank" && (
        <Card className="border-border">
          <CardContent className="p-0">
            {filteredTx.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Wallet className="h-10 w-10 mb-3 opacity-40" />
                <p className="text-sm">İşlem bulunamadı.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Tür</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Kullanıcı</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Tarih</th>
                      <th className="text-right text-xs font-semibold text-muted-foreground px-4 py-3">Tutar</th>
                      <th className="text-center text-xs font-semibold text-muted-foreground px-4 py-3">Dekont</th>
                      <th className="text-center text-xs font-semibold text-muted-foreground px-4 py-3">Durum</th>
                      <th className="text-center text-xs font-semibold text-muted-foreground px-4 py-3">İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTx.map((tx) => (
                      <tr key={tx.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-lg ${tx.type === "deposit" ? "bg-buy/10" : "bg-sell/10"}`}>
                              {tx.type === "deposit"
                                ? <ArrowDownToLine className="h-4 w-4 text-buy" />
                                : <ArrowUpFromLine className="h-4 w-4 text-sell" />
                              }
                            </div>
                            <span className="text-sm font-medium">{tx.type === "deposit" ? "Yatırma" : "Çekme"}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">{tx.user_name || tx.user_id.slice(0, 8)}</p>
                              <p className="text-[10px] font-mono text-muted-foreground">{tx.user_id.slice(0, 8)}...</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {new Date(tx.created_at).toLocaleDateString("tr-TR")}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm font-mono font-bold">
                            {Number(tx.amount).toLocaleString("tr-TR")} {tx.currency}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
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
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            tx.status === "approved" ? "bg-buy/20 text-buy" :
                            tx.status === "pending" ? "bg-warning/20 text-warning" :
                            "bg-sell/20 text-sell"
                          }`}>
                            {tx.status === "approved" ? "Onaylı" : tx.status === "pending" ? "Bekliyor" : "Reddedildi"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {tx.status === "pending" ? (
                            <div className="flex justify-center gap-1">
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-buy hover:bg-buy/10" onClick={() => updateTxStatus(tx.id, "approved")}>
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-sell hover:bg-sell/10" onClick={() => updateTxStatus(tx.id, "rejected")}>
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
      )}

      {/* Add Account Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Banka Hesabı Ekle</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Banka Adı</label>
              <Input placeholder="Örn: Ziraat Bankası" value={newAccount.bank_name} onChange={(e) => setNewAccount({ ...newAccount, bank_name: e.target.value })} className="bg-muted/50" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Hesap Sahibi</label>
              <Input placeholder="Ad Soyad" value={newAccount.account_holder} onChange={(e) => setNewAccount({ ...newAccount, account_holder: e.target.value })} className="bg-muted/50" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">IBAN</label>
              <Input placeholder="TR00 0000 0000 0000 0000 0000 00" value={newAccount.iban} onChange={(e) => setNewAccount({ ...newAccount, iban: e.target.value })} className="bg-muted/50 font-mono" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Para Birimi</label>
              <Input placeholder="TRY" value={newAccount.currency} onChange={(e) => setNewAccount({ ...newAccount, currency: e.target.value.toUpperCase() })} className="bg-muted/50" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>İptal</Button>
            <Button onClick={handleAddAccount}>Ekle</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminTransactions;
