import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Plus, Landmark, Trash2, RefreshCw, CheckCircle, XCircle, Building2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface BankAccount {
  id: string;
  bank_name: string;
  account_holder: string;
  iban: string;
  currency: string;
  is_active: boolean;
  description: string | null;
}

const AdminBankAccounts = () => {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [newAccount, setNewAccount] = useState({ bank_name: "", account_holder: "", iban: "", currency: "TRY", description: "" });

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
      description: newAccount.description || null,
    });
    if (error) { toast.error("Ekleme başarısız: " + error.message); return; }
    toast.success("Banka hesabı eklendi");
    setNewAccount({ bank_name: "", account_holder: "", iban: "", currency: "TRY", description: "" });
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
    setDeletingId(null);
    load();
  };

  const activeCount = accounts.filter(a => a.is_active).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg md:text-2xl font-bold">Banka Hesapları</h2>
          <p className="text-xs md:text-sm text-muted-foreground">Kullanıcılara gösterilen banka hesaplarını yönetin</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Yenile
          </Button>
          <Button size="sm" onClick={() => setShowAddDialog(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> Hesap Ekle
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="border-border bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{accounts.length}</p>
              <p className="text-xs text-muted-foreground">Toplam Hesap</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-buy/10">
              <CheckCircle className="h-5 w-5 text-buy" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeCount}</p>
              <p className="text-xs text-muted-foreground">Aktif Hesap</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sell/10">
              <XCircle className="h-5 w-5 text-sell" />
            </div>
            <div>
              <p className="text-2xl font-bold">{accounts.length - activeCount}</p>
              <p className="text-xs text-muted-foreground">Pasif Hesap</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="border-border overflow-hidden">
        <CardContent className="p-0">
          {accounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Landmark className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-sm font-medium">Henüz banka hesabı yok</p>
              <p className="text-xs opacity-60 mt-1">Yeni bir hesap ekleyerek başlayın</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                     <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Banka</th>
                     <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Hesap Sahibi</th>
                     <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">IBAN</th>
                     <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Açıklama</th>
                     <th className="text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Birim</th>
                     <th className="text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Durum</th>
                     <th className="text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((acc) => (
                    <tr key={acc.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 rounded-lg bg-primary/10">
                            <Landmark className="h-4 w-4 text-primary" />
                          </div>
                          <span className="text-sm font-semibold">{acc.bank_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-sm">{acc.account_holder}</td>
                       <td className="px-4 py-3.5 text-xs font-mono text-muted-foreground">{acc.iban}</td>
                       <td className="px-4 py-3.5 text-xs text-muted-foreground">{acc.description || '-'}</td>
                        <span className="text-xs font-medium bg-muted px-2 py-0.5 rounded-md">{acc.currency}</span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <Switch checked={acc.is_active} onCheckedChange={() => toggleAccount(acc.id, acc.is_active)} />
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg" onClick={() => setDeletingId(acc.id)}>
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Yeni Banka Hesabı</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Banka Adı</label>
              <Input placeholder="Örn: Ziraat Bankası" value={newAccount.bank_name} onChange={(e) => setNewAccount({ ...newAccount, bank_name: e.target.value })} className="bg-muted/50" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Hesap Sahibi</label>
              <Input placeholder="Ad Soyad" value={newAccount.account_holder} onChange={(e) => setNewAccount({ ...newAccount, account_holder: e.target.value })} className="bg-muted/50" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">IBAN</label>
              <Input placeholder="TR00 0000 0000 0000 0000 0000 00" value={newAccount.iban} onChange={(e) => setNewAccount({ ...newAccount, iban: e.target.value })} className="bg-muted/50 font-mono" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Para Birimi</label>
              <Input placeholder="TRY" value={newAccount.currency} onChange={(e) => setNewAccount({ ...newAccount, currency: e.target.value.toUpperCase() })} className="bg-muted/50" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>İptal</Button>
            <Button onClick={handleAdd}>Ekle</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hesabı Sil</AlertDialogTitle>
            <AlertDialogDescription>
              Bu banka hesabını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletingId && deleteAccount(deletingId)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminBankAccounts;
