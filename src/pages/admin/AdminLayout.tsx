import { useState, useEffect, lazy, Suspense } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import AppLogo from "@/components/AppLogo";
import {
  LayoutDashboard,
  Users,
  TrendingUp,
  FileText,
  LogOut,
  Menu,
  X,
  Landmark,
  Settings,
  ShoppingBag,
  ShieldAlert,
} from "lucide-react";
const AdminDashboard = lazy(() => import("./AdminDashboard"));
const AdminUsers = lazy(() => import("./AdminUsers"));
const AdminPositions = lazy(() => import("./AdminPositions"));
const AdminTransactions = lazy(() => import("./AdminTransactions"));
const AdminDocuments = lazy(() => import("./AdminDocuments"));
const AdminSettings = lazy(() => import("./AdminSettings"));
const AdminProducts = lazy(() => import("./AdminProducts"));
const AdminReferrals = lazy(() => import("./AdminReferrals"));
const AdminBankAccounts = lazy(() => import("./AdminBankAccounts"));
const AdminRisk = lazy(() => import("./AdminRisk"));
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { AdminNotifications } from "@/components/admin/AdminNotifications";
import { supabase } from "@/integrations/supabase/client";

interface PendingCounts {
  finance: number;
  kyc: number;
  pendingOrders: number;
}

const buildNavSections = (badges: PendingCounts) => [
  {
    title: "GENEL",
    items: [
      { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, badge: 0 },
    ],
  },
  {
    title: "İŞLEM YÖNETİMİ",
    items: [
      { key: "positions", label: "Pozisyonlar", icon: TrendingUp, badge: badges.pendingOrders },
      { key: "risk", label: "Risk Yönetimi", icon: ShieldAlert, badge: 0 },
      { key: "products", label: "Ürünler", icon: ShoppingBag, badge: 0 },
    ],
  },
  {
    title: "KULLANICI",
    items: [
      { key: "users", label: "Kullanıcılar", icon: Users, badge: 0 },
      { key: "documents", label: "KYC", icon: FileText, badge: badges.kyc },
    ],
  },
  {
    title: "FİNANSAL",
    items: [
      { key: "finance", label: "Finans Talepleri", icon: Landmark, badge: badges.finance },
      { key: "bank-accounts", label: "Banka Hesapları", icon: Landmark, badge: 0 },
    ],
  },
  {
    title: "PAZARLAMA",
    items: [
      { key: "referrals", label: "Referans Linkleri", icon: Landmark, badge: 0 },
    ],
  },
  {
    title: "SİSTEM",
    items: [
      { key: "settings", label: "Sistem Ayarları", icon: Settings, badge: 0 },
    ],
  },
];

const AdminLayout = () => {
  const { isAdmin, isModerator, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingCounts, setPendingCounts] = useState<PendingCounts>({ finance: 0, kyc: 0, pendingOrders: 0 });

  useEffect(() => {
    const loadBadges = async () => {
      const [financeRes, kycRes, ordersRes] = await Promise.all([
        supabase.from("transactions").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("documents").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
      ]);
      setPendingCounts({ finance: financeRes.count || 0, kyc: kycRes.count || 0, pendingOrders: ordersRes.count || 0 });
    };
    if (isAdmin || isModerator) {
      loadBadges();

      // Realtime instead of 30s polling
      const txChannel = supabase
        .channel('admin-layout-tx-badges')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => loadBadges())
        .subscribe();

      const docChannel = supabase
        .channel('admin-layout-doc-badges')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'documents' }, () => loadBadges())
        .subscribe();

      const ordChannel = supabase
        .channel('admin-layout-order-badges')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => loadBadges())
        .subscribe();

      return () => {
        supabase.removeChannel(txChannel);
        supabase.removeChannel(docChannel);
        supabase.removeChannel(ordChannel);
      };
    }
  }, [isAdmin, isModerator]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAdmin && !isModerator) {
    return <Navigate to="/login" replace />;
  }

  // Moderator allowed keys
  const moderatorAllowedKeys = ["positions", "risk", "users"];

  const navSections = buildNavSections(pendingCounts)
    .map((section) => ({
      ...section,
      items: section.items.filter((item) =>
        isAdmin ? true : moderatorAllowedKeys.includes(item.key)
      ),
    }))
    .filter((section) => section.items.length > 0);

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard": return <AdminDashboard onNavigate={setActiveTab} />;
      case "users": return <AdminUsers />;
      case "positions": return <AdminPositions />;
      case "risk": return <AdminRisk />;
      case "finance":
        return <AdminTransactions />;
      case "documents": return <AdminDocuments />;
      case "settings": return <AdminSettings />;
      case "products": return <AdminProducts />;
      case "referrals": return <AdminReferrals />;
      case "bank-accounts": return <AdminBankAccounts />;
      default: return <AdminDashboard onNavigate={setActiveTab} />;
    }
  };

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-60 bg-card border-r border-border transform transition-transform md:relative md:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="h-12 md:h-14 flex items-center justify-between px-3 md:px-4 border-b border-border">
          <div className="flex items-center gap-2">
            <AppLogo className="h-7 md:h-8 w-auto" alt="Admin Panel" />
          </div>
          <Button variant="ghost" size="icon" className="md:hidden h-8 w-8" onClick={() => setSidebarOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <nav className="p-2 md:p-3 space-y-3 overflow-y-auto max-h-[calc(100vh-7rem)]">
          {navSections.map((section) => (
            <div key={section.title}>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-1">
                {section.title}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => { setActiveTab(item.key); setSidebarOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      activeTab === item.key
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.badge > 0 && (
                      <span className="h-5 min-w-5 px-1 rounded-full bg-warning text-[10px] font-bold text-warning-foreground flex items-center justify-center">
                        {item.badge > 99 ? "99+" : item.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-2 md:p-3 border-t border-border">
          <button
            onClick={async () => { await signOut(); navigate("/login", { replace: true }); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-destructive transition-colors"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Çıkış Yap
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-12 md:h-14 border-b border-border bg-card flex items-center justify-between px-3 md:px-4">
          <Button variant="ghost" size="icon" className="md:hidden h-8 w-8" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-1.5 md:gap-2 ml-auto">
            <AdminNotifications />
            <ThemeToggle />
            <span className="text-[10px] md:text-xs text-muted-foreground bg-primary/10 text-primary px-1.5 md:px-2 py-0.5 md:py-1 rounded-full font-medium">Admin</span>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-3 md:p-6">
          <Suspense
            fallback={
              <div className="min-h-[50vh] flex items-center justify-center">
                <div className="animate-spin h-7 w-7 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            }
          >
            {renderContent()}
          </Suspense>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
