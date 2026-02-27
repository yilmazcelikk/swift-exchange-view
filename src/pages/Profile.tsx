import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  UserCircle, Upload, CheckCircle, Clock, ShieldCheck,
  ArrowDownToLine, ArrowUpFromLine, Building2, XCircle, Pencil, Copy,
} from "lucide-react";

// ─── Payment Methods (only bank transfer now) ───
const paymentMethods = [
  { id: "bank", label: "Banka Transferi", icon: Building2 },
];

// ─── Verification Steps ───
const verificationSteps = [
  { id: 1, label: "Ön Yüz", description: "Kimlik belgenizin ön yüzünü yükleyin" },
  { id: 2, label: "İkametgah", description: "İkametgah belgenizi yükleyin" },
  { id: 3, label: "Tamamlandı", description: "Doğrulama talebiniz alındı" },
];

const Profile = () => {
  const { user: authUser } = useAuth();
  const [profile, setProfile] = useState({
    fullName: "",
    email: "",
    phone: "",
    birthDate: "",
    country: "",
  });
  const [isEditing, setIsEditing] = useState(false);
  const [passwords, setPasswords] = useState({ current: "", new: "", confirm: "" });
  const [transactions, setTransactions] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [profileLoading, setProfileLoading] = useState(true);

  // Deposit state
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [activeMoneyTab, setActiveMoneyTab] = useState<"deposit" | "withdraw">("deposit");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  // Withdraw state
  const [withdrawAccountName, setWithdrawAccountName] = useState("");
  const [withdrawIban, setWithdrawIban] = useState("");

  // Verification state
  const [currentStep, setCurrentStep] = useState(1);
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [addressFile, setAddressFile] = useState<File | null>(null);

  useEffect(() => {
    if (authUser) {
      loadProfile();
      loadTransactions();
      loadBankAccounts();
    }
  }, [authUser]);

  const loadBankAccounts = async () => {
    const { data } = await supabase
      .from("bank_accounts")
      .select("*")
      .eq("is_active", true);
    setBankAccounts(data || []);
  };

  const loadProfile = async () => {
    setProfileLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", authUser!.id)
      .single();

    if (data) {
      setProfile({
        fullName: data.full_name || "",
        email: authUser?.email || "",
        phone: data.phone || "",
        birthDate: data.birth_date || "",
        country: data.country || "",
      });
    }
    setProfileLoading(false);
  };

  const loadTransactions = async () => {
    const { data } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", authUser!.id)
      .order("created_at", { ascending: false })
      .limit(10);
    setTransactions(data || []);
  };

  const handleUpdateProfile = async () => {
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: profile.fullName,
        phone: profile.phone,
        birth_date: profile.birthDate,
        country: profile.country,
      })
      .eq("user_id", authUser!.id);

    if (error) {
      toast.error("Güncelleme başarısız: " + error.message);
    } else {
      toast.success("Bilgileriniz güncellendi");
      setIsEditing(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwords.new !== passwords.confirm) {
      toast.error("Yeni şifreler eşleşmiyor");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: passwords.new });
    if (error) {
      toast.error("Şifre değiştirilemedi: " + error.message);
    } else {
      toast.success("Şifreniz güncellendi");
      setPasswords({ current: "", new: "", confirm: "" });
    }
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

  const [submitting, setSubmitting] = useState(false);

  const handleDeposit = async () => {
    if (!authUser || !depositAmount || !receiptFile) return;
    setSubmitting(true);
    try {
      // Upload receipt
      const fileExt = receiptFile.name.split(".").pop();
      const filePath = `${authUser.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from("receipts").upload(filePath, receiptFile);
      if (uploadError) throw uploadError;

      // Create transaction
      const { error } = await supabase.from("transactions").insert({
        user_id: authUser.id,
        type: "deposit",
        amount: parseFloat(depositAmount),
        method: "bank_transfer",
        currency: "TRY",
      });
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
    setSubmitting(true);
    try {
      const { error } = await supabase.from("transactions").insert({
        user_id: authUser.id,
        type: "withdrawal",
        amount: parseFloat(withdrawAmount),
        method: "bank_transfer",
        currency: "TRY",
      });
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

  const handleVerificationUpload = async () => {
    if (!authUser || !frontFile) return;
    setSubmitting(true);
    try {
      // Upload front ID
      const frontExt = frontFile.name.split(".").pop();
      const frontPath = `${authUser.id}/id_front_${Date.now()}.${frontExt}`;
      const { error: frontUploadErr } = await supabase.storage.from("documents").upload(frontPath, frontFile);
      if (frontUploadErr) throw frontUploadErr;

      const { data: frontUrlData } = supabase.storage.from("documents").getPublicUrl(frontPath);

      await supabase.from("documents").insert({
        user_id: authUser.id,
        type: "identity_front",
        file_url: frontPath,
      });

      setCurrentStep(2);
    } catch (err: any) {
      toast.error("Yükleme başarısız: " + err.message);
    }
    setSubmitting(false);
  };

  const handleAddressUpload = async () => {
    if (!authUser || !addressFile) return;
    setSubmitting(true);
    try {
      const addrExt = addressFile.name.split(".").pop();
      const addrPath = `${authUser.id}/address_${Date.now()}.${addrExt}`;
      const { error: addrUploadErr } = await supabase.storage.from("documents").upload(addrPath, addressFile);
      if (addrUploadErr) throw addrUploadErr;

      await supabase.from("documents").insert({
        user_id: authUser.id,
        type: "address_proof",
        file_url: addrPath,
      });

      toast.success("Belgeleriniz gönderildi");
      setCurrentStep(3);
    } catch (err: any) {
      toast.error("Yükleme başarısız: " + err.message);
    }
    setSubmitting(false);
  };

  const isDepositDisabled = !depositAmount || !receiptFile || submitting;
  const isWithdrawDisabled = !withdrawAmount || !withdrawAccountName || !withdrawIban || submitting;

  if (!authUser || profileLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4 animate-slide-up pb-24 md:pb-6">
      <h1 className="text-xl md:text-2xl font-bold">Hesabım</h1>

      <Tabs defaultValue="info" className="w-full">
        <TabsList className="w-full grid grid-cols-3 h-auto">
          <TabsTrigger value="info" className="text-xs px-1 py-2">Bilgilerim</TabsTrigger>
          <TabsTrigger value="money" className="text-xs px-1 py-2">Para İşlemleri</TabsTrigger>
          <TabsTrigger value="verify" className="text-xs px-1 py-2">Doğrulama</TabsTrigger>
        </TabsList>

        {/* ─── Kişisel Bilgiler ─── */}
        <TabsContent value="info" className="space-y-4 mt-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <UserCircle className="h-5 w-5 text-primary" />
                Profil Bilgileri
              </CardTitle>
              {!isEditing && (
                <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)}>
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Ad Soyad</label>
                <Input value={profile.fullName} disabled={!isEditing} onChange={(e) => setProfile({ ...profile, fullName: e.target.value })} className="bg-muted/50" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">E-posta</label>
                <Input value={profile.email} disabled className="bg-muted/50 opacity-60" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Telefon</label>
                <Input value={profile.phone} disabled={!isEditing} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} className="bg-muted/50" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Doğum Tarihi</label>
                <Input type="date" value={profile.birthDate} disabled={!isEditing} onChange={(e) => setProfile({ ...profile, birthDate: e.target.value })} className="bg-muted/50" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Ülke</label>
                <Input value={profile.country} disabled={!isEditing} onChange={(e) => setProfile({ ...profile, country: e.target.value })} className="bg-muted/50" />
              </div>
              {isEditing && (
                <div className="flex gap-2">
                  <Button className="flex-1" onClick={handleUpdateProfile}>Kaydet</Button>
                  <Button variant="outline" className="flex-1" onClick={() => setIsEditing(false)}>İptal</Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Şifre Değiştir</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input type="password" placeholder="Yeni Şifre" value={passwords.new} onChange={(e) => setPasswords({ ...passwords, new: e.target.value })} className="bg-muted/50" />
              <Input type="password" placeholder="Yeni Şifre Tekrar" value={passwords.confirm} onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })} className="bg-muted/50" />
              <Button variant="outline" className="w-full" onClick={handleChangePassword}>Şifre Değiştir</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Para İşlemleri ─── */}
        <TabsContent value="money" className="space-y-4 mt-4">
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

          {/* Payment Method Selection */}
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

          {selectedMethod && activeMoneyTab === "deposit" && (
            <>
              {/* Bank accounts for deposit */}
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

                {/* Receipt upload */}
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
        </TabsContent>

        {/* ─── Kimlik Doğrulama ─── */}
        <TabsContent value="verify" className="space-y-4 mt-4">
          <div className="flex items-center gap-2">
            {verificationSteps.map((step, i) => (
              <div key={step.id} className="flex items-center gap-2 flex-1">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold shrink-0 ${
                  currentStep > step.id ? "bg-buy text-buy-foreground" :
                  currentStep === step.id ? "bg-primary text-primary-foreground" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {currentStep > step.id ? <CheckCircle className="h-4 w-4" /> : step.id}
                </div>
                <span className="text-xs font-medium hidden sm:block">{step.label}</span>
                {i < verificationSteps.length - 1 && <div className="flex-1 h-px bg-border" />}
              </div>
            ))}
          </div>

          <Card className="bg-card border-border">
            <CardContent className="p-4">
              {currentStep === 1 && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm">Kimlik Ön Yüz</h3>
                  <p className="text-xs text-muted-foreground">TC Kimlik Kartınızın veya Pasaportunuzun ön yüzünü yükleyin.</p>
                  <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 transition-colors bg-muted/30">
                    <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                    <span className="text-xs text-muted-foreground">{frontFile ? frontFile.name : "Dosya seçin"}</span>
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => setFrontFile(e.target.files?.[0] || null)} />
                  </label>
                  <Button onClick={() => setCurrentStep(2)} disabled={!frontFile} className="w-full">Devam Et</Button>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm">İkametgah Belgesi</h3>
                  <p className="text-xs text-muted-foreground">İkametgah belgenizin fotoğrafını veya PDF'ini yükleyin.</p>
                  <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 transition-colors bg-muted/30">
                    <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                    <span className="text-xs text-muted-foreground">{addressFile ? addressFile.name : "Dosya seçin"}</span>
                    <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => setAddressFile(e.target.files?.[0] || null)} />
                  </label>
                  <Button onClick={() => setCurrentStep(3)} disabled={!addressFile} className="w-full">Gönder</Button>
                </div>
              )}

              {currentStep === 3 && (
                <div className="text-center py-6 space-y-3">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-buy/10">
                    <CheckCircle className="h-7 w-7 text-buy" />
                  </div>
                  <h3 className="font-bold">Belgeleriniz Alındı!</h3>
                  <p className="text-xs text-muted-foreground">İnceleme 24-48 saat içinde tamamlanacaktır.</p>
                  <div className="flex items-center justify-center gap-2 text-warning">
                    <Clock className="h-4 w-4" />
                    <span className="text-xs font-medium">İnceleme Bekleniyor</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
};

export default Profile;
