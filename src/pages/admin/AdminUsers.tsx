import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, X, RefreshCw, Eye, Settings, ChevronLeft, ChevronRight, User } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  balance: number;
  credit: number;
  equity: number;
  free_margin: number;
  leverage: string;
  verification_status: string;
  meta_id: number;
  created_at: string;
}

const AdminUsers = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [editForm, setEditForm] = useState({
    balance: "",
    credit: "",
    leverage: "",
    verification_status: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const itemsPerPage = 25;

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    setLoading(true);
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    setProfiles((data as Profile[]) || []);
    setLoading(false);
  };

  const filteredProfiles = profiles.filter(
    (p) =>
      (p.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
      p.user_id.toLowerCase().includes(search.toLowerCase()) ||
      String(p.meta_id).includes(search)
  );

  const totalPages = Math.ceil(filteredProfiles.length / itemsPerPage);
  const paginatedProfiles = filteredProfiles.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const openEdit = (profile: Profile) => {
    setEditingUser(profile);
    setEditForm({
      balance: profile.balance.toString(),
      credit: profile.credit.toString(),
      leverage: profile.leverage,
      verification_status: profile.verification_status,
    });
  };

  const handleSave = async () => {
    if (!editingUser) return;
    const { error } = await supabase
      .from("profiles")
      .update({
        balance: parseFloat(editForm.balance) || 0,
        credit: parseFloat(editForm.credit) || 0,
        leverage: editForm.leverage,
        verification_status: editForm.verification_status,
      })
      .eq("id", editingUser.id);

    if (error) {
      toast.error("Güncelleme başarısız: " + error.message);
    } else {
      toast.success("Kullanıcı güncellendi");
      setEditingUser(null);
      loadProfiles();
      // Refresh selected user if same
      if (selectedUser?.id === editingUser.id) {
        setSelectedUser(null);
      }
    }
  };

  const getVerificationBadge = (status: string) => {
    switch (status) {
      case "verified":
        return <span className="text-xs px-2 py-0.5 rounded-full bg-success/20 text-success">Doğrulanmış</span>;
      case "pending":
        return <span className="text-xs px-2 py-0.5 rounded-full bg-warning/20 text-warning">Doğrulanmamış</span>;
      default:
        return <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/20 text-destructive">Reddedildi</span>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Kullanıcı Yönetimi</h2>
          <p className="text-sm text-muted-foreground">Müşteri listesi ve yönetim işlemleri</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-success/10 text-success px-2.5 py-1 rounded-full font-medium">
            {profiles.length} kullanıcı
          </span>
          <Button variant="outline" size="sm" onClick={loadProfiles} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            Yenile
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Kullanıcı ara..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
          className="pl-9 bg-muted/50"
        />
      </div>

      {/* Table */}
      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">MTID</TableHead>
                <TableHead>Kullanıcı</TableHead>
                <TableHead className="hidden md:table-cell">DOĞRULAMA</TableHead>
                <TableHead className="hidden lg:table-cell">KYC</TableHead>
                <TableHead className="text-right">Bakiye</TableHead>
                <TableHead className="w-[80px]">İşlem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedProfiles.map((profile) => (
                <TableRow
                  key={profile.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedUser(profile)}
                >
                  <TableCell className="font-mono text-xs">{profile.meta_id}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-primary">
                          {(profile.full_name || "?")[0]?.toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{profile.full_name || "İsimsiz"}</p>
                        <p className="text-xs text-muted-foreground font-mono truncate">{profile.user_id.slice(0, 12)}...</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {getVerificationBadge(profile.verification_status)}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <span className="text-xs text-muted-foreground">Standart</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-mono text-sm font-semibold text-success">
                      ${Number(profile.balance).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => { e.stopPropagation(); openEdit(profile); }}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {paginatedProfiles.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Kullanıcı bulunamadı.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredProfiles.length)} / {filteredProfiles.length}
          </p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs px-2">{currentPage} / {totalPages}</span>
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Quick Preview Sheet */}
      <Sheet open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <SheetContent className="w-[380px] sm:w-[420px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Hızlı Önizleme</SheetTitle>
          </SheetHeader>
          {selectedUser && (
            <div className="mt-6 space-y-6">
              {/* User Avatar & Name */}
              <div className="flex flex-col items-center text-center">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                  <span className="text-2xl font-bold text-primary">
                    {(selectedUser.full_name || "?")[0]?.toUpperCase()}
                  </span>
                </div>
                <h3 className="text-lg font-bold">{selectedUser.full_name || "İsimsiz"}</h3>
                <p className="text-xs text-muted-foreground font-mono">{selectedUser.user_id.slice(0, 16)}...</p>
                <div className="mt-2">
                  <span className="text-xs px-2 py-1 rounded-full border border-border font-medium">Aktif</span>
                </div>
              </div>

              {/* Balance & Credit */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-border">
                  <p className="text-xs text-muted-foreground">Bakiye</p>
                  <p className="text-lg font-bold font-mono text-success">
                    ${Number(selectedUser.balance).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-border">
                  <p className="text-xs text-muted-foreground">Kredi</p>
                  <p className="text-lg font-bold font-mono">
                    ${Number(selectedUser.credit).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* User Info */}
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <User className="h-4 w-4" /> Kullanıcı Bilgileri
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between py-1.5">
                    <span className="text-sm text-muted-foreground">MTID:</span>
                    <span className="text-sm font-mono font-medium">{selectedUser.meta_id}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-sm text-muted-foreground">Telefon:</span>
                    <span className="text-sm font-mono">{selectedUser.phone || "—"}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-sm text-muted-foreground">Doğrulama:</span>
                    {getVerificationBadge(selectedUser.verification_status)}
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-sm text-muted-foreground">Kaldıraç:</span>
                    <span className="text-sm font-medium">{selectedUser.leverage}</span>
                  </div>
                </div>
              </div>

              {/* Financial Info */}
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <span className="text-success">$</span> Finansal Bilgiler
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between py-1.5">
                    <span className="text-sm text-muted-foreground">Serbest Margin:</span>
                    <span className="text-sm font-mono font-medium">
                      ${Number(selectedUser.free_margin).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Hızlı İşlemler</h4>
                <Button
                  className="w-full bg-success hover:bg-success/90 text-success-foreground"
                  onClick={() => openEdit(selectedUser)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Detaylı Görünüm
                </Button>
                <Button variant="outline" className="w-full" onClick={() => openEdit(selectedUser)}>
                  <Settings className="h-4 w-4 mr-2" />
                  Pozisyonlar & Ayarlar
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Edit Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Kullanıcı Düzenle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Bakiye ($)</label>
              <Input
                type="number"
                value={editForm.balance}
                onChange={(e) => setEditForm({ ...editForm, balance: e.target.value })}
                className="bg-muted/50 font-mono"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Kredi ($)</label>
              <Input
                type="number"
                value={editForm.credit}
                onChange={(e) => setEditForm({ ...editForm, credit: e.target.value })}
                className="bg-muted/50 font-mono"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Kaldıraç</label>
              <Select value={editForm.leverage} onValueChange={(v) => setEditForm({ ...editForm, leverage: v })}>
                <SelectTrigger className="bg-muted/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["1:10", "1:50", "1:100", "1:200", "1:500"].map((l) => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Doğrulama Durumu</label>
              <Select value={editForm.verification_status} onValueChange={(v) => setEditForm({ ...editForm, verification_status: v })}>
                <SelectTrigger className="bg-muted/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Bekliyor</SelectItem>
                  <SelectItem value="verified">Onaylı</SelectItem>
                  <SelectItem value="rejected">Reddedildi</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSave} className="w-full">Kaydet</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsers;
