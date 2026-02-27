import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mockUser, mockTransactions } from "@/data/mockData";
import {
  UserCircle, Plus, Upload, CheckCircle, Clock, ShieldCheck,
  ArrowDownToLine, ArrowUpFromLine, Building2, CreditCard, XCircle,
} from "lucide-react";

// ─── Payment Methods ───
const paymentMethods = [
  { id: "bank", label: "Banka Transferi", icon: Building2, description: "1-3 iş günü" },
  { id: "card", label: "Kredi Kartı", icon: CreditCard, description: "Anında" },
];

// ─── Verification Steps ───
const verificationSteps = [
  { id: 1, label: "Ön Yüz", description: "Kimlik belgenizin ön yüzünü yükleyin" },
  { id: 2, label: "İkametgah", description: "İkametgah belgenizi yükleyin" },
  { id: 3, label: "Tamamlandı", description: "Doğrulama talebiniz alındı" },
];

const Profile = () => {
  const [user, setUser] = useState(mockUser);
  const [passwords, setPasswords] = useState({ current: "", new: "", confirm: "" });

  // Deposit state
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [activeMoneyTab, setActiveMoneyTab] = useState<"deposit" | "withdraw">("deposit");

  // Verification state
  const [currentStep, setCurrentStep] = useState(1);
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [addressFile, setAddressFile] = useState<File | null>(null);

  const bankAccounts = [
    { id: "1", bankName: "Ziraat Bankası", iban: "TR33 0001 0009 4537 1234 5678 90", accountHolder: "Ahmet Yılmaz" },
  ];

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
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4 animate-slide-up pb-24 md:pb-6">
      <h1 className="text-xl md:text-2xl font-bold">Hesabım</h1>

      <Tabs defaultValue="info" className="w-full">
        <TabsList className="w-full grid grid-cols-4 h-auto">
          <TabsTrigger value="info" className="text-xs px-1 py-2">Bilgilerim</TabsTrigger>
          <TabsTrigger value="money" className="text-xs px-1 py-2">Para İşlemleri</TabsTrigger>
          <TabsTrigger value="verify" className="text-xs px-1 py-2">Doğrulama</TabsTrigger>
          <TabsTrigger value="bank" className="text-xs px-1 py-2">Banka</TabsTrigger>
        </TabsList>

        {/* ─── Kişisel Bilgiler ─── */}
        <TabsContent value="info" className="space-y-4 mt-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <UserCircle className="h-5 w-5 text-primary" />
                Profil Bilgileri
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Ad Soyad</label>
                <Input value={user.fullName} onChange={(e) => setUser({ ...user, fullName: e.target.value })} className="bg-muted/50" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">E-posta</label>
                <Input value={user.email} onChange={(e) => setUser({ ...user, email: e.target.value })} className="bg-muted/50" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Telefon</label>
                <Input value={user.phone} onChange={(e) => setUser({ ...user, phone: e.target.value })} className="bg-muted/50" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Doğum Tarihi</label>
                <Input type="date" value={user.birthDate || ""} onChange={(e) => setUser({ ...user, birthDate: e.target.value })} className="bg-muted/50" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Ülke</label>
                <Input value={user.country || ""} onChange={(e) => setUser({ ...user, country: e.target.value })} className="bg-muted/50" />
              </div>
              <Button className="w-full">Bilgileri Güncelle</Button>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Şifre Değiştir</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input type="password" placeholder="Mevcut Şifre" value={passwords.current} onChange={(e) => setPasswords({ ...passwords, current: e.target.value })} className="bg-muted/50" />
              <Input type="password" placeholder="Yeni Şifre" value={passwords.new} onChange={(e) => setPasswords({ ...passwords, new: e.target.value })} className="bg-muted/50" />
              <Input type="password" placeholder="Yeni Şifre Tekrar" value={passwords.confirm} onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })} className="bg-muted/50" />
              <Button variant="outline" className="w-full">Şifre Değiştir</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Para İşlemleri ─── */}
        <TabsContent value="money" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={activeMoneyTab === "deposit" ? "default" : "outline"}
              onClick={() => setActiveMoneyTab("deposit")}
              className="gap-2"
            >
              <ArrowDownToLine className="h-4 w-4" /> Yatır
            </Button>
            <Button
              variant={activeMoneyTab === "withdraw" ? "default" : "outline"}
              onClick={() => setActiveMoneyTab("withdraw")}
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
                    <p className="text-xs text-muted-foreground">{method.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {selectedMethod && (
            <Card className="bg-card border-border">
              <CardContent className="p-4 space-y-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Tutar (TRY) — {activeMoneyTab === "deposit" ? "Yatırılacak" : "Çekilecek"}
                  </label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={activeMoneyTab === "deposit" ? depositAmount : withdrawAmount}
                    onChange={(e) =>
                      activeMoneyTab === "deposit"
                        ? setDepositAmount(e.target.value)
                        : setWithdrawAmount(e.target.value)
                    }
                    className="bg-muted/50 font-mono text-lg h-12"
                  />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[1000, 5000, 10000, 25000].map((v) => (
                    <button
                      key={v}
                      onClick={() =>
                        activeMoneyTab === "deposit"
                          ? setDepositAmount(v.toString())
                          : setWithdrawAmount(v.toString())
                      }
                      className="px-3 py-1.5 rounded text-xs font-mono font-medium bg-muted text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
                    >
                      {v.toLocaleString("tr-TR")}
                    </button>
                  ))}
                </div>
                <Button className="w-full h-11 font-semibold">
                  {activeMoneyTab === "deposit" ? "Para Yatır" : "Para Çek"}
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
              {mockTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    {statusIcon(tx.status)}
                    <div>
                      <p className="text-sm font-medium">{tx.type === "deposit" ? "Yatırma" : "Çekme"}</p>
                      <p className="text-xs text-muted-foreground">{new Date(tx.createdAt).toLocaleDateString("tr-TR")}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono font-semibold">{tx.amount.toLocaleString("tr-TR")} ₺</p>
                    <p className="text-xs text-muted-foreground">{statusLabel(tx.status)}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Kimlik Doğrulama ─── */}
        <TabsContent value="verify" className="space-y-4 mt-4">
          {/* Steps indicator */}
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

        {/* ─── Banka Hesapları ─── */}
        <TabsContent value="bank" className="space-y-4 mt-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Banka Hesaplarım</CardTitle>
              <Button size="sm" variant="outline" className="gap-1 text-xs">
                <Plus className="h-3 w-3" /> Ekle
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {bankAccounts.map((acc) => (
                <div key={acc.id} className="p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold text-sm">{acc.bankName}</p>
                    <Button variant="ghost" size="sm" className="text-sell text-xs h-7">Sil</Button>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">{acc.iban}</p>
                  <p className="text-xs text-muted-foreground">{acc.accountHolder}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Profile;
