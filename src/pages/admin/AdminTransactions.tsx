import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CheckCircle, XCircle, ArrowDownToLine, ArrowUpFromLine,
  RefreshCw, Plus, Landmark, FileText, Trash2,
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
}

const AdminTransactions = () => {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newAccount, setNewAccount] = useState({ bank_name: "", account_holder: "", iban: "", currency: "TRY" });

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    const [bankRes, txRes] = await Promise.all([
      supabase.from("bank_accounts").select("*").order("created_at"),
      supabase.from("transactions").select("*").order("created_at", { ascending: false }),
    ]);
    setBankAccounts((bankRes.data as BankAccount[]) || []);
    setTransactions((txRes.data as TransactionRow[]) || []);
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
    if (error) {
      toast.error("Ekleme başarısız: " + error.message);
    } else {
      toast.success("Banka hesabı eklendi");
      setNewAccount({ bank_name: "", account_holder: "", iban: "", currency: "TRY" });
      setShowAddDialog(false);
      loadAll();
    }
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
    if (error) {
      toast.error("Güncelleme başarısız");
    } else {
      toast.success(status === "approved" ? "Onaylandı" : "Reddedildi");
      loadAll();
    }
  };

  const activeAccounts = bankAccounts.filter((a) => a.is_active);
  const currencies = new Set(bankAccounts.map((a) => a.currency));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Banka Yönetimi</h2>
          <p className="text-sm text-muted-foreground">Banka hesapları ve para transferi işlemleri</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadAll} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            Yenile
          </Button>
          <Button size="sm" onClick={() => setShowAddDialog(true)} className="gap-1">
            <Plus className="h-4 w-4" /> Hesap Ekle
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-border">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Toplam Banka</p>
            <p className="text-2xl font-bold text-primary">{bankAccounts.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Aktif Hesap</p>
            <p className="text-2xl font-bold text-primary">
              {activeAccounts.length} / {bankAccounts.length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Para Birimleri</p>
            <p className="text-2xl font-bold text-primary">{currencies.size}</p>
          </CardContent>
        </Card>
      </div>

      {/* Bank Accounts List */}
      <Card className="border-border">
        <CardContent className="p-0">
          {bankAccounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <FileText className="h-10 w-10 mb-3 opacity-40" />
              <p className="text-sm">Henüz tanımlı banka bulunmuyor.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {bankAccounts.map((acc) => (
                <div key={acc.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Landmark className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{acc.bank_name}</p>
                      <p className="text-xs text-muted-foreground">{acc.account_holder}</p>
                      <p className="text-xs font-mono text-muted-foreground">{acc.iban}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">{acc.currency}</span>
                    <Button
                      size="sm"
                      variant={acc.is_active ? "default" : "outline"}
                      className="text-xs h-7 px-2"
                      onClick={() => toggleAccount(acc.id, acc.is_active)}
                    >
                      {acc.is_active ? "Aktif" : "Pasif"}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteAccount(acc.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transactions */}
      {transactions.length > 0 && (
        <>
          <h3 className="text-lg font-bold">Para Transferi İşlemleri</h3>
          <div className="space-y-2">
            {transactions.map((tx) => (
              <Card key={tx.id} className="bg-card border-border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${tx.type === "deposit" ? "bg-buy/10" : "bg-sell/10"}`}>
                        {tx.type === "deposit" ? (
                          <ArrowDownToLine className="h-4 w-4 text-buy" />
                        ) : (
                          <ArrowUpFromLine className="h-4 w-4 text-sell" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{tx.type === "deposit" ? "Yatırma" : "Çekme"}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(tx.created_at).toLocaleDateString("tr-TR")} • {tx.method || "—"}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-mono">{tx.user_id.slice(0, 8)}...</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-mono font-bold">
                          {Number(tx.amount).toLocaleString("tr-TR")} {tx.currency}
                        </p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          tx.status === "approved" ? "bg-buy/20 text-buy" :
                          tx.status === "pending" ? "bg-warning/20 text-warning" :
                          "bg-sell/20 text-sell"
                        }`}>
                          {tx.status === "approved" ? "Onaylı" : tx.status === "pending" ? "Bekliyor" : "Reddedildi"}
                        </span>
                      </div>
                      {tx.status === "pending" && (
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-buy hover:bg-buy/10" onClick={() => updateTxStatus(tx.id, "approved")}>
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-sell hover:bg-sell/10" onClick={() => updateTxStatus(tx.id, "rejected")}>
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
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
              <Input
                placeholder="Örn: Ziraat Bankası"
                value={newAccount.bank_name}
                onChange={(e) => setNewAccount({ ...newAccount, bank_name: e.target.value })}
                className="bg-muted/50"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Hesap Sahibi</label>
              <Input
                placeholder="Ad Soyad"
                value={newAccount.account_holder}
                onChange={(e) => setNewAccount({ ...newAccount, account_holder: e.target.value })}
                className="bg-muted/50"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">IBAN</label>
              <Input
                placeholder="TR00 0000 0000 0000 0000 0000 00"
                value={newAccount.iban}
                onChange={(e) => setNewAccount({ ...newAccount, iban: e.target.value })}
                className="bg-muted/50 font-mono"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Para Birimi</label>
              <Input
                placeholder="TRY"
                value={newAccount.currency}
                onChange={(e) => setNewAccount({ ...newAccount, currency: e.target.value.toUpperCase() })}
                className="bg-muted/50"
              />
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
