import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { Menu } from "lucide-react";
import useUserRole from "@/hooks/useUserRole";
import NotificacoesDropdown from "@/components/NotificacoesDropdown";

const CARGO_BADGE_CLASSES: Record<string, string> = {
  Superadmin: "bg-purple-50 text-purple-700 border border-purple-200",
  Administrador: "bg-blue-50 text-blue-700 border border-blue-200",
  Agente: "bg-green-50 text-green-700 border border-green-200",
  Financeiro: "bg-amber-50 text-amber-700 border border-amber-200",
};

function CargoBadge({ cargo }: { cargo: string }) {
  const cls = CARGO_BADGE_CLASSES[cargo] || "bg-muted text-muted-foreground border border-border";
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>{cargo}</span>;
}

export default function AppLayout() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { nome, cargoLabel } = useUserRole();
  const displayName = nome || user?.email || "Usuário";
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <SidebarProvider>
      {/* Fixed gradient background */}
      <div className="fixed inset-0 z-0 bg-gradient-to-br from-[#0F172A] via-[#1E3A8A] to-[#0F172A]">
        <div className="fixed -top-[200px] -left-[200px] w-[600px] h-[600px] rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(37,99,235,0.15) 0%, transparent 70%)" }} />
        <div className="fixed -bottom-[200px] -right-[200px] w-[500px] h-[500px] rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(6,182,212,0.1) 0%, transparent 70%)" }} />
      </div>

      <div className="min-h-screen flex w-full relative z-[1]">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 flex items-center px-4 shrink-0 sticky top-0 z-20 bg-[rgba(248,250,252,0.85)] backdrop-blur-[16px] [-webkit-backdrop-filter:blur(16px)] border-b border-white/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)] md:bg-[rgba(248,250,252,0.85)] max-md:bg-[#F8FAFC] max-md:backdrop-blur-none">
            <SidebarTrigger className="shrink-0">
              {isMobile && <Menu className="h-5 w-5" />}
            </SidebarTrigger>
            <div className="ml-auto flex items-center gap-3">
              {!isMobile && (
                <>
                  <span className="text-sm font-medium">{displayName}</span>
                  {cargoLabel && <CargoBadge cargo={cargoLabel} />}
                </>
              )}
              <NotificacoesDropdown />
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-primary-foreground text-xs font-semibold shadow-sm">
                {initials}
              </div>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6 overflow-auto bg-[rgba(248,250,252,0.92)] md:bg-[rgba(248,250,252,0.92)] max-md:bg-[#F8FAFC] max-md:backdrop-blur-none relative z-[5]">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
