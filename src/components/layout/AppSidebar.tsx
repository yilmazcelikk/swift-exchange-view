import {
  LayoutDashboard,
  TrendingUp,
  UserCircle,
  History,
  Wallet,
  LogOut,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import AppLogo from "@/components/AppLogo";
import { useNavigate } from "react-router-dom";

const navItems = [
  { title: "İşlem", url: "/dashboard", icon: LayoutDashboard },
  { title: "Piyasalar", url: "/trading", icon: TrendingUp },
  { title: "Geçmiş", url: "/history", icon: History },
  { title: "Finans", url: "/finance", icon: Wallet },
  { title: "Hesabım", url: "/profile", icon: UserCircle },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = (e?: any) => {
    e?.preventDefault();
    e?.stopPropagation();
    void signOut();
    navigate("/login", { replace: true });
    window.setTimeout(() => {
      if (window.location.pathname !== "/login") {
        window.location.assign("/login");
      }
    }, 100);
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <div className="h-10 flex items-center justify-center border-b border-sidebar-border px-3">
        {!collapsed ? (
          <img src="/app-icon.png" alt="Platform" className="h-8 w-auto object-contain" />
        ) : (
          <img src="/app-icon.png" alt="Platform" className="h-7 w-7 object-cover rounded-sm" />
        )}
      </div>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className="flex items-center gap-2.5 px-3 py-1.5 rounded text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
                      activeClassName="bg-primary/10 text-primary font-medium"
                    >
                      <item.icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                      {!collapsed && <span className="text-xs font-mono uppercase tracking-wide">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLogout}
              className="flex items-center gap-2.5 px-3 py-1.5 w-full rounded text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-destructive transition-colors cursor-pointer"
            >
              <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.5} />
              {!collapsed && <span className="text-xs font-mono uppercase tracking-wide">Çıkış</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
