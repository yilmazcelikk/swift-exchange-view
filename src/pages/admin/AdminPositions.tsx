import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface OrderRow {
  id: string;
  user_id: string;
  symbol_name: string;
  type: string;
  lots: number;
  entry_price: number;
  current_price: number;
  pnl: number;
  status: string;
  leverage: string;
  created_at: string;
}

const AdminPositions = () => {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [closingOrder, setClosingOrder] = useState<OrderRow | null>(null);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    const { data } = await supabase
      .from("orders")
      .select("*")
      .eq("status", "open")
      .order("created_at", { ascending: false });
    setOrders(data || []);
  };

  const closePosition = async (order: OrderRow) => {
    const { error } = await supabase
      .from("orders")
      .update({ status: "closed", closed_at: new Date().toISOString() })
      .eq("id", order.id);

    if (error) {
      toast.error("Pozisyon kapatılamadı");
    } else {
      toast.success(`${order.symbol_name} pozisyon kapatıldı`);
      setClosingOrder(null);
      loadOrders();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Açık Pozisyonlar</h2>
          <p className="text-sm text-muted-foreground">{orders.length} açık pozisyon</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadOrders}>Yenile</Button>
      </div>

      <div className="space-y-2">
        {orders.map((order) => (
          <Card key={order.id} className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{order.symbol_name}</span>
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${order.type === "buy" ? "bg-buy/20 text-buy" : "bg-sell/20 text-sell"}`}>
                      {order.type.toUpperCase()}
                    </span>
                    <span className="text-xs text-muted-foreground">Lot: {Number(order.lots)}</span>
                    <span className="text-xs text-muted-foreground">Kaldıraç: {order.leverage}</span>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">
                    {Number(order.entry_price).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} → {Number(order.current_price).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-mono">{order.user_id.slice(0, 8)}...</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-mono font-bold ${Number(order.pnl) >= 0 ? "text-buy" : "text-sell"}`}>
                    {Number(order.pnl) >= 0 ? "+" : ""}{Number(order.pnl).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                  </span>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-sell hover:bg-sell/10" onClick={() => setClosingOrder(order)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {orders.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">Açık pozisyon bulunmuyor.</p>
        )}
      </div>

      <AlertDialog open={!!closingOrder} onOpenChange={(open) => !open && setClosingOrder(null)}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Pozisyonu Kapat</AlertDialogTitle>
            <AlertDialogDescription>
              {closingOrder && `${closingOrder.symbol_name} ${closingOrder.type.toUpperCase()} ${Number(closingOrder.lots)} lot pozisyonu kapatmak istediğinize emin misiniz?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={() => closingOrder && closePosition(closingOrder)} className="bg-sell hover:bg-sell/90 text-sell-foreground">
              Kapat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminPositions;
