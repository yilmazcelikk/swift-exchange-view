import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { BottomNav } from "./BottomNav";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <div className="h-dvh flex w-full overflow-hidden bg-background">
        {/* Desktop sidebar */}
        <div className="hidden md:block">
          <AppSidebar />
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          <main className="flex-1 overflow-auto pb-14 md:pb-0 pt-[env(safe-area-inset-top)]">
          </main>
        </div>

        {/* Mobile bottom nav */}
        <BottomNav />
      </div>
    </SidebarProvider>
  );
}
