import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { mockTransactions } from "@/data/mockData";
import { ArrowDownToLine, Building2, CreditCard, CheckCircle, Clock, XCircle } from "lucide-react";

const paymentMethods = [
  { id: "bank", label: "Banka Transferi", icon: Building2, description: "1-3 iş günü" },
  { id: "card", label: "Kredi Kartı", icon: CreditCard, description: "Anında" },
];

const Deposit = () => {
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [amount, setAmount] = useState("");

  const statusIcon = (status: string) => {
    if (status === "approved") return <CheckCircle className="h-4 w-4 text-buy" />;
    if (status === "pending") return <Clock className="h-4 w-4 text-warning" />;
    return <XCircle className="h-4 w-4 text-sell" />;
  };

  const statusLabel = (status: string) => {
    if (status === "approved") return "Onaylandı";
    if (status === "pending") return "Bekliyor";
    return "Reddedildi";
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6 animate-slide-up">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ArrowDownToLine className="h-6 w-6 text-buy" />
          Para Yatır
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Hesabınıza para yatırmak için ödeme yöntemini seçin.</p>
      </div>

      {/* Payment Methods */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {paymentMethods.map((method) => (
          <Card
            key={method.id}
            onClick={() => setSelectedMethod(method.id)}
            className={`cursor-pointer transition-all ${
              selectedMethod === method.id
                ? "border-primary ring-2 ring-primary/20"
                : "border-border hover:border-primary/30"
            }`}
          >
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-muted">
                <method.icon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold">{method.label}</p>
                <p className="text-xs text-muted-foreground">{method.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedMethod && (
        <Card className="bg-card border-border">
          <CardContent className="p-6 space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Tutar (TRY)</label>
              <Input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-muted/50 font-mono text-lg h-12"
              />
            </div>
            <div className="flex gap-2">
              {[1000, 5000, 10000, 25000, 50000].map((v) => (
                <button
                  key={v}
                  onClick={() => setAmount(v.toString())}
                  className="px-3 py-1.5 rounded text-xs font-mono font-medium bg-muted text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  {v.toLocaleString("tr-TR")}
                </button>
              ))}
            </div>
            <Button className="w-full h-11 font-semibold" disabled={!amount}>
              Para Yatır
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Recent Transactions */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base">Son Talepler</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mockTransactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  {statusIcon(tx.status)}
                  <div>
                    <p className="text-sm font-medium">{tx.type === "deposit" ? "Para Yatırma" : "Para Çekme"}</p>
                    <p className="text-xs text-muted-foreground">{tx.method} • {new Date(tx.createdAt).toLocaleDateString("tr-TR")}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-mono font-semibold">{tx.amount.toLocaleString("tr-TR")} {tx.currency}</p>
                  <p className="text-xs text-muted-foreground">{statusLabel(tx.status)}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Deposit;
