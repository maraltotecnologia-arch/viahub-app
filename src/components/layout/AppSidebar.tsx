import { LayoutDashboard, FileText, BarChart3, TrendingUp, Users, Settings, LogOut, ChevronDown, Building2, Shield, Bell, Target, Percent } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/integrations/supabase/client";
import useUserRole from "@/hooks/useUserRole";
import useAgenciaId from "@/hooks/useAgenciaId";
import useAlertas from "@/hooks/useAlertas";
import { useQuery } from "@tanstack/react-query";

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { isDark } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isSuperadmin, isFinanceiro, canAccessConfig, canAccessRelatorios, cargoLabel, nome } = useUserRole();
  const agenciaId = useAgenciaId();
  const { data: alertas } = useAlertas(isSuperadmin ? null : agenciaId);

  // Count notifications sent in the last 7 days for superadmin badge
  const { data: recentNotifCount } = useQuery({
    queryKey: ["admin-notif-count-7d"],
    enabled: isSuperadmin,
    refetchInterval: 5 * 60 * 1000,
    queryFn: async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { count, error } = await supabase
        .from("notificacoes_sistema")
        .select("*", { count: "exact", head: true })
        .gte("criado_em", sevenDaysAgo.toISOString());
      if (error) throw error;
      return count || 0;
    },
  });

  const initials = nome ? nome.slice(0, 2).toUpperCase() : user?.email ? user.email.slice(0, 2).toUpperCase() : "??";

  const mainItems = [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, show: true, badge: alertas?.total || 0 },
    { title: "Orçamentos", url: "/orcamentos", icon: FileText, show: true },
    { title: "Pipeline", url: "/pipeline", icon: BarChart3, show: !isFinanceiro, badge: 0 },
    { title: "Metas", url: "/metas", icon: Target, show: !isSuperadmin && (canAccessConfig || !isFinanceiro), badge: 0 },
    { title: "Relatórios", url: "/relatorios", icon: TrendingUp, show: canAccessRelatorios, badge: 0 },
    { title: "Receita Operacional", url: "/financeiro/comissoes", icon: Percent, show: !isSuperadmin && (canAccessConfig || isFinanceiro), badge: 0 },
    { title: "Clientes", url: "/clientes", icon: Users, show: !isFinanceiro, badge: 0 },
  ];

  const configItems = [
    { title: "Markup", url: "/configuracoes/markup", icon: Settings },
    { title: "Agência", url: "/configuracoes/agencia", icon: Building2 },
    { title: "Usuários", url: "/configuracoes/usuarios", icon: Users },
    { title: "Templates", url: "/configuracoes/templates", icon: FileText },
  ];

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  const navLinkCls = (isActive: boolean) =>
    `flex items-center ${collapsed ? "justify-start pl-5 pr-0 py-2.5" : "gap-3 px-4 py-2.5"} rounded-[10px] text-sm transition-all duration-150 ${
      isActive
        ? "text-white font-semibold bg-[color:var(--accent-primary)]/30"
        : `${isDark ? "text-white/70 hover:bg-white/10 hover:text-white" : "text-white/80 hover:bg-white/20 hover:text-white"}`
    }`;

  const navLinkClsInset = (isActive: boolean) =>
    `flex items-center ${collapsed ? "justify-start pl-5 pr-0 py-2.5" : "gap-3 pl-10 pr-3 py-2"} rounded-[10px] text-sm transition-all duration-150 ${
      isActive
        ? "text-white font-semibold bg-[color:var(--accent-primary)]/30"
        : `${isDark ? "text-white/70 hover:bg-white/10" : "text-white/80 hover:bg-white/20"}`
    }`;

  return (
    <Sidebar
      collapsible="icon"
      className="md:flex [&_[data-sidebar=sidebar]]:!bg-[color:var(--bg-sidebar)] [&_[data-sidebar=sidebar]]:border-r [&_[data-sidebar=sidebar]]:border-[color:var(--border-color)]"
    >
      <SidebarContent>
        <div className={`border-b border-sidebar-border ${collapsed ? "py-3 pl-4 pr-2 flex items-center justify-start" : "p-4 pb-5"}`}>
          {collapsed ? (
            <span className="text-base font-extrabold tracking-tight">
              <span className="text-sidebar-primary">V</span>
              <span className="text-sidebar-accent-foreground">H</span>
            </span>
          ) : (
            <>
              <h1 className="text-xl font-extrabold tracking-tight">
                <span className="text-sidebar-primary">Via</span>
                <span className="text-sidebar-accent-foreground">Hub</span>
              </h1>
              <p className="text-[10px] text-white/[0.35] mt-0.5 tracking-wide uppercase">
                O ecossistema da sua agência
              </p>
            </>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.filter(i => i.show).map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      title={collapsed ? item.title : undefined}
                      className={({ isActive }) =>
                        `${navLinkCls(isActive)} ${collapsed ? "relative" : ""}`
                      }
                    >
                      <item.icon className="h-5 w-5 shrink-0 opacity-80" />
                      {!collapsed && <span className="flex-1">{item.title}</span>}
                      {!collapsed && item.badge > 0 && (
                        <span className="ml-auto inline-flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold min-w-[18px] h-[18px] px-1">
                          {item.badge}
                        </span>
                      )}
                      {collapsed && item.badge > 0 && (
                        <span className="absolute -top-1 -right-1 inline-flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold min-w-[14px] h-[14px] px-0.5">
                          {item.badge}
                        </span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {canAccessConfig && (
          <SidebarGroup>
            {collapsed ? (
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/configuracoes/markup"
                      title="Configurações"
                      className={({ isActive }) => navLinkCls(isActive)}
                    >
                      <Settings className="h-5 w-5 shrink-0 opacity-80" />
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            ) : (
              <Collapsible defaultOpen={location.pathname.startsWith("/configuracoes")}>
                <CollapsibleTrigger
                  className={`flex items-center gap-3 px-4 py-2.5 text-sm w-full rounded-[10px] transition-all duration-150 ${
                    isDark ? "text-white/30 hover:text-white/90 hover:bg-white/10" : "text-white/40 hover:text-white/95 hover:bg-white/20"
                  }`}
                >
                  <Settings className="h-5 w-5 shrink-0" />
                  <span>Configurações</span><ChevronDown className="ml-auto h-3 w-3" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {configItems.map((item) => (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton asChild>
                            <NavLink
                              to={item.url}
                              className={({ isActive }) => navLinkClsInset(isActive)}
                            >
                              <item.icon className="h-5 w-5 shrink-0" />
                              <span>{item.title}</span>
                            </NavLink>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </Collapsible>
            )}
          </SidebarGroup>
        )}

        {isSuperadmin && (
          <SidebarGroup>
            {!collapsed && (
              <div className="px-3 py-2">
                <Separator className="mb-2 bg-white/[0.08]" />
                <p className={`text-[10px] uppercase tracking-[1.5px] font-semibold flex items-center gap-1.5 mt-4 mb-1 px-4 pt-4 pb-1 ${isDark ? "text-white/30" : "text-white/40"}`}>
                  <Shield className="h-3 w-3" /> Administração
                </p>
              </div>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/admin/agencias"
                      title={collapsed ? "Agências" : undefined}
                      className={({ isActive }) =>
                        navLinkCls(isActive)
                      }
                    >
                      <Building2 className="h-5 w-5 shrink-0" />
                      {!collapsed && <span>Agências</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/admin/notificacoes"
                      title={collapsed ? "Notificações" : undefined}
                      className={({ isActive }) =>
                        `${navLinkCls(isActive)} ${collapsed ? "relative" : ""}`
                      }
                    >
                      <Bell className="h-5 w-5 shrink-0" />
                      {!collapsed && <span className="flex-1">Notificações</span>}
                      {!collapsed && (recentNotifCount ?? 0) > 0 && (
                        <span className="ml-auto inline-flex items-center justify-center rounded-full bg-blue-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] px-1">
                          {recentNotifCount}
                        </span>
                      )}
                      {collapsed && (recentNotifCount ?? 0) > 0 && (
                        <span className="absolute -top-1 -right-1 inline-flex items-center justify-center rounded-full bg-blue-500 text-white text-[9px] font-bold min-w-[14px] h-[14px] px-0.5">
                          {recentNotifCount}
                        </span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      {!collapsed && (
        <SidebarFooter>
          <div className="flex items-center border-t border-white/[0.06] bg-white/[0.04] gap-3 px-4 py-3">
            <div className="rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-primary-foreground font-semibold shrink-0 h-8 w-8 text-xs">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium truncate ${isDark ? "text-white/80" : "text-white/90"}`}>{nome || user?.email || "Usuário"}</p>
              <p className="text-xs text-white/40">{cargoLabel}</p>
            </div>
            <button onClick={handleSignOut} className="text-white/40 hover:text-white/80 transition-colors shrink-0" title="Sair">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
