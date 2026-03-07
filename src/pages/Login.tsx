import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const Login = () => {
  const { user, isAdmin, loading: authLoading, roleResolved } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && roleResolved && user) {
      navigate(isAdmin ? "/admin" : "/dashboard", { replace: true });
    }
  }, [user, isAdmin, authLoading, roleResolved, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        toast.error("Giriş başarısız. E-posta veya şifre hatalı.");
        return;
      }

      const userId = data.user?.id;
      if (!userId) {
        toast.error("Oturum bilgisi alınamadı. Lütfen tekrar deneyin.");
        return;
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("is_banned, ban_reason")
        .eq("user_id", userId)
        .single();

      if (profileData?.is_banned) {
        await supabase.auth.signOut();
        toast.error("Giriş başarısız. E-posta veya şifre hatalı.");
        return;
      }

      const { data: isAdminRole, error: roleError } = await supabase.rpc("has_role", {
        _user_id: userId,
        _role: "admin",
      });

      if (roleError) {
        console.error("Role check error:", roleError);
      }

      navigate(isAdminRole ? "/admin" : "/dashboard", { replace: true });
    } catch (err) {
      console.error("Login unexpected error:", err);
      toast.error("Beklenmeyen bir hata oluştu, lütfen tekrar deneyin.");
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left Side — Company Info */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center p-12 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #0a1628 0%, #122044 50%, #1a3068 100%)" }}>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 right-10 w-80 h-80 rounded-full blur-3xl" style={{ background: "radial-gradient(circle, #3b82f6 0%, transparent 70%)" }} />
          <div className="absolute bottom-20 left-10 w-64 h-64 rounded-full blur-3xl" style={{ background: "radial-gradient(circle, #1d4ed8 0%, transparent 70%)" }} />
        </div>

        <div className="relative z-10 space-y-8 w-full max-w-lg text-center">
          <div className="flex justify-center mb-6">
            <img src="/marbas-logo.png" alt="Marbaş Menkul Değerler" className="h-40 w-40 object-contain rounded-full" />
          </div>
          <h2 className="text-2xl font-bold text-white/90" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
            Marbaş Menkul Değerler
          </h2>
          <div className="space-y-4 text-white/75 text-sm leading-relaxed" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
            <p>
              Marbaş Menkul Değerler A.Ş., Türk sermaye piyasalarının güvenilir aracı kurumlarından biri olarak yerli ve yabancı bireysel ve kurumsal yatırımcılara hizmet vermektedir.
            </p>
            <p>
              SPK lisanslı yapısıyla yatırımcılarına güvenli, hızlı ve şeffaf bir yatırım deneyimi sunmayı hedefleyen Marbaş Menkul Değerler, teknolojik altyapısını sürekli geliştirerek müşterilerine en iyi hizmeti vermeye odaklanmaktadır.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 pt-4">
             {[
               { label: "Lisans", value: "SPK" },
               { label: "Hizmet", value: "Borsa İstanbul" },
               { label: "Güvenlik", value: "A+" },
             ].map((s) => (
              <div key={s.label} className="text-center p-3 rounded-xl bg-white/5 backdrop-blur border border-white/10">
                <p className="text-base font-bold text-white">{s.value}</p>
                <p className="text-[11px] text-white/50 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Side — Login Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden flex justify-center mb-4">
            <img src="/marbas-logo.png" alt="Marbaş Menkul Değerler" className="h-20 w-20 object-contain rounded-full" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Giriş Yap</h2>
            <p className="text-muted-foreground text-sm mt-1">Hesabınıza giriş yaparak işlem yapmaya başlayın.</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">E-posta</label>
              <Input type="email" placeholder="" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-muted/50" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Şifre</label>
              <div className="relative">
                <Input type={showPassword ? "text" : "password"} placeholder="" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-muted/50 pr-10" />
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
            <Button type="submit" className="w-full h-11 font-semibold" disabled={submitLoading}>
              {submitLoading ? "Giriş yapılıyor..." : "Giriş Yap"}
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
