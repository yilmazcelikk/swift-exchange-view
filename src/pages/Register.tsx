import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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
  const [formData, setFormData] = useState({
    firstName: "", lastName: "", email: "", phone: "", password: "", confirmPassword: "",
    userType: "", referralCode: searchParams.get("ref") || "", acceptTerms: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error("Şifreler eşleşmiyor");
      return;
    }
    if (!formData.acceptTerms) {
      toast.error("Kullanım şartlarını kabul etmelisiniz");
      return;
    }
    setLoading(true);
    const { data: signUpData, error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: { full_name: `${formData.firstName} ${formData.lastName}` },
      },
    });
    
    if (error) {
      setLoading(false);
      toast.error("Kayıt başarısız: " + error.message);
      return;
    }

    if (signUpData.user) {
      const profileUpdates: Record<string, string> = {};

      // Save phone number
      if (formData.phone.trim()) {
        profileUpdates.phone = formData.phone.trim();
      }

      // Validate & save referral code
      if (formData.referralCode.trim()) {
        const code = formData.referralCode.trim().toUpperCase();
        const { data: refData } = await supabase
          .from("referral_codes")
          .select("id, is_active")
          .eq("code", code)
          .eq("is_active", true)
          .single();

        if (refData) {
          profileUpdates.referral_code = code;
          // Increment usage count
          await supabase.rpc("has_role", { _user_id: signUpData.user.id, _role: "user" }); // dummy call to keep session
          await supabase.from("referral_codes").update({ usage_count: (refData as any).usage_count ? (refData as any).usage_count + 1 : 1 } as any).eq("id", refData.id);
        } else {
          toast.warning("Referans kodu geçersiz veya aktif değil, kod kaydedilmedi.");
        }
      }

      if (Object.keys(profileUpdates).length > 0) {
        await supabase.from("profiles").update(profileUpdates).eq("user_id", signUpData.user.id);
      }
    }

    setLoading(false);
    toast.success("Kayıt başarılı! Giriş yapabilirsiniz.");
    navigate("/login");
  };

  const update = (key: string, value: string | boolean) =>
    setFormData((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary/20 via-background to-buy/10 flex-col justify-center items-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-buy rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 space-y-6 w-full max-w-md">
          <div className="flex items-center gap-3">
            <img src="/marbas-logo.png" alt="Marbaş Menkul Değerler" className="h-12 w-auto" />
          </div>
          <h2 className="text-2xl font-bold">Yatırıma Bugün Başlayın</h2>
          <p className="text-muted-foreground">Hızlı kayıt ile dakikalar içinde işlem yapmaya başlayın.</p>
          <div className="grid grid-cols-3 gap-4 pt-4">
            {[
              { label: "Aktif Kullanıcı", value: "50K+" },
              { label: "Günlük İşlem", value: "$2M+" },
              { label: "Ülke", value: "30+" },
            ].map((s) => (
              <div key={s.label} className="text-center p-3 rounded-xl bg-card/60 backdrop-blur">
                <p className="text-lg font-bold text-primary">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-6">
          <div className="lg:hidden flex items-center gap-3 mb-4">
            <img src="/marbas-logo.png" alt="Marbaş Menkul Değerler" className="h-10 w-auto" />
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
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={formData.acceptTerms} onChange={(e) => update("acceptTerms", e.target.checked)} className="rounded border-border mt-0.5" />
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
                          İşbu bilgilendirme ve aydınlatma duyurusu 6698 sayılı "Kişisel Verilerin Korunması Kanunu" (KVKK) 10. maddesi gereği hazırlanmış olup, bu beyan; kişisel verilerinizin işlenmesine ve aktarılmasına ilişkin yöntem, amaç, hukuki sebepleri içermektedir. Aynı zamanda kişisel verilerinizin korunmasına ilişkin haklarınız hakkında Veri Sorumlusu sıfatlıyla Marbaş Menkul Değerler A.Ş. internet sitesi/siteleri aracılığıyla tarafınızı aydınlatma ve bilgilendirmeyi amaçlamaktadır.
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
                          Marbaş Menkul Değerler'in işlettiği web sitelerini kullanarak bu sitelere münhasır "Kullanım ve Gizlilik Politikası'nı" kabul etmiş bulunmaktasınız. Marbaş Menkul Değerler, kendi istek ve kararları doğrultusunda bu sitelerde yer alan program ve metinlerde ve bunlara ilişkin politikalarda her zaman değişiklik, ekleme veya çıkartma yapma hakkını saklı tuttuğunu açıkça beyan eder.
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
            </label>
            <Button type="submit" className="w-full h-11 font-semibold" disabled={loading}>
              {loading ? "Kayıt yapılıyor..." : "Kayıt Ol"}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground">
            Zaten hesabınız var mı? <Link to="/login" className="text-primary font-medium hover:underline">Giriş Yap</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
