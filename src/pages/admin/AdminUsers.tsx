import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Settings, DollarSign, Shield } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  balance: number;
  equity: number;
  free_margin: number;
  leverage: string;
  verification_status: string;
  created_at: string;
}

const AdminUsers = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [search, setSearch] = useState("");
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [editForm, setEditForm] = useState({
    balance: "",
    leverage: "",
    verification_status: "",
  });

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    setProfiles(data || []);
  };

  const filteredProfiles = profiles.filter((p) =>
    (p.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
    p.user_id.toLowerCase().includes(search.toLowerCase())
  );

  const openEdit = (profile: Profile) => {
    setEditingUser(profile);
    setEditForm({
      balance: profile.balance.toString(),
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
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Kullanıcı Yönetimi</h2>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Müşteri ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-muted/50"
        />
      </div>

      <div className="space-y-2">
        {filteredProfiles.map((profile) => (
          <Card key={profile.id} className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">{profile.full_name || "İsimsiz"}</p>
                  <p className="text-xs text-muted-foreground font-mono">{profile.user_id.slice(0, 8)}...</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-mono font-semibold">${Number(profile.balance).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</p>
                    <p className="text-xs text-muted-foreground">Kaldıraç: {profile.leverage}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      profile.verification_status === "verified" ? "bg-buy/20 text-buy" :
                      profile.verification_status === "pending" ? "bg-warning/20 text-warning" :
                      "bg-sell/20 text-sell"
                    }`}>
                      {profile.verification_status === "verified" ? "Onaylı" :
                       profile.verification_status === "pending" ? "Bekliyor" : "Reddedildi"}
                    </span>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(profile)}>
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {filteredProfiles.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">Kullanıcı bulunamadı.</p>
        )}
      </div>

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
