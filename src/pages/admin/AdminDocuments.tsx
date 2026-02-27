import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, FileText } from "lucide-react";
import { toast } from "sonner";

interface DocRow {
  id: string;
  user_id: string;
  type: string;
  file_url: string | null;
  status: string;
  created_at: string;
}

const docTypeLabel = (t: string) => {
  if (t === "identity_front") return "Kimlik Ön Yüz";
  if (t === "identity_back") return "Kimlik Arka Yüz";
  return "İkametgah";
};

const AdminDocuments = () => {
  const [docs, setDocs] = useState<DocRow[]>([]);

  useEffect(() => {
    loadDocs();
  }, []);

  const loadDocs = async () => {
    const { data } = await supabase.from("documents").select("*").order("created_at", { ascending: false });
    setDocs(data || []);
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("documents").update({ status }).eq("id", id);
    if (error) {
      toast.error("Güncelleme başarısız");
    } else {
      toast.success(status === "approved" ? "Onaylandı" : "Reddedildi");
      loadDocs();
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Evrak Yönetimi</h2>
      <p className="text-sm text-muted-foreground">Kullanıcı kimlik doğrulama belgelerini inceleyin</p>

      <div className="space-y-2">
        {docs.map((doc) => (
          <Card key={doc.id} className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{docTypeLabel(doc.type)}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(doc.created_at).toLocaleDateString("tr-TR")}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-mono">{doc.user_id.slice(0, 8)}...</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    doc.status === "approved" ? "bg-buy/20 text-buy" :
                    doc.status === "pending" ? "bg-warning/20 text-warning" :
                    "bg-sell/20 text-sell"
                  }`}>
                    {doc.status === "approved" ? "Onaylı" : doc.status === "pending" ? "Bekliyor" : "Reddedildi"}
                  </span>
                  {doc.status === "pending" && (
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-buy hover:bg-buy/10" onClick={() => updateStatus(doc.id, "approved")}>
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-sell hover:bg-sell/10" onClick={() => updateStatus(doc.id, "rejected")}>
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {docs.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">Evrak bulunamadı.</p>
        )}
      </div>
    </div>
  );
};

export default AdminDocuments;
