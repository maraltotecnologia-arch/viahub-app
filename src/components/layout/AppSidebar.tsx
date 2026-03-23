import { LayoutDashboard, FileText, BarChart3, TrendingUp, Users, Settings, LogOut, Building2, Shield, Bell, Target, Percent, CreditCard, MessageCircle, Bot, LifeBuoy } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import AICopilotModal from "@/components/ai/AICopilotModal";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/integrations/supabase/client";
import useUserRole from "@/hooks/useUserRole";
import useAgenciaId from "@/hooks/useAgenciaId";
import useAlertas from "@/hooks/useAlertas";
import { useQuery } from "@tanstack/react-query";

export function AppSidebar() {
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isSuperadmin, isFinanceiro, canAccessConfig, canAccessRelatorios, cargoLabel, nome } = useUserRole();
  const agenciaId = useAgenciaId();
  const { data: alertas } = useAlertas(isSuperadmin ? null : agenciaId);

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

  const { data: agenciaInfo } = useQuery({
    queryKey: ["agencia-nome", agenciaId],
    enabled: !!agenciaId && !isSuperadmin,
    queryFn: async () => {
      const { data } = await supabase
        .from("agencias")
        .select("nome_fantasia")
        .eq("id", agenciaId!)
        .single();
      return data;
    },
  });

  const nomeAgencia = isSuperadmin ? "ViaHub Admin" : agenciaInfo?.nome_fantasia || "";
  const initials = nome ? nome.slice(0, 2).toUpperCase() : user?.email ? user.email.slice(0, 2).toUpperCase() : "??";

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  const navCls = (isActive: boolean) =>
    `flex items-center ${collapsed ? "justify-center px-0 py-1.5" : "gap-3 mx-3 px-3 py-2.5"} rounded-xl text-sm transition-all duration-150 ${
      isActive
        ? "bg-primary/10 text-primary font-semibold border-l-2 border-primary"
        : "text-sidebar-foreground/70 font-medium hover:bg-sidebar-accent hover:text-sidebar-foreground"
    }`;

  const mainItems = [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, show: true, badge: alertas?.total || 0 },
    { title: "Orçamentos", url: "/orcamentos", icon: FileText, show: true },
    { title: "Pipeline", url: "/pipeline", icon: BarChart3, show: !isFinanceiro },
    { title: "Relatórios", url: "/relatorios", icon: TrendingUp, show: canAccessRelatorios },
    { title: "Clientes", url: "/clientes", icon: Users, show: !isFinanceiro },
    { title: "Metas", url: "/metas", icon: Target, show: !isSuperadmin && (canAccessConfig || !isFinanceiro) },
  ];

  const configItems = [
    { title: "Markup", url: "/configuracoes/markup", icon: Settings },
    { title: "Agência", url: "/configuracoes/agencia", icon: Building2 },
    { title: "Assinatura", url: "/configuracoes/assinatura", icon: CreditCard },
    { title: "Usuários", url: "/configuracoes/usuarios", icon: Users },
    { title: "Templates", url: "/configuracoes/templates", icon: FileText },
    { title: "WhatsApp", url: "/configuracoes/whatsapp", icon: MessageCircle },
    { title: "Inteligência Artificial", url: "/configuracoes/ia", icon: Bot },
  ];

  const adminItems = [
    { title: "Agências", url: "/admin/agencias", icon: Building2 },
    { title: "Mensalidades", url: "/financeiro/comissoes", icon: Percent },
    { title: "Chamados", url: "/admin/chamados", icon: LifeBuoy },
    { title: "Notificações", url: "/admin/notificacoes", icon: Bell, badge: recentNotifCount ?? 0 },
  ];

  const renderItem = (item: { title: string; url: string; icon: any; badge?: number }) => (
    <SidebarMenuItem key={item.title}>
      <SidebarMenuButton asChild tooltip={collapsed ? item.title : undefined}>
        <NavLink
          to={item.url}
          title={collapsed ? item.title : undefined}
          className={({ isActive }) => `${navCls(isActive)} ${collapsed ? "relative" : ""}`}
        >
          <item.icon className={`h-4 w-4 shrink-0`} />
          {!collapsed && <span className="flex-1">{item.title}</span>}
          {!collapsed && (item.badge ?? 0) > 0 && (
            <span className="ml-auto inline-flex items-center justify-center rounded-full bg-gradient-to-br from-error to-error text-white text-[10px] font-bold min-w-[18px] h-[18px] px-1">
              {item.badge}
            </span>
          )}
          {collapsed && (item.badge ?? 0) > 0 && (
            <span className="absolute -top-1 -right-1 inline-flex items-center justify-center rounded-full bg-gradient-to-br from-error to-error text-white text-[9px] font-bold min-w-[14px] h-[14px] px-0.5">
              {item.badge}
            </span>
          )}
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  const sectionLabel = (label: string) =>
    !collapsed ? (
      <p className="px-4 pt-6 pb-1.5 text-[10px] font-bold font-label text-sidebar-foreground/40 uppercase tracking-widest">{label}</p>
    ) : (
      <Separator className="mx-3 my-1 bg-sidebar-border" />
    );

  return (
    <>
    <Sidebar
      collapsible="icon"
      className="md:flex [&_[data-sidebar=sidebar]]:border-r [&_[data-sidebar=sidebar]]:border-sidebar-border"
    >
      <SidebarContent className="flex flex-col">
        {/* Logo */}
        <div className={`${collapsed ? "py-3 flex items-center justify-center" : "px-5 pt-6 pb-5"}`}>
          {collapsed ? (
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary-container shadow-md shadow-primary/30 flex items-center justify-center">
              <span className="text-sm font-bold text-white">VH</span>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary-container shadow-md shadow-primary/30 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-white">VH</span>
              </div>
              <div>
                <span className="text-lg font-bold font-display tracking-tight text-sidebar-foreground block">ViaHub</span>
                <span className="text-[10px] font-semibold font-label text-sidebar-foreground/50 uppercase tracking-widest block">O ecossistema da sua agência</span>
              </div>
            </div>
          )}
        </div>

        {/* Main items */}
        <SidebarGroup className="py-2 px-0">
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {mainItems.filter(i => i.show).map(renderItem)}
              {/* AI Copilot shortcut */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip={collapsed ? "Assistente IA" : undefined}>
                  <button
                    onClick={() => setAiModalOpen(true)}
                    className={navCls(false)}
                  >
                    <Bot className="h-4 w-4 shrink-0" />
                    {!collapsed && (
                      <span className="flex-1 flex items-center gap-2">
                        Assistente IA
                        <span className="text-[9px] font-semibold font-label uppercase tracking-wide px-1.5 py-px rounded-full bg-primary/10 text-primary">Pro</span>
                      </span>
                    )}
                  </button>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Configurações */}
        {canAccessConfig && (
          <SidebarGroup className="py-1 px-0">
            {sectionLabel("Configurações")}
            <SidebarGroupContent>
              <SidebarMenu className="space-y-0.5">
                {configItems.map(renderItem)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Administração */}
        {isSuperadmin && (
          <SidebarGroup className="py-1 px-0">
            {sectionLabel("Administração")}
            <SidebarGroupContent>
              <SidebarMenu className="space-y-0.5">
                {adminItems.map(renderItem)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Ajuda e Suporte */}
        {!isSuperadmin && (
          <SidebarGroup className="py-1 px-0 mt-auto border-t border-sidebar-border">
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip={collapsed ? "Ajuda & Suporte" : undefined}>
                    <NavLink
                      to="/suporte"
                      title={collapsed ? "Ajuda & Suporte" : undefined}
                      className={({ isActive }) => `${navCls(isActive)} ${collapsed ? "relative" : ""}`}
                    >
                      <LifeBuoy className="h-4 w-4 shrink-0" />
                      {!collapsed && <span className="flex-1">Ajuda & Suporte</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* Footer */}
      {!collapsed && (
        <SidebarFooter>
          <div className="border-t border-outline-variant/15 p-4">
            <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-container-high cursor-pointer transition-colors">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary-container text-white text-sm font-bold font-display flex items-center justify-center shrink-0">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold font-headline text-on-surface truncate">{nome || user?.email || "Usuário"}</p>
                <p className="text-xs text-on-surface-variant font-label">{cargoLabel}</p>
                {nomeAgencia && (
                  <p className="flex items-center gap-1 text-xs text-on-surface-variant/60 font-label truncate mt-0.5" title={nomeAgencia}>
                    <Building2 className="w-3 h-3 shrink-0" />
                    {nomeAgencia}
                  </p>
                )}
              </div>
              <button onClick={handleSignOut} className="p-1.5 rounded-lg text-on-surface-variant/60 hover:text-error hover:bg-error-container/20 transition-colors shrink-0 ml-auto" title="Sair">
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </SidebarFooter>
      )}
    </Sidebar>
    <AICopilotModal open={aiModalOpen} onOpenChange={setAiModalOpen} />
    </>
  );
}
