import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

const Blocked = () => {
  const { signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    window.location.assign("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="text-center space-y-3">
        <h1 className="text-6xl font-bold text-muted-foreground/40">503</h1>
        <p className="text-lg font-medium text-foreground">Hizmet Geçici Olarak Kullanılamıyor</p>
        <p className="text-sm text-muted-foreground max-w-sm">
          Sunucularımızda bakım çalışması yapılmaktadır. Lütfen daha sonra tekrar deneyin.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center rounded-md bg-muted px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/80 transition-colors"
          >
            Tekrar Dene
          </button>
          <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
            <LogOut className="h-4 w-4" /> Çıkış Yap
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Blocked;
