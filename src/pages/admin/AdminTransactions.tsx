import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Clock, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { toast } from "sonner";

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
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    const { data } = await supabase.from("transactions").select("*").order("created_at", { ascending: false });
    setTransactions(data || []);
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("transactions").update({ status }).eq("id", id);
    if (error) {
      toast.error("Güncelleme başarısız");
    } else {
      toast.success(status === "approved" ? "Onaylandı" : "Reddedildi");
      loadTransactions();
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Banka Yönetimi</h2>
      <p className="text-sm text-muted-foreground">Banka hesapları ve para transferi işlemleri</p>

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
                    <p className="text-sm font-mono font-bold">{Number(tx.amount).toLocaleString("tr-TR")} {tx.currency}</p>
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
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-buy hover:bg-buy/10" onClick={() => updateStatus(tx.id, "approved")}>
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-sell hover:bg-sell/10" onClick={() => updateStatus(tx.id, "rejected")}>
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {transactions.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">İşlem talebi bulunmuyor.</p>
        )}
      </div>
    </div>
  );
};

export default AdminTransactions;
