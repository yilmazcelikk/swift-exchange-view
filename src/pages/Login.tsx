import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Eye, EyeOff, TrendingUp } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        toast.error("Giriş başarısız: " + error.message);
        return;
      }

      // Yönlendirmeyi AuthContext + route guard yönetir
      navigate("/", { replace: true });
    } catch (err) {
      console.error("Login unexpected error:", err);
      toast.error("Beklenmeyen bir hata oluştu, lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };

  const topGainers = [
    { name: "BTCUSD", gain: "+4.25%", price: "$43,250" },
    { name: "XAUUSD", gain: "+1.82%", price: "$2,024" },
    { name: "THYAO", gain: "+3.15%", price: "₺282.50" },
    { name: "AAPL", gain: "+2.08%", price: "$182.50" },
    { name: "ETHUSD", gain: "+1.45%", price: "$2,280" },
  ];

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left Side — Branding & Data */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary/20 via-background to-buy/10 flex-col justify-center items-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-buy rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 space-y-8 w-full max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <img src="/tacirler-logo.png" alt="Tacirler Yatırım" className="h-12 w-auto" />
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-2">Piyasalara Hükmedin</h2>
            <p className="text-muted-foreground">Gerçek zamanlı verilerle güvenli ve hızlı işlem yapın.</p>
          </div>
          <Card className="bg-card/80 backdrop-blur border-border p-4">
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground">🔥 Günün Kazananları</h3>
            <div className="space-y-2">
              {topGainers.map((item) => (
                <div key={item.name} className="flex justify-between items-center py-1.5">
                  <span className="text-sm font-medium">{item.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground font-mono">{item.price}</span>
                    <span className="text-xs font-semibold text-buy font-mono">{item.gain}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Right Side — Login Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden flex items-center gap-3 mb-4">
            <img src="/tacirler-logo.png" alt="Tacirler Yatırım" className="h-10 w-auto" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Giriş Yap</h2>
            <p className="text-muted-foreground text-sm mt-1">Hesabınıza giriş yaparak işlem yapmaya başlayın.</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">E-posta</label>
              <Input type="email" placeholder="ornek@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-muted/50" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Şifre</label>
              <div className="relative">
                <Input type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-muted/50 pr-10" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="rounded border-border" />
                Beni hatırla
              </label>
            </div>
            <Button type="submit" className="w-full h-11 font-semibold" disabled={loading}>
              {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground">
            Hesabınız yok mu?{" "}
            <Link to="/register" className="text-primary font-medium hover:underline">Kayıt Ol</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
