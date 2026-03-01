import { LayoutDashboard, FileText, BarChart3, TrendingUp, Users, Settings, LogOut, ChevronDown, Building2, Shield, UserCog } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
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
  const { isSuperadmin, isAdmin, isFinanceiro, canAccessConfig, canAccessRelatorios, cargoLabel, nome } = useUserRole();
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
    { title: "Markup", url: "/configuracoes/markup" },
    { title: "Agência", url: "/configuracoes/agencia" },
    { title: "Usuários", url: "/configuracoes/usuarios" },
    { title: "📋 Templates", url: "/configuracoes/templates" },
  ];

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  return (
    <Sidebar collapsible="icon" className="md:flex">
      <SidebarContent>
        <div className="p-4 pb-6">
          <h1 className="text-xl font-extrabold tracking-tight">
            <span className="text-sidebar-primary">Via</span>
            <span className="text-sidebar-accent-foreground">Hub</span>
          </h1>
          {!collapsed && (
            <p className="text-[10px] text-sidebar-foreground/50 mt-0.5 tracking-wide uppercase">
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
                        `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                          isActive ? "bg-sidebar-accent text-sidebar-primary font-semibold" : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
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
              <CollapsibleTrigger className="flex items-center gap-3 px-3 py-2 text-sm text-sidebar-foreground/70 hover:text-sidebar-accent-foreground w-full rounded-lg hover:bg-sidebar-accent/50 transition-colors">
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
                              `flex items-center gap-3 pl-10 pr-3 py-2 rounded-lg text-sm transition-colors ${
                                isActive ? "bg-sidebar-accent text-sidebar-primary font-semibold" : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                              }`
                            }
                          >
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
              <Separator className="mb-2" />
              <p className="text-[10px] text-sidebar-foreground/50 uppercase tracking-wider font-semibold flex items-center gap-1.5">
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
                        `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                          isActive ? "bg-sidebar-accent text-sidebar-primary font-semibold" : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
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
        <div className="flex items-center gap-3 px-3 py-3 border-t border-sidebar-border">
          <div className="h-8 w-8 rounded-full bg-sidebar-primary/20 flex items-center justify-center text-sidebar-primary text-xs font-bold shrink-0">
            {initials}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-accent-foreground truncate">{nome || user?.email || "Usuário"}</p>
              <p className="text-xs text-sidebar-foreground/50">{cargoLabel}</p>
            </div>
          )}
          <button onClick={handleSignOut} className="text-sidebar-foreground/50 hover:text-sidebar-accent-foreground transition-colors shrink-0" title="Sair">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
