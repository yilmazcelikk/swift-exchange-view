import { LayoutDashboard, TrendingUp, UserCircle, History, Wallet } from "lucide-react";
import { NavLink } from "@/components/NavLink";

const navItems = [
  { title: "İşlem", url: "/dashboard", icon: LayoutDashboard },
  { title: "Piyasalar", url: "/trading", icon: TrendingUp },
  { title: "Geçmiş", url: "/history", icon: History },
  { title: "Finans", url: "/finance", icon: Wallet },
  { title: "Hesabım", url: "/profile", icon: UserCircle },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card border-t border-border will-change-transform" style={{ paddingBottom: 'var(--app-safe-bottom)', transform: 'translateZ(0)' }}>
      <div className="flex items-center justify-around h-14">
        {navItems.map((item) => (
          <NavLink
            key={item.title}
            to={item.url}
            end
            className="flex flex-col items-center justify-center gap-1 flex-1 py-2 text-muted-foreground transition-colors"
            activeClassName="text-primary"
          >
            <item.icon className="h-5 w-5" />
            <span className="text-[10px] font-medium">{item.title}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
