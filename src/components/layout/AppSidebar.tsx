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

    // Hard redirect fallback in case router state is stale
    window.setTimeout(() => {
      if (window.location.pathname !== "/login") {
        window.location.assign("/login");
      }
    }, 100);
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <div className="h-14 flex items-center justify-center border-b border-sidebar-border px-3">
        {!collapsed ? (
          <img src="/tacirler-logo.png" alt="Tacirler Yatırım" className="h-10 w-auto object-contain" />
        ) : (
          <img src="/tacirler-logo.png" alt="Tacirler" className="h-8 w-8 object-cover rounded" />
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
                      className="flex items-center gap-3 px-3 py-2 rounded-md text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
                      activeClassName="bg-primary/10 text-primary font-medium"
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      {!collapsed && <span className="text-sm">{item.title}</span>}
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
              className="flex items-center gap-3 px-3 py-2 w-full rounded-md text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-destructive transition-colors cursor-pointer"
            >
              <LogOut className="h-5 w-5 shrink-0" />
              {!collapsed && <span className="text-sm">Çıkış Yap</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
