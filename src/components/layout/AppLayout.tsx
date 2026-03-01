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
      <div className="fixed inset-0 z-0 bg-gradient-to-br from-[#0F172A] via-[#1E3A8A] via-[65%] to-[#0891B2]">
        <div className="fixed -top-[150px] -left-[150px] w-[500px] h-[500px] rounded-full pointer-events-none blur-[40px]" style={{ background: "radial-gradient(circle, rgba(37,99,235,0.2) 0%, transparent 65%)" }} />
        <div className="fixed -bottom-[150px] -right-[150px] w-[450px] h-[450px] rounded-full pointer-events-none blur-[40px]" style={{ background: "radial-gradient(circle, rgba(6,182,212,0.15) 0%, transparent 65%)" }} />
        <div className="fixed top-[40%] right-[20%] w-[300px] h-[300px] rounded-full pointer-events-none blur-[60px]" style={{ background: "radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 65%)" }} />
      </div>

      <div className="min-h-screen flex w-full relative z-[1]">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 flex items-center px-4 shrink-0 sticky top-0 z-20 bg-[rgba(241,245,249,0.9)] backdrop-blur-[20px] [-webkit-backdrop-filter:blur(20px)] border-b border-[rgba(203,213,225,0.5)] max-md:bg-[#F1F5F9] max-md:backdrop-blur-none">
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
          <main className="flex-1 p-4 md:p-6 overflow-auto bg-[rgba(241,245,249,0.88)] border-l border-white/[0.15] relative z-[5] max-md:bg-[#F1F5F9] max-md:backdrop-blur-none">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
