import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, EyeOff, TrendingUp } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Register = () => {
  const [formData, setFormData] = useState({
    firstName: "", lastName: "", email: "", phone: "", password: "", confirmPassword: "",
    userType: "", referralCode: "", acceptTerms: false,
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
    const { error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: { full_name: `${formData.firstName} ${formData.lastName}` },
      },
    });
    setLoading(false);
    if (error) {
      toast.error("Kayıt başarısız: " + error.message);
    } else {
      toast.success("Kayıt başarılı! Giriş yapabilirsiniz.");
      navigate("/login");
    }
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
            <div className="p-2 bg-primary rounded-xl">
              <TrendingUp className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold">TradeHub</h1>
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
            <div className="p-2 bg-primary rounded-xl">
              <TrendingUp className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold">TradeHub</h1>
          </div>
          <div>
            <h2 className="text-2xl font-bold">Kayıt Ol</h2>
            <p className="text-muted-foreground text-sm mt-1">Bilgilerinizi girerek hesap oluşturun.</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Ad</label>
                <Input placeholder="Ahmet" value={formData.firstName} onChange={(e) => update("firstName", e.target.value)} className="bg-muted/50" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Soyad</label>
                <Input placeholder="Yılmaz" value={formData.lastName} onChange={(e) => update("lastName", e.target.value)} className="bg-muted/50" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">E-posta</label>
              <Input type="email" placeholder="ornek@email.com" value={formData.email} onChange={(e) => update("email", e.target.value)} className="bg-muted/50" />
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
              <label className="text-sm font-medium mb-1.5 block">Şifre</label>
              <div className="relative">
                <Input type={showPassword ? "text" : "password"} placeholder="••••••••" value={formData.password} onChange={(e) => update("password", e.target.value)} className="bg-muted/50 pr-10" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Şifre Tekrar</label>
              <Input type="password" placeholder="••••••••" value={formData.confirmPassword} onChange={(e) => update("confirmPassword", e.target.value)} className="bg-muted/50" />
            </div>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={formData.acceptTerms} onChange={(e) => update("acceptTerms", e.target.checked)} className="rounded border-border mt-0.5" />
              <span><a href="#" className="text-primary hover:underline">Kullanım Şartları</a> ve <a href="#" className="text-primary hover:underline">Gizlilik Politikası</a>'nı kabul ediyorum.</span>
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
