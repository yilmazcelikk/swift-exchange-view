import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  TrendingUp,
  ArrowDownToLine,
  FileText,
  LogOut,
  Menu,
  X,
  Landmark,
  Settings,
  ShoppingBag,
  ShieldAlert,
} from "lucide-react";
import AdminDashboard from "./AdminDashboard";
import AdminUsers from "./AdminUsers";
import AdminPositions from "./AdminPositions";
import AdminTransactions from "./AdminTransactions";
import AdminDocuments from "./AdminDocuments";
import AdminSettings from "./AdminSettings";
import AdminProducts from "./AdminProducts";
import AdminReferrals from "./AdminReferrals";
import AdminBankAccounts from "./AdminBankAccounts";
import AdminRisk from "./AdminRisk";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { AdminNotifications } from "@/components/admin/AdminNotifications";

const navSections = [
  {
    title: "GENEL",
    items: [
      { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    title: "İŞLEM YÖNETİMİ",
    items: [
      { key: "positions", label: "Pozisyonlar", icon: TrendingUp },
      { key: "risk", label: "Risk Yönetimi", icon: ShieldAlert },
      { key: "products", label: "Ürünler", icon: ShoppingBag },
    ],
  },
  {
    title: "KULLANICI",
    items: [
      { key: "users", label: "Kullanıcılar", icon: Users },
      { key: "documents", label: "KYC", icon: FileText },
    ],
  },
  {
    title: "FİNANSAL",
    items: [
      { key: "finance", label: "Finans Talepleri", icon: Landmark },
      { key: "bank-accounts", label: "Banka Hesapları", icon: Landmark },
    ],
  },
  {
    title: "PAZARLAMA",
    items: [
      { key: "referrals", label: "Referans Linkleri", icon: Landmark },
    ],
  },
  {
    title: "SİSTEM",
    items: [
      { key: "settings", label: "Sistem Ayarları", icon: Settings },
    ],
  },
];

const AdminLayout = () => {
  const { isAdmin, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/login" replace />;
  }

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
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform md:relative md:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="h-14 flex items-center justify-between px-4 border-b border-border">
          <div className="flex items-center gap-2">
            <img src="/marbas-logo.png" alt="Marbaş Menkul Değerler" className="h-8 w-auto" />
          </div>
          <Button variant="ghost" size="icon" className="md:hidden h-8 w-8" onClick={() => setSidebarOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <nav className="p-3 space-y-4 overflow-y-auto max-h-[calc(100vh-7rem)]">
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
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-border">
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
        <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4">
          <Button variant="ghost" size="icon" className="md:hidden h-8 w-8" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 ml-auto">
            <AdminNotifications />
            <ThemeToggle />
            <span className="text-xs text-muted-foreground bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">Admin</span>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-6">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
