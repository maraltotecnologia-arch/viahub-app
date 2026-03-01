import { LayoutDashboard, FileText, BarChart3, TrendingUp, Users, Settings, LogOut, ChevronDown, Building2, Shield } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import useUserRole from "@/hooks/useUserRole";
import useAgenciaId from "@/hooks/useAgenciaId";
import useAlertas from "@/hooks/useAlertas";

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isSuperadmin, isFinanceiro, canAccessConfig, canAccessRelatorios, cargoLabel, nome } = useUserRole();
  const agenciaId = useAgenciaId();
  const { data: alertas } = useAlertas(isSuperadmin ? null : agenciaId);

  const initials = nome ? nome.slice(0, 2).toUpperCase() : user?.email ? user.email.slice(0, 2).toUpperCase() : "??";

  const mainItems = [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, show: true, badge: alertas?.total || 0 },
    { title: "Orçamentos", url: "/orcamentos", icon: FileText, show: true },
    { title: "Pipeline", url: "/pipeline", icon: BarChart3, show: !isFinanceiro, badge: 0 },
    { title: "Relatórios", url: "/relatorios", icon: TrendingUp, show: canAccessRelatorios, badge: 0 },
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

  return (
    <Sidebar collapsible="icon" className="md:flex [&_[data-sidebar=sidebar]]:!bg-[rgba(15,23,42,0.75)] [&_[data-sidebar=sidebar]]:backdrop-blur-[20px] [&_[data-sidebar=sidebar]]:[-webkit-backdrop-filter:blur(20px)] [&_[data-sidebar=sidebar]]:border-r [&_[data-sidebar=sidebar]]:border-white/[0.08] [&_[data-sidebar=sidebar]]:shadow-[4px_0_24px_rgba(0,0,0,0.2)] max-md:[&_[data-sidebar=sidebar]]:!bg-[#0F172A] max-md:[&_[data-sidebar=sidebar]]:backdrop-blur-none">
      <SidebarContent>
        <div className="p-4 pb-5 border-b border-sidebar-border">
          <h1 className="text-xl font-extrabold tracking-tight">
            <span className="text-sidebar-primary">Via</span>
            <span className="text-sidebar-accent-foreground">Hub</span>
          </h1>
          {!collapsed && (
            <p className="text-[10px] text-white/[0.35] mt-0.5 tracking-wide uppercase">
              O ecossistema da sua agência
            </p>
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
                      className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-sm transition-all duration-150 ${
                          isActive ? "bg-[rgba(37,99,235,0.5)] border border-[rgba(37,99,235,0.6)] backdrop-blur-[10px] text-white font-semibold shadow-[0_4px_12px_rgba(37,99,235,0.3)]" : "text-white/75 hover:bg-white/[0.08] hover:text-white/95"
                        }`
                      }
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span className="flex-1">{item.title}</span>}
                      {item.badge > 0 && (
                        <span className="ml-auto inline-flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold min-w-[18px] h-[18px] px-1">
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
            <Collapsible defaultOpen={location.pathname.startsWith("/configuracoes")}>
              <CollapsibleTrigger className="flex items-center gap-3 px-3 py-2.5 text-sm text-white/[0.35] hover:text-white/95 w-full rounded-[10px] hover:bg-white/[0.08] transition-all duration-150">
                <Settings className="h-4 w-4 shrink-0" />
                {!collapsed && (<><span>Configurações</span><ChevronDown className="ml-auto h-3 w-3" /></>)}
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {configItems.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild>
                          <NavLink
                            to={item.url}
                            className={({ isActive }) =>
                              `flex items-center gap-3 pl-10 pr-3 py-2 rounded-[10px] text-sm transition-all duration-150 ${
                                isActive ? "bg-white/[0.08] text-white font-semibold" : "text-white/75 hover:bg-white/[0.05]"
                              }`
                            }
                          >
                            <item.icon className="h-3.5 w-3.5 shrink-0" />
                            {!collapsed && <span>{item.title}</span>}
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroup>
        )}

        {isSuperadmin && (
          <SidebarGroup>
            <div className="px-3 py-2">
              <Separator className="mb-2 bg-white/[0.08]" />
              <p className="text-[10px] text-white/[0.35] uppercase tracking-[1px] font-semibold flex items-center gap-1.5 mt-4 mb-1">
                <Shield className="h-3 w-3" /> Administração
              </p>
            </div>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/admin/agencias"
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-sm transition-all duration-150 ${
                          isActive ? "bg-[rgba(37,99,235,0.5)] border border-[rgba(37,99,235,0.6)] backdrop-blur-[10px] text-white font-semibold shadow-[0_4px_12px_rgba(37,99,235,0.3)]" : "text-white/75 hover:bg-white/[0.08] hover:text-white/95"
                        }`
                      }
                    >
                      <Building2 className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>Agências</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <div className="flex items-center gap-3 px-3 py-3 border-t border-white/[0.08] bg-white/[0.05]">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-primary-foreground text-xs font-semibold shrink-0">
            {initials}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white/95 truncate">{nome || user?.email || "Usuário"}</p>
              <p className="text-xs text-white/50">{cargoLabel}</p>
            </div>
          )}
          <button onClick={handleSignOut} className="text-white/50 hover:text-white/95 transition-colors shrink-0" title="Sair">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
