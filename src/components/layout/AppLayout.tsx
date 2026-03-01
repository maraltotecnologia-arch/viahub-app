import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { Menu } from "lucide-react";

export default function AppLayout() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : "??";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center border-b px-4 bg-background shrink-0">
            <SidebarTrigger className="shrink-0">
              {isMobile && <Menu className="h-5 w-5" />}
            </SidebarTrigger>
            <div className="ml-auto flex items-center gap-3">
              {!isMobile && <span className="text-sm font-medium">Agência</span>}
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                {initials}
              </div>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6 overflow-auto bg-muted/30">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
