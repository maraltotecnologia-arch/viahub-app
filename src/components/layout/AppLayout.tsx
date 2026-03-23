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
  Superadmin: "bg-[#7c3aed]/10 text-[#7c3aed]",
  Administrador: "bg-primary/10 text-primary",
  Agente: "bg-surface-container-highest text-on-surface-variant",
  Financeiro: "bg-surface-container-highest text-on-surface-variant",
};

function CargoBadge({ cargo }: { cargo: string }) {
  const cls = CARGO_BADGE_CLASSES[cargo] || "bg-surface-container-highest text-on-surface-variant";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold font-label ${cls}`}>
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
      <div className="min-h-screen flex w-full bg-surface text-foreground">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Header */}
          <header className="h-14 flex items-center px-5 gap-4 shrink-0 sticky top-0 z-20 bg-surface-container-lowest/80 backdrop-blur-[12px] border-b border-outline-variant/15 dark:bg-surface-container/80">
            <Tooltip>
              <TooltipTrigger asChild>
                <SidebarTrigger className="shrink-0 p-2 rounded-xl hover:bg-surface-container-high text-on-surface-variant transition-colors">
                  {isMobile && <Menu className="h-5 w-5" />}
                </SidebarTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom">Recolher menu</TooltipContent>
            </Tooltip>

            <div className="flex-1" />

            {/* Right — actions */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Search */}
              <div className="hidden sm:block max-w-xs w-full">
                <GlobalSearch />
              </div>
              <div className="sm:hidden">
                <GlobalSearch />
              </div>

              {/* Theme toggle */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={toggleTheme}
                    className="p-2 rounded-xl hover:bg-surface-container-high text-on-surface-variant transition-colors"
                  >
                    {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Alternar tema</TooltipContent>
              </Tooltip>

              {/* Notifications */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <span><NotificacoesDropdown /></span>
                </TooltipTrigger>
                <TooltipContent side="bottom">Notificações</TooltipContent>
              </Tooltip>

              {/* Divider */}
              <div className="hidden sm:block w-px h-5 bg-outline-variant/40" />

              {/* Avatar + name */}
              <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-surface-container-high cursor-default transition-colors">
                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary to-primary-container flex items-center justify-center text-white text-xs font-bold">
                  {initials}
                </div>
                {!isMobile && (
                  <>
                    <span className="text-sm font-medium text-on-surface">{displayName}</span>
                    {cargoLabel && <CargoBadge cargo={cargoLabel} />}
                  </>
                )}
              </div>
            </div>
          </header>

          {/* Main content */}
          <main className="flex-1 flex flex-col overflow-auto bg-surface" style={{ height: "calc(100vh - 3.5rem)" }}>
            <div className="max-w-[1400px] mx-auto w-full px-6 sm:px-8 py-8 flex-1">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
    </TooltipProvider>
  );
}
