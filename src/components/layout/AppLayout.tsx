import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { BottomNav } from "./BottomNav";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <SidebarProvider className="!min-h-0 h-full">
      <div className="app-layout h-full flex w-full overflow-hidden bg-background">
        {/* Desktop sidebar */}
        <div className="hidden md:block">
          <AppSidebar />
        </div>

        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <main className="flex-1 h-0 overflow-y-auto overflow-x-hidden md:pb-0 pt-[env(safe-area-inset-top)]" style={{ paddingBottom: 'calc(3.5rem + var(--app-safe-bottom))' }}>
            {children}
          </main>
        </div>

        {/* Mobile bottom nav */}
        <BottomNav />
      </div>
    </SidebarProvider>
  );
}
