import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppLogo from "@/components/AppLogo";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { resolveGateAccess } from "@/lib/gatekeeper";

const Login = () => {
  const { user, isAdmin, loading: authLoading, roleResolved } = useAuth();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(() => localStorage.getItem("rememberedEmail") || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => !!localStorage.getItem("rememberedEmail"));
  const [submitLoading, setSubmitLoading] = useState(false);
  const navigate = useNavigate();

  // Best-effort gate refresh in background — does not block login UI
  useEffect(() => {
    void resolveGateAccess(new URLSearchParams(searchParams));
  }, [searchParams]);

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

      // Remember me
      if (rememberMe) {
        localStorage.setItem("rememberedEmail", email);
      } else {
        localStorage.removeItem("rememberedEmail");
      }

      const userId = data.user?.id;
      if (!userId) {
        toast.error("Oturum bilgisi alınamadı. Lütfen tekrar deneyin.");
        return;
      }

      navigate("/dashboard", { replace: true });
    } catch (err) {
      console.error("Login unexpected error:", err);
      toast.error("Beklenmeyen bir hata oluştu, lütfen tekrar deneyin.");
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-8">
      <div className="w-full max-w-md space-y-8">
        <div className="flex justify-center mb-4">
          <AppLogo className="h-20 w-20 object-contain rounded-full" alt="Logo" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Giriş Yap</h2>
          <p className="text-muted-foreground text-sm mt-1">Hesabınıza giriş yaparak işlem yapmaya başlayın.</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">E-posta</label>
            <Input type="email" placeholder="E-posta adresinizi girin" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-muted/50" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Şifre</label>
            <div className="relative">
              <Input type={showPassword ? "text" : "password"} placeholder="Şifrenizi girin" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-muted/50 pr-10" />
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
          <Link to={searchParams.get("ref") ? `/register?ref=${searchParams.get("ref")}` : "/register"} className="text-primary font-medium hover:underline">Kayıt Ol</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
