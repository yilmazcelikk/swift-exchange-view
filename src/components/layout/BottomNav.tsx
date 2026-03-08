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
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card/95 backdrop-blur-sm border-t border-border" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 6px)' }}>
      <div className="flex items-center justify-around h-12">
        {navItems.map((item) => (
          <NavLink
            key={item.title}
            to={item.url}
            end
            className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5 text-muted-foreground transition-colors"
            activeClassName="text-primary"
          >
            <item.icon className="h-4.5 w-4.5" strokeWidth={1.5} />
            <span className="text-[9px] font-mono font-medium uppercase tracking-wide">{item.title}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
