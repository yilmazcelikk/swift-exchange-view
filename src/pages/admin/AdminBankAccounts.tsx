import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Plus, Landmark, FileText, Trash2, RefreshCw } from "lucide-react";
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

const AdminBankAccounts = () => {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newAccount, setNewAccount] = useState({ bank_name: "", account_holder: "", iban: "", currency: "TRY" });

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("bank_accounts").select("*").order("created_at");
    setAccounts((data as BankAccount[]) || []);
    setLoading(false);
  };

  const handleAdd = async () => {
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
    load();
  };

  const toggleAccount = async (id: string, currentActive: boolean) => {
    await supabase.from("bank_accounts").update({ is_active: !currentActive }).eq("id", id);
    toast.success(!currentActive ? "Hesap aktif edildi" : "Hesap devre dışı bırakıldı");
    load();
  };

  const deleteAccount = async (id: string) => {
    await supabase.from("bank_accounts").delete().eq("id", id);
    toast.success("Hesap silindi");
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Banka Hesapları</h2>
          <p className="text-sm text-muted-foreground">Kullanıcılara gösterilen banka hesaplarını yönetin</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            Yenile
          </Button>
          <Button size="sm" onClick={() => setShowAddDialog(true)} className="gap-1">
            <Plus className="h-4 w-4" /> Hesap Ekle
          </Button>
        </div>
      </div>

      <Card className="border-border">
        <CardContent className="p-0">
          {accounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <FileText className="h-10 w-10 mb-3 opacity-40" />
              <p className="text-sm">Henüz tanımlı banka hesabı bulunmuyor.</p>
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
                  {accounts.map((acc) => (
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

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Banka Hesabı</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Banka Adı" value={newAccount.bank_name} onChange={(e) => setNewAccount({ ...newAccount, bank_name: e.target.value })} />
            <Input placeholder="Hesap Sahibi" value={newAccount.account_holder} onChange={(e) => setNewAccount({ ...newAccount, account_holder: e.target.value })} />
            <Input placeholder="IBAN" value={newAccount.iban} onChange={(e) => setNewAccount({ ...newAccount, iban: e.target.value })} />
            <Input placeholder="Birim (TRY)" value={newAccount.currency} onChange={(e) => setNewAccount({ ...newAccount, currency: e.target.value })} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>İptal</Button>
            <Button onClick={handleAdd}>Ekle</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminBankAccounts;
