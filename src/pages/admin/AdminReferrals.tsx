import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Plus, Copy, Trash2, RefreshCw, Link2 } from "lucide-react";

interface ReferralCode {
  id: string;
  code: string;
  description: string | null;
  is_active: boolean;
  usage_count: number;
  created_at: string;
}

const SITE_URL = "https://fiba.subeportalgiris.com";

const AdminReferrals = () => {
  const [codes, setCodes] = useState<ReferralCode[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [newCode, setNewCode] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => { loadCodes(); }, []);

  const loadCodes = async () => {
    setLoading(true);
    const { data } = await supabase.from("referral_codes").select("*").order("created_at", { ascending: false });
    setCodes((data as ReferralCode[]) || []);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!newCode.trim()) { toast.error("Kod boş olamaz"); return; }
    setCreating(true);
    const { error } = await supabase.from("referral_codes").insert({ code: newCode.trim().toUpperCase(), description: newDesc || null });
    setCreating(false);
    if (error) {
      toast.error(error.message.includes("duplicate") ? "Bu kod zaten mevcut" : error.message);
    } else {
      toast.success("Referans kodu oluşturuldu");
      setShowCreate(false);
      setNewCode("");
      setNewDesc("");
      loadCodes();
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    const { error } = await supabase.from("referral_codes").update({ is_active: !current }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success(current ? "Kod devre dışı bırakıldı" : "Kod aktifleştirildi"); loadCodes(); }
  };

  const deleteCode = async (id: string) => {
    const { error } = await supabase.from("referral_codes").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Kod silindi"); setDeletingId(null); loadCodes(); }
  };

  const copyLink = (code: string) => {
    const link = `${SITE_URL}/register?go=1&ref=${code}`;
    navigator.clipboard.writeText(link);
    toast.success("Link kopyalandı");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg md:text-2xl font-bold">Referans Linkleri</h2>
          <p className="text-xs md:text-sm text-muted-foreground">Referans kodları oluşturun ve yönetin</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadCodes} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Yenile
          </Button>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-1" /> Yeni Kod
          </Button>
        </div>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kod</TableHead>
                <TableHead>Açıklama</TableHead>
                <TableHead className="text-center">Kullanım</TableHead>
                <TableHead className="text-center">Durum</TableHead>
                <TableHead>Tarih</TableHead>
                <TableHead className="w-[120px]">İşlem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {codes.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono font-bold">{c.code}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.description || "—"}</TableCell>
                  <TableCell className="text-center font-mono">{c.usage_count}</TableCell>
                  <TableCell className="text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${c.is_active ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"}`}>
                      {c.is_active ? "Aktif" : "Pasif"}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(c.created_at).toLocaleDateString("tr-TR")}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyLink(c.code)} title="Linki Kopyala">
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleActive(c.id, c.is_active)} title={c.is_active ? "Devre Dışı Bırak" : "Aktifleştir"}>
                        <Link2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeletingId(c.id)} title="Sil">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {codes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Henüz referans kodu oluşturulmamış.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-sm" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Yeni Referans Kodu</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Kod</label>
              <Input placeholder="Örn: REF2025" value={newCode} onChange={(e) => setNewCode(e.target.value.toUpperCase())} className="bg-muted/50 font-mono" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Açıklama (opsiyonel)</label>
              <Input placeholder="Kampanya adı veya not" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} className="bg-muted/50" />
            </div>
            <p className="text-xs text-muted-foreground">
              Link: {SITE_URL}/register?go=1&ref={newCode || "KOD"}
            </p>
            <Button onClick={handleCreate} className="w-full" disabled={creating}>
              {creating ? "Oluşturuluyor..." : "Oluştur"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Referans Kodunu Sil</AlertDialogTitle>
            <AlertDialogDescription>
              Bu referans kodunu silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletingId && deleteCode(deletingId)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminReferrals;
