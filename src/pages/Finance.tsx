import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Upload, CheckCircle, Clock, XCircle, Copy,
  ArrowDownToLine, ArrowUpFromLine, Building2, ShieldAlert, ClipboardPaste, Check,
} from "lucide-react";

const paymentMethods = [
  { id: "bank", label: "Banka Transferi", icon: Building2 },
];

const Finance = () => {
  const { user: authUser } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [activeMoneyTab, setActiveMoneyTab] = useState<"deposit" | "withdraw">("deposit");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [withdrawAccountName, setWithdrawAccountName] = useState("");
  const [withdrawIban, setWithdrawIban] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isVerified, setIsVerified] = useState<boolean | null>(null);

  useEffect(() => {
    if (authUser) {
      loadTransactions();
      loadBankAccounts();
      loadVerificationStatus();
    }
  }, [authUser]);

  const loadVerificationStatus = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("verification_status")
      .eq("user_id", authUser!.id)
      .single();
    setIsVerified(data?.verification_status === "verified");
  };

  const loadBankAccounts = async () => {
    const { data } = await supabase.from("bank_accounts").select("*").eq("is_active", true);
    setBankAccounts(data || []);
  };

  const loadTransactions = async () => {
    const { data } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", authUser!.id)
      .order("created_at", { ascending: false })
      .limit(20);
    setTransactions(data || []);
  };

  const handleDeposit = async () => {
    if (!authUser || !depositAmount || !receiptFile) return;
    setSubmitting(true);
    try {
      const fileExt = receiptFile.name.split(".").pop();
      const filePath = `${authUser.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from("receipts").upload(filePath, receiptFile);
      if (uploadError) throw uploadError;

      const { error } = await supabase.from("transactions").insert({
        user_id: authUser.id,
        type: "deposit",
        amount: parseFloat(depositAmount),
        method: "bank_transfer",
        currency: "TRY",
        receipt_url: filePath,
      } as any);
      if (error) throw error;

      toast.success("Para yatırma talebi oluşturuldu");
      setDepositAmount("");
      setReceiptFile(null);
      setSelectedMethod(null);
      loadTransactions();
    } catch (err: any) {
      toast.error("İşlem başarısız: " + err.message);
    }
    setSubmitting(false);
  };

  const handleWithdraw = async () => {
    if (!authUser || !withdrawAmount || !withdrawAccountName || !withdrawIban) return;

    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Geçerli bir tutar girin");
      return;
    }

    // IBAN validation (TR + 24 digits = 26 chars total)
    const cleanIban = withdrawIban.replace(/\s/g, "").toUpperCase();
    if (!/^TR\d{24}$/.test(cleanIban)) {
      toast.error("Geçersiz IBAN formatı. TR ile başlamalı ve 26 karakter olmalıdır.");
      return;
    }

    setSubmitting(true);
    try {
      // Check for existing pending withdrawals
      const { data: pendingWithdrawals } = await supabase
        .from("transactions")
        .select("amount")
        .eq("user_id", authUser.id)
        .eq("type", "withdrawal")
        .eq("status", "pending");

      const totalPendingAmount = (pendingWithdrawals || []).reduce((s: number, t: any) => s + Number(t.amount), 0);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("balance, free_margin")
        .eq("user_id", authUser.id)
        .single();

      if (!profileData) {
        toast.error("Hesap bilgisi alınamadı");
        setSubmitting(false);
        return;
      }

      const { data: rateData } = await supabase
        .from("symbols")
        .select("current_price")
        .eq("name", "USDTRY")
        .single();
      const usdTryRate = rateData?.current_price && Number(rateData.current_price) > 0 ? Number(rateData.current_price) : 32.0;
      const amountInUsd = amount / usdTryRate;
      const totalPendingUsd = totalPendingAmount / usdTryRate;

      // Check against free margin minus already pending withdrawals
      const availableFreeMargin = Number(profileData.free_margin) - totalPendingUsd;
      if (amountInUsd > availableFreeMargin) {
        toast.error(`Yetersiz serbest teminat. Bekleyen çekim talepleri dahil çekilebilir: $${Math.max(0, availableFreeMargin).toLocaleString("en-US", { minimumFractionDigits: 2 })}`);
        setSubmitting(false);
        return;
      }

      const availableBalance = Number(profileData.balance) - totalPendingUsd;
      if (amountInUsd > availableBalance) {
        toast.error(`Yetersiz bakiye. Bekleyen talepler dahil çekilebilir: $${Math.max(0, availableBalance).toLocaleString("en-US", { minimumFractionDigits: 2 })}`);
        setSubmitting(false);
        return;
      }

      const { error } = await supabase.from("transactions").insert({
        user_id: authUser.id,
        type: "withdrawal",
        amount: amount,
        method: "bank_transfer",
        currency: "TRY",
        account_holder: withdrawAccountName.trim(),
        iban: withdrawIban.trim(),
      } as any);
      if (error) throw error;

      toast.success("Para çekme talebi oluşturuldu");
      setWithdrawAmount("");
      setWithdrawAccountName("");
      setWithdrawIban("");
      setSelectedMethod(null);
      loadTransactions();
    } catch (err: any) {
      toast.error("İşlem başarısız: " + err.message);
    }
    setSubmitting(false);
  };

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

  const isDepositDisabled = !depositAmount || !receiptFile || submitting;
  const isWithdrawDisabled = !withdrawAmount || !withdrawAccountName || !withdrawIban || submitting;

  if (!authUser) return null;

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4 pb-24 animate-slide-up">
      <h1 className="text-xl md:text-2xl font-bold">Finans</h1>

      <div className="grid grid-cols-2 gap-2">
        <Button
          variant={activeMoneyTab === "deposit" ? "default" : "outline"}
          onClick={() => { setActiveMoneyTab("deposit"); setSelectedMethod(null); }}
          className="gap-2"
        >
          <ArrowDownToLine className="h-4 w-4" /> Yatır
        </Button>
        <Button
          variant={activeMoneyTab === "withdraw" ? "default" : "outline"}
          onClick={() => { setActiveMoneyTab("withdraw"); setSelectedMethod(null); }}
          className="gap-2"
        >
          <ArrowUpFromLine className="h-4 w-4" /> Çek
        </Button>
      </div>

      {/* Verification Warning */}
      {isVerified === false && (
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="p-4 flex items-center gap-3">
            <ShieldAlert className="h-5 w-5 text-warning shrink-0" />
            <div>
              <p className="font-semibold text-sm">Hesabınız henüz doğrulanmamış</p>
              <p className="text-xs text-muted-foreground">Para yatırma ve çekme işlemleri için hesabınızın doğrulanması gerekmektedir. Hesabım sayfasından belgelerinizi yükleyebilirsiniz.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Method Selection */}
      {isVerified && (
        <div className="space-y-2">
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
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <method.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{method.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="space-y-4">
      {selectedMethod && activeMoneyTab === "deposit" && (
        <>
          {bankAccounts.length > 0 && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Yatırım Yapılacak Hesaplar</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {bankAccounts.map((acc: any) => (
                  <div key={acc.id} className="p-3 rounded-lg bg-muted/50 space-y-1.5">
                    <p className="font-semibold text-sm">{acc.bank_name}</p>
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-mono text-foreground">{acc.iban}</p>
                      <button onClick={() => { navigator.clipboard.writeText(acc.iban); toast.success("IBAN kopyalandı"); }} className="p-1 rounded hover:bg-muted transition-colors">
                        <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">{acc.account_holder}</p>
                      <button onClick={() => { navigator.clipboard.writeText(acc.account_holder); toast.success("Hesap adı kopyalandı"); }} className="p-1 rounded hover:bg-muted transition-colors">
                        <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card className="bg-card border-border">
            <CardContent className="p-4 space-y-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Tutar (TRY)</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="bg-muted/50 font-mono text-lg h-12"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[1000, 5000, 10000, 25000].map((v) => (
                  <button
                    key={v}
                    onClick={() => setDepositAmount(v.toString())}
                    className="px-3 py-1.5 rounded text-xs font-mono font-medium bg-muted text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    {v.toLocaleString("tr-TR")}
                  </button>
                ))}
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Dekont Yükle</label>
                <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 transition-colors bg-muted/30">
                  <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                  <span className="text-xs text-muted-foreground">{receiptFile ? receiptFile.name : "Dekont seçin"}</span>
                  <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => setReceiptFile(e.target.files?.[0] || null)} />
                </label>
              </div>

              <Button className="w-full h-11 font-semibold" disabled={isDepositDisabled} onClick={handleDeposit}>
                {submitting ? "Gönderiliyor..." : "Para Yatır"}
              </Button>
            </CardContent>
          </Card>
        </>
      )}

      {selectedMethod && activeMoneyTab === "withdraw" && (
        <Card className="bg-card border-border">
          <CardContent className="p-4 space-y-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Hesap Adı</label>
              <Input
                placeholder="Ad Soyad"
                value={withdrawAccountName}
                onChange={(e) => setWithdrawAccountName(e.target.value)}
                className="bg-muted/50"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">IBAN</label>
              <Input
                placeholder="TR00 0000 0000 0000 0000 0000 00"
                value={withdrawIban}
                onChange={(e) => setWithdrawIban(e.target.value)}
                className="bg-muted/50 font-mono"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Tutar (TRY)</label>
              <Input
                type="number"
                placeholder="0.00"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                className="bg-muted/50 font-mono text-lg h-12"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[1000, 5000, 10000, 25000].map((v) => (
                <button
                  key={v}
                  onClick={() => setWithdrawAmount(v.toString())}
                  className="px-3 py-1.5 rounded text-xs font-mono font-medium bg-muted text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  {v.toLocaleString("tr-TR")}
                </button>
              ))}
            </div>

            <Button className="w-full h-11 font-semibold" disabled={isWithdrawDisabled} onClick={handleWithdraw}>
              {submitting ? "Gönderiliyor..." : "Para Çek"}
            </Button>
          </CardContent>
        </Card>
      )}
      </div>

      {/* Recent Transactions */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Son Talepler</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {transactions.length > 0 ? transactions.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                {statusIcon(tx.status)}
                <div>
                  <p className="text-sm font-medium">{tx.type === "deposit" ? "Yatırma" : "Çekme"}</p>
                  <p className="text-xs text-muted-foreground">{new Date(tx.created_at).toLocaleDateString("tr-TR")}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-mono font-semibold">{Number(tx.amount).toLocaleString("tr-TR")} {tx.currency}</p>
                <p className="text-xs text-muted-foreground">{statusLabel(tx.status)}</p>
              </div>
            </div>
          )) : (
            <p className="text-sm text-muted-foreground text-center py-4">Henüz işlem yok.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Finance;
