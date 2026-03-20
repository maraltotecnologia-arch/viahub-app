import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Menu, Sun, Moon } from "lucide-react";
import useUserRole from "@/hooks/useUserRole";
import NotificacoesDropdown from "@/components/NotificacoesDropdown";
import { useTheme } from "@/contexts/ThemeContext";
import GlobalSearch from "@/components/GlobalSearch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const CARGO_BADGE_CLASSES: Record<string, string> = {
  Superadmin: "bg-purple-500/15 text-purple-600 border border-purple-500/20 dark:text-purple-400",
  Administrador: "bg-primary/15 text-primary border border-primary/20",
  Agente: "bg-emerald-500/15 text-emerald-600 border border-emerald-500/20 dark:text-emerald-400",
  Financeiro: "bg-amber-500/15 text-amber-600 border border-amber-500/20 dark:text-amber-400",
};

function CargoBadge({ cargo }: { cargo: string }) {
  const cls = CARGO_BADGE_CLASSES[cargo] || "bg-muted text-muted-foreground border border-border";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${cls}`}>
      {cargo}
    </span>
  );
}

export default function AppLayout() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isMobile = useIsMobile();
  const { nome, cargoLabel } = useUserRole();
  const displayName = nome || user?.email || "Usuário";
  const initials = displayName.slice(0, 2).toUpperCase();

  useEffect(() => {
    document.body.setAttribute("data-viahub-scope", "app");
    return () => {
      document.body.removeAttribute("data-viahub-scope");
    };
  }, []);

  return (
    <TooltipProvider delayDuration={300}>
    <SidebarProvider>
      <div
        className="min-h-screen flex w-full"
        style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}
      >
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header
            className="h-16 flex items-center px-4 shrink-0 sticky top-0 z-20 shadow-sm"
            style={{
              background: "var(--bg-header)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
            }}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <SidebarTrigger className="shrink-0">
                  {isMobile && <Menu className="h-5 w-5" />}
                </SidebarTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom">Recolher menu</TooltipContent>
            </Tooltip>
            {/* Center — Search bar */}
            <div className="flex-1 flex justify-center mx-4">
              <div className="w-full max-w-lg">
                <GlobalSearch />
              </div>
            </div>
            {/* Right — User info & actions */}
            <div className="flex items-center gap-3 shrink-0">
              {!isMobile && (
                <>
                  <span className="text-sm font-medium text-foreground">{displayName}</span>
                  {cargoLabel && <CargoBadge cargo={cargoLabel} />}
                </>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={toggleTheme}
                    className="p-2 rounded-full bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Alternar tema</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span><NotificacoesDropdown /></span>
                </TooltipTrigger>
                <TooltipContent side="bottom">Notificações</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-[hsl(var(--primary)/0.7)] flex items-center justify-center text-primary-foreground text-xs font-semibold shadow-sm cursor-default"
                  >
                    {initials}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">{displayName}</TooltipContent>
              </Tooltip>
            </div>
          </header>
          <main
            className="flex-1 flex flex-col p-4 md:p-6 overflow-auto"
            style={{ background: "var(--bg-primary)", color: "var(--text-primary)", height: "calc(100vh - 4rem)" }}
          >
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
    </TooltipProvider>
  );
}
