import { ShieldX, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";

const Blocked = () => {
  const { user } = useAuth();
  const [banReason, setBanReason] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("ban_reason")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.ban_reason) setBanReason(data.ban_reason);
      });
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="w-full max-w-md">
        <div className="bg-card border border-border rounded-2xl p-8 shadow-xl space-y-6 text-center">
          {/* Icon */}
          <div className="mx-auto w-16 h-16 rounded-full bg-sell/10 flex items-center justify-center">
            <ShieldX className="w-8 h-8 text-sell" />
          </div>

          {/* Title */}
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-foreground">Hesabınız Askıya Alındı</h1>
            <p className="text-sm text-muted-foreground">
              Hesabınıza erişim geçici olarak kısıtlanmıştır.
            </p>
          </div>

          {/* Reason */}
          {banReason && (
            <div className="bg-sell/5 border border-sell/20 rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-1 font-medium">Sebep</p>
              <p className="text-sm text-foreground">{banReason}</p>
            </div>
          )}

          {/* Support info */}
          <div className="bg-muted/50 rounded-xl p-4 space-y-1">
            <p className="text-xs text-muted-foreground">
              Bu durumun hatalı olduğunu düşünüyorsanız lütfen destek ekibimizle iletişime geçin.
            </p>
          </div>

          {/* Logout button */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-muted hover:bg-muted/80 text-sm font-medium text-foreground transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Çıkış Yap
          </button>
        </div>
      </div>
    </div>
  );
};

export default Blocked;
