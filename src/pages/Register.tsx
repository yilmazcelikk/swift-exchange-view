import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import AppLogo from "@/components/AppLogo";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

const Register = () => {
  const [searchParams] = useSearchParams();
  const hasGateKey = checkGate(searchParams);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: "", lastName: "", email: "", phone: "", tcIdentity: "",
    password: "", confirmPassword: "",
    userType: "", referralCode: searchParams.get("ref") || "", acceptTerms: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!hasGateKey) {
      navigate("/", { replace: true });
    }
  }, [hasGateKey, navigate]);

  if (!hasGateKey) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      toast.error("Ad ve soyad zorunludur");
      return;
    }
    if (!formData.email.trim()) {
      toast.error("E-posta adresi zorunludur");
      return;
    }
    if (!formData.phone.trim() || formData.phone.length < 10) {
      toast.error("Geçerli bir telefon numarası girin");
      return;
    }
    if (formData.tcIdentity.length !== 11) {
      toast.error("TC Kimlik numarası 11 haneli olmalıdır");
      return;
    }
    if (formData.password.length < 8) {
      toast.error("Şifre en az 8 karakter olmalıdır");
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error("Şifreler eşleşmiyor");
      return;
    }
    if (!formData.acceptTerms) {
      toast.error("Kullanım şartlarını kabul etmelisiniz");
      return;
    }
    setLoading(true);

    // Validate & prepare referral code before signup
    let validatedReferralCode = "";
    if (formData.referralCode.trim()) {
      const code = formData.referralCode.trim().toUpperCase();
      const { data: refData } = await supabase
        .from("referral_codes")
        .select("id, is_active")
        .eq("code", code)
        .eq("is_active", true)
        .single();

      if (refData) {
        validatedReferralCode = code;
        await supabase.rpc("increment_referral_usage", { p_code_id: refData.id });
      } else {
        toast.warning("Referans kodu geçersiz veya aktif değil, kod kaydedilmedi.");
      }
    }

    const { data: signUpData, error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          full_name: `${formData.firstName} ${formData.lastName}`,
          phone: formData.phone.trim() || undefined,
          tc_identity: formData.tcIdentity.trim() || undefined,
          referral_code: validatedReferralCode || undefined,
        },
      },
    });
    
    if (error) {
      setLoading(false);
      toast.error("Kayıt başarısız: " + error.message);
      return;
    }

    setLoading(false);
    toast.success("Kayıt başarılı! Giriş yapabilirsiniz.");
    navigate("/login");
  };

  const update = (key: string, value: string | boolean) =>
    setFormData((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="min-h-screen flex bg-background">
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-6">
          <div className="lg:hidden flex items-center gap-3 mb-4">
            <AppLogo className="h-10 w-auto" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Kayıt Ol</h2>
            <p className="text-muted-foreground text-sm mt-1">Bilgilerinizi girerek hesap oluşturun.</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Ad</label>
                <Input placeholder="Adınızı girin" value={formData.firstName} onChange={(e) => update("firstName", e.target.value)} className="bg-muted/50" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Soyad</label>
                <Input placeholder="Soyadınızı girin" value={formData.lastName} onChange={(e) => update("lastName", e.target.value)} className="bg-muted/50" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">E-posta</label>
              <Input type="email" placeholder="E-posta adresinizi girin" value={formData.email} onChange={(e) => update("email", e.target.value)} className="bg-muted/50" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Telefon</label>
              <div className="flex gap-2">
                <div className="flex items-center px-3 h-10 rounded-md border border-input bg-muted/50 text-sm text-muted-foreground shrink-0">+90</div>
                <Input
                  type="tel"
                  placeholder="5XX XXX XX XX"
                  value={formData.phone}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                    update("phone", val);
                  }}
                  maxLength={10}
                  className="bg-muted/50"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">TC Kimlik No</label>
              <Input
                placeholder="TC Kimlik numaranızı girin"
                value={formData.tcIdentity}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 11);
                  update("tcIdentity", val);
                }}
                maxLength={11}
                inputMode="numeric"
                pattern="[0-9]*"
                className="bg-muted/50 font-mono"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Referans Kodu (opsiyonel)</label>
              <Input placeholder="Varsa referans kodunuzu girin" value={formData.referralCode} onChange={(e) => update("referralCode", e.target.value.toUpperCase())} className="bg-muted/50 font-mono" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Şifre</label>
              <div className="relative">
                <Input type={showPassword ? "text" : "password"} placeholder="Şifrenizi girin" value={formData.password} onChange={(e) => update("password", e.target.value)} className="bg-muted/50 pr-10" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Şifre Tekrar</label>
              <Input type="password" placeholder="Şifrenizi tekrar girin" value={formData.confirmPassword} onChange={(e) => update("confirmPassword", e.target.value)} className="bg-muted/50" />
            </div>
            <div className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={formData.acceptTerms} onChange={(e) => update("acceptTerms", e.target.checked)} className="rounded border-border mt-1" />
              <span>
                <Dialog>
                  <DialogTrigger asChild>
                    <button type="button" className="text-primary hover:underline">Kişisel Verilerimin İşlenmesi</button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg max-h-[80vh]">
                    <DialogHeader>
                      <DialogTitle>Kişisel Verilerin İşlenmesi (KVKK)</DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="h-[60vh] pr-4">
                      <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
                        <h3 className="font-semibold text-foreground">Bilgileriniz Güvende</h3>
                        <p>
                          Kişisel Verilerin Saklanması ve Kullanım Koşulları ve haklarınız ile ilgili bilgilendirme yapmak amacıyla erişiminize sunulmuştur.
                        </p>
                        <p>
                          İşbu bilgilendirme ve aydınlatma duyurusu 6698 sayılı "Kişisel Verilerin Korunması Kanunu" (KVKK) 10. maddesi gereği hazırlanmış olup, bu beyan; kişisel verilerinizin işlenmesine ve aktarılmasına ilişkin yöntem, amaç, hukuki sebepleri içermektedir. Aynı zamanda kişisel verilerinizin korunmasına ilişkin haklarınız hakkında Veri Sorumlusu sıfatıyla platform internet sitesi/siteleri aracılığıyla tarafınızı aydınlatma ve bilgilendirmeyi amaçlamaktadır.
                        </p>
                      </div>
                    </ScrollArea>
                  </DialogContent>
                </Dialog>
                {" ve "}
                <Dialog>
                  <DialogTrigger asChild>
                    <button type="button" className="text-primary hover:underline">Gizlilik Politikası</button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg max-h-[80vh]">
                    <DialogHeader>
                      <DialogTitle>Gizlilik Politikası</DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="h-[60vh] pr-4">
                      <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
                        <h3 className="font-semibold text-foreground">Bilgilerinizin Gizliliği Güvende</h3>
                        <p>
                          Platform tarafından işletilen web sitelerini kullanarak bu sitelere münhasır "Kullanım ve Gizlilik Politikası'nı" kabul etmiş bulunmaktasınız. Platform, kendi istek ve kararları doğrultusunda bu sitelerde yer alan program ve metinlerde ve bunlara ilişkin politikalarda her zaman değişiklik, ekleme veya çıkartma yapma hakkını saklı tuttuğunu açıkça beyan eder.
                        </p>
                        <p>
                          Burada belirtilen tüm hüküm ve şartları kabul etmeniz halinde, web sitelerimizi kullanmaya devam etmeniz sonrasında, yukarıda belirtilen olası değişiklikleri de kabul ettiğiniz anlamına gelecektir.
                        </p>
                        <p>
                          Bu nedenlerle "Kullanım ve Gizlilik Politikası" metnimizi ve sitelerimizde olası değişiklikleri, ekleme veya çıkartmaları düzenli olarak kontrol etmenizi önermekteyiz.
                        </p>
                      </div>
                    </ScrollArea>
                  </DialogContent>
                </Dialog>
                'nı kabul ediyorum.
              </span>
            </div>
            <Button type="submit" className="w-full h-11 font-semibold" disabled={loading}>
              {loading ? "Kayıt yapılıyor..." : "Kayıt Ol"}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground">
            Zaten hesabınız var mı? <Link to="/login?go=1" className="text-primary font-medium hover:underline">Giriş Yap</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
