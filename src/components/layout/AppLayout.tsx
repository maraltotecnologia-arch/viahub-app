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
  Superadmin: "bg-purple-50 text-purple-700 border border-purple-200",
  Administrador: "bg-blue-50 text-blue-700 border border-blue-200",
  Agente: "bg-green-50 text-green-700 border border-green-200",
  Financeiro: "bg-amber-50 text-amber-700 border border-amber-200",
};

function CargoBadge({ cargo }: { cargo: string }) {
  const { isDark } = useTheme();
  const cls = CARGO_BADGE_CLASSES[cargo] || "bg-muted text-muted-foreground border border-border";
  const darkStyleByCargo: Record<string, React.CSSProperties> = {
    Superadmin: { background: "rgba(139,92,246,0.25)", color: "#C4B5FD", border: "1px solid rgba(139,92,246,0.4)" },
    Administrador: { background: "rgba(37,99,235,0.25)", color: "#93C5FD", border: "1px solid rgba(37,99,235,0.4)" },
    Agente: { background: "rgba(16,185,129,0.25)", color: "#6EE7B7", border: "1px solid rgba(16,185,129,0.4)" },
    Financeiro: { background: "rgba(245,158,11,0.22)", color: "#FCD34D", border: "1px solid rgba(245,158,11,0.4)" },
  };
  const style = isDark ? (darkStyleByCargo[cargo] ?? { background: "rgba(100,116,139,0.25)", color: "#CBD5E1", border: "1px solid rgba(100,116,139,0.4)" }) : undefined;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${!isDark ? cls : ""}`}
      style={style}
    >
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
            className="h-16 flex items-center px-4 shrink-0 sticky top-0 z-20 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
            style={{
              background: "var(--bg-header)",
              borderBottom: "1px solid var(--border-color)",
              backdropFilter: "blur(12px)",
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
            <div className="ml-auto flex items-center gap-3">
              <GlobalSearch />
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
                    className="p-2 rounded-lg transition-all duration-200"
                    style={{
                      background: "var(--bg-hover)",
                      color: "var(--text-secondary)",
                      border: "1px solid var(--border-color)",
                    }}
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
                    className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-primary-foreground text-xs font-semibold shadow-sm cursor-default"
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
