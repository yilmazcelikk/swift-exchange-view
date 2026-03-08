import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  UserCircle, Upload, CheckCircle, Clock, ShieldCheck,
  XCircle, Pencil, Sun, Moon, LogOut, Mail, Phone, MapPin, Calendar, User, Lock, KeyRound,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";

// ─── Verification Steps ───
const verificationSteps = [
  { id: 1, label: "Kimlik Ön Yüz", description: "Kimlik belgenizin ön yüzünü yükleyin" },
  { id: 2, label: "Kimlik Arka Yüz", description: "Kimlik belgenizin arka yüzünü yükleyin" },
  { id: 3, label: "Tamamlandı", description: "Doğrulama talebiniz alındı" },
];

const ThemeCard = () => {
  const { theme, setTheme } = useTheme();
  return (
    <Card className="bg-card border-border overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
            {theme === "dark" ? <Moon className="h-4.5 w-4.5 text-primary" /> : <Sun className="h-4.5 w-4.5 text-primary" />}
          </div>
          <span className="text-sm font-semibold">Görünüm</span>
        </div>
        <div className="flex gap-2">
          <Button
            variant={theme === "light" ? "default" : "outline"}
            className="flex-1 gap-2 h-10"
            onClick={() => setTheme("light")}
          >
            <Sun className="h-4 w-4" /> Açık
          </Button>
          <Button
            variant={theme === "dark" ? "default" : "outline"}
            className="flex-1 gap-2 h-10"
            onClick={() => setTheme("dark")}
          >
            <Moon className="h-4 w-4" /> Koyu
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const Profile = () => {
  const { user: authUser, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState({
    fullName: "",
    email: "",
    phone: "",
    birthDate: "",
    country: "",
  });
  const [isEditing, setIsEditing] = useState(false);
  const [passwords, setPasswords] = useState({ current: "", new: "", confirm: "" });
  const [profileLoading, setProfileLoading] = useState(true);

  // Verification state
  const [currentStep, setCurrentStep] = useState(1);
  const [verificationStatus, setVerificationStatus] = useState<string>("pending");
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [addressFile, setAddressFile] = useState<File | null>(null);

  useEffect(() => {
    if (authUser) {
      loadProfile();
      loadVerificationStatus();
    }
  }, [authUser]);

  const loadVerificationStatus = async () => {
    const { data: docs } = await supabase
      .from("documents")
      .select("type, status")
      .eq("user_id", authUser!.id);

    if (docs && docs.length > 0) {
      const hasFront = docs.find(d => d.type === "identity_front");
      const hasAddress = docs.find(d => d.type === "identity_back" || d.type === "address_proof");

      if (hasFront && hasAddress) {
        const allApproved = docs.every(d => d.status === "approved");
        const anyRejected = docs.some(d => d.status === "rejected");
        setCurrentStep(3);
        setVerificationStatus(allApproved ? "approved" : anyRejected ? "rejected" : "pending");
      } else if (hasFront) {
        setCurrentStep(2);
      }
    }

    const { data: profileData } = await supabase
      .from("profiles")
      .select("verification_status")
      .eq("user_id", authUser!.id)
      .single();
    if (profileData?.verification_status === "verified") {
      setVerificationStatus("approved");
      setCurrentStep(3);
    }
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

  const [submitting, setSubmitting] = useState(false);

  const handleVerificationUpload = async () => {
    if (!authUser || !frontFile) return;
    setSubmitting(true);
    try {
      const frontExt = frontFile.name.split(".").pop();
      const frontPath = `${authUser.id}/id_front_${Date.now()}.${frontExt}`;
      const { error: frontUploadErr } = await supabase.storage.from("documents").upload(frontPath, frontFile);
      if (frontUploadErr) throw frontUploadErr;

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
      const addrPath = `${authUser.id}/id_back_${Date.now()}.${addrExt}`;
      const { error: addrUploadErr } = await supabase.storage.from("documents").upload(addrPath, addressFile);
      if (addrUploadErr) throw addrUploadErr;

      await supabase.from("documents").insert({
        user_id: authUser.id,
        type: "identity_back",
        file_url: addrPath,
      });

      toast.success("Belgeleriniz gönderildi");
      setCurrentStep(3);
    } catch (err: any) {
      toast.error("Yükleme başarısız: " + err.message);
    }
    setSubmitting(false);
  };

  if (!authUser || profileLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const initials = profile.fullName
    ? profile.fullName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  const infoFields = [
    { icon: User, label: "Ad Soyad", value: profile.fullName, key: "fullName" as const, editable: true },
    { icon: Mail, label: "E-posta", value: profile.email, key: "email" as const, editable: false },
    { icon: Phone, label: "Telefon", value: profile.phone, key: "phone" as const, editable: true },
    { icon: Calendar, label: "Doğum Tarihi", value: profile.birthDate, key: "birthDate" as const, editable: true, type: "date" },
    { icon: MapPin, label: "Ülke", value: profile.country, key: "country" as const, editable: true },
  ];

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4 animate-slide-up pb-24 md:pb-6">
      <Tabs defaultValue="info" className="w-full">
        <TabsList className="w-full grid grid-cols-3 h-auto">
          <TabsTrigger value="info" className="text-xs px-1 py-2">Bilgilerim</TabsTrigger>
          <TabsTrigger value="verify" className="text-xs px-1 py-2">Doğrulama</TabsTrigger>
          <TabsTrigger value="settings" className="text-xs px-1 py-2">Ayarlar</TabsTrigger>
        </TabsList>

        {/* ─── Kişisel Bilgiler ─── */}
        <TabsContent value="info" className="space-y-4 mt-4">
          {/* Profile Header Card */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/15 via-primary/5 to-transparent border border-primary/10 p-5">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-20 h-20 bg-primary/5 rounded-full translate-y-1/2 -translate-x-1/2" />
            <div className="relative flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-primary/20 border-2 border-primary/30 flex items-center justify-center shrink-0">
                <span className="text-xl font-bold text-primary">{initials}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-foreground truncate">
                  {profile.fullName || "İsim belirtilmemiş"}
                </h2>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{profile.email}</p>
                <div className="mt-2">
                  {verificationStatus === "approved" ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-buy/10 text-buy">
                      <ShieldCheck className="h-3 w-3" /> Doğrulanmış
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-warning/10 text-warning">
                      <Clock className="h-3 w-3" /> Doğrulanmamış
                    </span>
                  )}
                </div>
              </div>
              {!isEditing && (
                <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9 rounded-xl" onClick={() => setIsEditing(true)}>
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Info Fields */}
          <Card className="bg-card border-border overflow-hidden">
            <CardContent className="p-0">
              {infoFields.map((field, i) => (
                <div key={field.key}>
                  {i > 0 && <div className="h-px bg-border mx-4" />}
                  <div className="flex items-center gap-3 px-4 py-3.5">
                    <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                      <field.icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{field.label}</p>
                      {isEditing && field.editable ? (
                        <Input
                          type={field.type || "text"}
                          value={field.value}
                          onChange={(e) => setProfile({ ...profile, [field.key]: e.target.value })}
                          className="mt-1 h-8 text-sm bg-muted/50 border-border"
                        />
                      ) : (
                        <p className="text-sm font-medium text-foreground truncate mt-0.5">
                          {field.value || <span className="text-muted-foreground italic">Belirtilmemiş</span>}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {isEditing && (
            <div className="flex gap-2">
              <Button className="flex-1" onClick={handleUpdateProfile}>Kaydet</Button>
              <Button variant="outline" className="flex-1" onClick={() => setIsEditing(false)}>İptal</Button>
            </div>
          )}
        </TabsContent>

        {/* ─── Ayarlar ─── */}
        <TabsContent value="settings" className="space-y-4 mt-4">
          <ThemeCard />

          <Card className="bg-card border-border overflow-hidden">
            <CardContent className="p-0">
              <div className="flex items-center gap-3 px-4 pt-4 pb-3">
                <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Lock className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm font-semibold">Şifre Değiştir</span>
              </div>
              <div className="h-px bg-border mx-4" />
              <div className="px-4 py-3.5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    <KeyRound className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Yeni Şifre</p>
                    <Input type="password" placeholder="••••••••" value={passwords.new} onChange={(e) => setPasswords({ ...passwords, new: e.target.value })} className="mt-1 h-8 text-sm bg-muted/50 border-border" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Şifre Tekrar</p>
                    <Input type="password" placeholder="••••••••" value={passwords.confirm} onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })} className="mt-1 h-8 text-sm bg-muted/50 border-border" />
                  </div>
                </div>
              </div>
              <div className="px-4 pb-4">
                <Button variant="outline" className="w-full" onClick={handleChangePassword}>Şifre Değiştir</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Kimlik Doğrulama ─── */}
        <TabsContent value="verify" className="space-y-4 mt-4">
          <div className="flex items-center justify-center gap-1 sm:gap-2 w-full overflow-x-auto px-1">
            {verificationSteps.map((step, i) => (
              <div key={step.id} className="flex items-center gap-1 sm:gap-2 shrink-0">
                <div className={`flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full text-[10px] sm:text-xs font-bold shrink-0 ${
                  currentStep > step.id ? "bg-buy text-buy-foreground" :
                  currentStep === step.id ? "bg-primary text-primary-foreground" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {currentStep > step.id ? <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : step.id}
                </div>
                <span className="text-[10px] sm:text-xs font-medium whitespace-nowrap">{step.label}</span>
                {i < verificationSteps.length - 1 && <div className="w-4 sm:w-8 h-px bg-border shrink-0" />}
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
                  <Button onClick={handleVerificationUpload} disabled={!frontFile || submitting} className="w-full">
                    {submitting ? "Yükleniyor..." : "Devam Et"}
                  </Button>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm">Kimlik Arka Yüz</h3>
                  <p className="text-xs text-muted-foreground">TC Kimlik Kartınızın veya Pasaportunuzun arka yüzünü yükleyin.</p>
                  <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 transition-colors bg-muted/30">
                    <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                    <span className="text-xs text-muted-foreground">{addressFile ? addressFile.name : "Dosya seçin"}</span>
                    <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => setAddressFile(e.target.files?.[0] || null)} />
                  </label>
                  <Button onClick={handleAddressUpload} disabled={!addressFile || submitting} className="w-full">
                    {submitting ? "Yükleniyor..." : "Gönder"}
                  </Button>
                </div>
              )}

              {currentStep === 3 && (
                <div className="text-center py-6 space-y-3">
                  {verificationStatus === "approved" ? (
                    <>
                      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-buy/10">
                        <ShieldCheck className="h-7 w-7 text-buy" />
                      </div>
                      <h3 className="font-bold text-buy">Hesabınız Doğrulandı</h3>
                      <p className="text-xs text-muted-foreground">Tüm belgeleriniz onaylanmıştır.</p>
                    </>
                  ) : verificationStatus === "rejected" ? (
                    <>
                      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-sell/10">
                        <XCircle className="h-7 w-7 text-sell" />
                      </div>
                      <h3 className="font-bold text-sell">Belgeleriniz Reddedildi</h3>
                      <p className="text-xs text-muted-foreground">Lütfen belgelerinizi tekrar yükleyin.</p>
                    </>
                  ) : (
                    <>
                      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-buy/10">
                        <CheckCircle className="h-7 w-7 text-buy" />
                      </div>
                      <h3 className="font-bold">Belgeleriniz Alındı!</h3>
                      <p className="text-xs text-muted-foreground">Belgeleriniz kontrol ediliyor.</p>
                      <div className="flex items-center justify-center gap-2 text-warning">
                        <Clock className="h-4 w-4" />
                        <span className="text-xs font-medium">İnceleme Bekleniyor</span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Button
        variant="outline"
        className="w-full gap-2 border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground"
        onClick={async () => {
          await signOut();
          navigate("/login");
        }}
      >
        <LogOut className="h-4 w-4" />
        Çıkış Yap
      </Button>
    </div>
  );
};

export default Profile;
