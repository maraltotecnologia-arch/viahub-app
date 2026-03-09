import { LayoutDashboard, FileText, BarChart3, TrendingUp, Users, Settings, LogOut, Building2, Shield, Bell, Target, Percent, CreditCard, MessageCircle, Sparkles } from "lucide-react";
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
  const { isDark } = useTheme();
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
    `flex items-center ${collapsed ? "justify-center px-0 py-1.5" : "gap-3 px-3 py-1.5"} rounded-lg text-sm transition-all duration-150 ${
      isActive
        ? "text-white font-semibold bg-[color:var(--accent-primary)]/30"
        : isDark ? "text-white/70 hover:bg-white/10 hover:text-white" : "text-white/80 hover:bg-white/20 hover:text-white"
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
    { title: "Inteligência Artificial", url: "/configuracoes/ia", icon: Sparkles },
  ];

  const adminItems = [
    { title: "Agências", url: "/admin/agencias", icon: Building2 },
    { title: "Mensalidades", url: "/financeiro/comissoes", icon: Percent },
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
          <item.icon className="h-4 w-4 shrink-0 opacity-80" />
          {!collapsed && <span className="flex-1">{item.title}</span>}
          {!collapsed && (item.badge ?? 0) > 0 && (
            <span className="ml-auto inline-flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold min-w-[18px] h-[18px] px-1">
              {item.badge}
            </span>
          )}
          {collapsed && (item.badge ?? 0) > 0 && (
            <span className="absolute -top-1 -right-1 inline-flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold min-w-[14px] h-[14px] px-0.5">
              {item.badge}
            </span>
          )}
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  const sectionLabel = (label: string) =>
    !collapsed ? (
      <p className="px-3 text-[10px] font-semibold uppercase tracking-[1.5px] text-white/30 mb-1 mt-1">{label}</p>
    ) : (
      <Separator className="mx-3 my-1 bg-white/[0.08]" />
    );

  return (
    <Sidebar
      collapsible="icon"
      className="md:flex [&_[data-sidebar=sidebar]]:!bg-[color:var(--bg-sidebar)] [&_[data-sidebar=sidebar]]:border-r [&_[data-sidebar=sidebar]]:border-[color:var(--border-color)]"
    >
      <SidebarContent className="flex flex-col">
        {/* Logo */}
        <div className={`border-b border-sidebar-border ${collapsed ? "py-3 flex items-center justify-center" : "p-4 pb-4"}`}>
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

        {/* Main items */}
        <SidebarGroup className="py-2 px-2">
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.filter(i => i.show).map(renderItem)}
              {/* AI Copilot shortcut */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip={collapsed ? "Copiloto IA" : undefined}>
                  <button
                    onClick={() => setAiModalOpen(true)}
                    className={`flex items-center ${collapsed ? "justify-center px-0 py-1.5" : "gap-3 px-3 py-1.5"} rounded-lg text-sm transition-all duration-150 text-amber-300/90 hover:bg-amber-400/15 hover:text-amber-200 font-medium`}
                  >
                    <Sparkles className="h-4 w-4 shrink-0" />
                    {!collapsed && <span className="flex-1">Copiloto IA ✨</span>}
                  </button>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Configurações */}
        {canAccessConfig && (
          <SidebarGroup className="py-1 px-2">
            {sectionLabel("Configurações")}
            <SidebarGroupContent>
              <SidebarMenu>
                {configItems.map(renderItem)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Administração */}
        {isSuperadmin && (
          <SidebarGroup className="py-1 px-2">
            {sectionLabel("Administração")}
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map(renderItem)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Spacer to push footer down */}
        <div className="flex-1" />
      </SidebarContent>

      {/* Footer */}
      {!collapsed && (
        <SidebarFooter>
          <div className="flex items-center border-t border-white/[0.06] bg-white/[0.04] gap-3 px-4 py-3">
            <div className="rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-primary-foreground font-semibold shrink-0 h-8 w-8 text-xs">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white/90 truncate">{nome || user?.email || "Usuário"}</p>
              <p className="text-xs text-white/50">{cargoLabel}</p>
              {nomeAgencia && (
                <p className="flex items-center gap-1 text-xs font-medium text-white/60 truncate mt-0.5" title={nomeAgencia}>
                  <Building2 className="w-3 h-3 shrink-0" />
                  {nomeAgencia}
                </p>
              )}
            </div>
            <button onClick={handleSignOut} className="text-white/40 hover:text-white/80 transition-colors shrink-0" title="Sair">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </SidebarFooter>
      )}
    </Sidebar>
    <AICopilotModal open={aiModalOpen} onOpenChange={setAiModalOpen} />
    </>
  );
}
