import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, FileText, Eye, Download, RefreshCw, Clock, User, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

interface DocRow {
  id: string;
  user_id: string;
  type: string;
  file_url: string | null;
  status: string;
  created_at: string;
  user_name?: string;
}

const docTypeLabel = (t: string) => {
  if (t === "identity_front") return "Kimlik - Ön Yüz";
  if (t === "identity_back") return "Kimlik - Arka Yüz";
  if (t === "address_proof") return "Adres Belgesi";
  return t;
};

const AdminDocuments = () => {
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 25;

  useEffect(() => { loadDocs(); }, []);

  const loadDocs = async () => {
    setLoading(true);
    const { data } = await supabase.from("documents").select("*").order("created_at", { ascending: false });
    
    if (data && data.length > 0) {
      // Get unique user IDs and fetch their profiles
      const userIds = [...new Set(data.map(d => d.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);
      
      setDocs(data.map(d => ({
        ...d,
        user_name: profileMap.get(d.user_id) || d.user_id.slice(0, 8) + "...",
      })));
    } else {
      setDocs([]);
    }
    setLoading(false);
  };

  const updateStatus = async (id: string, status: string) => {
    const doc = docs.find(d => d.id === id);
    const { error } = await supabase.from("documents").update({ status }).eq("id", id);
    if (error) {
      toast.error("Güncelleme başarısız");
    } else {
      toast.success(status === "approved" ? "Onaylandı" : "Reddedildi");
      
      // Check if all documents for this user are now approved → auto-verify
      if (status === "approved" && doc) {
        const { data: userDocs } = await supabase
          .from("documents")
          .select("id, status")
          .eq("user_id", doc.user_id);
        
        if (userDocs) {
          // Update the current doc's status locally for the check
          const allApproved = userDocs.every(d => 
            d.id === id ? true : d.status === "approved"
          );
          if (allApproved && userDocs.length >= 2) {
            await supabase
              .from("profiles")
              .update({ verification_status: "verified" })
              .eq("user_id", doc.user_id);
            toast.success("Kullanıcı doğrulama durumu 'Doğrulanmış' olarak güncellendi");
          }
        }
      }
      
      loadDocs();
    }
  };

  const viewDocument = async (fileUrl: string | null) => {
    if (!fileUrl) {
      toast.error("Dosya bulunamadı");
      return;
    }
    const { data } = await supabase.storage.from("documents").createSignedUrl(fileUrl, 300);
    if (data?.signedUrl) {
      setPreviewUrl(data.signedUrl);
      setPreviewOpen(true);
    } else {
      toast.error("Dosya yüklenemedi");
    }
  };

  const downloadDocument = async (fileUrl: string | null, type: string) => {
    if (!fileUrl) return;
    const { data } = await supabase.storage.from("documents").createSignedUrl(fileUrl, 300);
    if (data?.signedUrl) {
      const a = document.createElement("a");
      a.href = data.signedUrl;
      a.download = `${type}_${Date.now()}`;
      a.click();
    }
  };

  const pendingCount = docs.filter(d => d.status === "pending").length;
  const approvedCount = docs.filter(d => d.status === "approved").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Evrak Yönetimi</h2>
          <p className="text-sm text-muted-foreground">Kullanıcı kimlik doğrulama belgelerini inceleyin</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadDocs} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
          Yenile
        </Button>
      </div>

      {/* Stats */}
      <Card className="border-border">
        <CardContent className="divide-y divide-border p-0">
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-semibold">Toplam Evrak</p>
              <p className="text-xs text-muted-foreground">Yüklenen belge sayısı</p>
            </div>
            <span className="text-sm font-bold">{docs.length}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-semibold">Bekleyen</p>
              <p className="text-xs text-muted-foreground">Onay bekleyen belgeler</p>
            </div>
            <span className={`flex items-center gap-1.5 text-sm font-bold ${pendingCount > 0 ? "text-warning" : "text-buy"}`}>
              <Clock className="h-4 w-4" />
              {pendingCount}
            </span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-semibold">Onaylanan</p>
              <p className="text-xs text-muted-foreground">Doğrulanmış belgeler</p>
            </div>
            <span className="flex items-center gap-1.5 text-sm font-bold text-buy">
              <CheckCircle className="h-4 w-4" />
              {approvedCount}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Documents Table */}
      <Card className="border-border">
        <CardContent className="p-0">
          {docs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <FileText className="h-10 w-10 mb-3 opacity-40" />
              <p className="text-sm">Evrak bulunamadı.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Kullanıcı</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Belge Türü</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Tarih</th>
                    <th className="text-center text-xs font-semibold text-muted-foreground px-4 py-3">Durum</th>
                    <th className="text-center text-xs font-semibold text-muted-foreground px-4 py-3">Görüntüle</th>
                    <th className="text-center text-xs font-semibold text-muted-foreground px-4 py-3">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {docs.map((doc) => (
                    <tr key={doc.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-primary/10">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold">{doc.user_name}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">{doc.user_id.slice(0, 8)}...</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{docTypeLabel(doc.type)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(doc.created_at).toLocaleDateString("tr-TR")} {new Date(doc.created_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          doc.status === "approved" ? "bg-buy/20 text-buy" :
                          doc.status === "pending" ? "bg-warning/20 text-warning" :
                          "bg-sell/20 text-sell"
                        }`}>
                          {doc.status === "approved" ? "Onaylı" : doc.status === "pending" ? "Bekliyor" : "Reddedildi"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-primary hover:bg-primary/10"
                            onClick={() => viewDocument(doc.file_url)}
                            disabled={!doc.file_url}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:bg-muted"
                            onClick={() => downloadDocument(doc.file_url, doc.type)}
                            disabled={!doc.file_url}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {doc.status === "pending" ? (
                          <div className="flex justify-center gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-buy hover:bg-buy/10" onClick={() => updateStatus(doc.id, "approved")}>
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-sell hover:bg-sell/10" onClick={() => updateStatus(doc.id, "rejected")}>
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

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Belge Önizleme</DialogTitle>
          </DialogHeader>
          {previewUrl && (
            <div className="flex items-center justify-center overflow-auto max-h-[65vh]">
              {previewUrl.includes(".pdf") ? (
                <iframe src={previewUrl} className="w-full h-[60vh] rounded-lg border" />
              ) : (
                <img src={previewUrl} alt="Belge" className="max-w-full max-h-[60vh] rounded-lg object-contain" />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDocuments;
