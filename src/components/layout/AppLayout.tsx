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
  Superadmin: "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  Administrador: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  Agente: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
  Financeiro: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
};

function CargoBadge({ cargo }: { cargo: string }) {
  const cls = CARGO_BADGE_CLASSES[cargo] || "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
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
      <div className="min-h-screen flex w-full bg-gray-50 dark:bg-gray-950 text-foreground">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center px-4 sm:px-6 shrink-0 sticky top-0 z-20 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
            <Tooltip>
              <TooltipTrigger asChild>
                <SidebarTrigger className="shrink-0 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
                  {isMobile && <Menu className="h-5 w-5" />}
                </SidebarTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom">Recolher menu</TooltipContent>
            </Tooltip>

            <div className="flex-1" />

            {/* Right — actions */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Search */}
              <div className="hidden sm:block w-64">
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
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors"
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
              <div className="hidden sm:block w-px h-6 bg-gray-200 dark:bg-gray-700" />

              {/* Avatar + name */}
              <div className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-default">
                <div className="h-7 w-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                  {initials}
                </div>
                {!isMobile && (
                  <>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{displayName}</span>
                    {cargoLabel && <CargoBadge cargo={cargoLabel} />}
                  </>
                )}
              </div>
            </div>
          </header>
          <main className="flex-1 flex flex-col overflow-auto bg-gray-50 dark:bg-gray-950" style={{ height: "calc(100vh - 3.5rem)" }}>
            <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 flex-1">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
    </TooltipProvider>
  );
}
