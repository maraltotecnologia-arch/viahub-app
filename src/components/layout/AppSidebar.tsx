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
    [
      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors duration-150",
      collapsed ? "justify-center mx-2 px-2" : "mx-3",
      isActive
        ? "font-semibold text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/50"
        : "font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100",
    ].join(" ");

  const iconCls = (isActive: boolean) =>
    [
      "h-4 w-4 shrink-0",
      isActive
        ? "text-blue-600 dark:text-blue-400"
        : "text-gray-400 dark:text-gray-500",
    ].join(" ");

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

  const renderItem = (item: { title: string; url: string; icon: any; badge?: number; onClick?: () => void; proBadge?: boolean }) => (
    <SidebarMenuItem key={item.title}>
      <SidebarMenuButton asChild tooltip={collapsed ? item.title : undefined}>
        {item.onClick ? (
          <button
            onClick={item.onClick}
            title={collapsed ? item.title : undefined}
            className={`${navCls(false)} ${collapsed ? "relative" : ""} w-full text-left`}
          >
            <item.icon className={iconCls(false)} strokeWidth={1.5} />
            {!collapsed && (
              <span className="flex-1 flex items-center gap-2">
                {item.title}
                {item.proBadge && (
                  <span className="ml-auto text-[10px] font-bold px-2 py-0.5 bg-blue-600 text-white rounded-full">PRO</span>
                )}
              </span>
            )}
          </button>
        ) : (
          <NavLink
            to={item.url}
            title={collapsed ? item.title : undefined}
            className={({ isActive }) => `${navCls(isActive)} ${collapsed ? "relative" : ""}`}
          >
            {({ isActive }) => (
              <>
                <item.icon className={iconCls(isActive)} strokeWidth={isActive ? 2 : 1.5} />
                {!collapsed && <span className="flex-1">{item.title}</span>}
                {!collapsed && (item.badge ?? 0) > 0 && (
                  <span className="ml-auto inline-flex items-center justify-center rounded-full bg-destructive text-white text-[10px] font-bold min-w-[18px] h-[18px] px-1">
                    {item.badge}
                  </span>
                )}
                {collapsed && (item.badge ?? 0) > 0 && (
                  <span className="absolute -top-1 -right-1 inline-flex items-center justify-center rounded-full bg-destructive text-white text-[9px] font-bold min-w-[14px] h-[14px] px-0.5">
                    {item.badge}
                  </span>
                )}
              </>
            )}
          </NavLink>
        )}
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  const sectionLabel = (label: string) =>
    !collapsed ? (
      <p className="px-2 pt-5 pb-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider dark:text-gray-600 mx-3">
        {label}
      </p>
    ) : (
      <Separator className="mx-3 my-2 bg-gray-100 dark:bg-gray-800" />
    );

  return (
    <>
    <Sidebar
      collapsible="icon"
      className="md:flex [&_[data-sidebar=sidebar]]:bg-white [&_[data-sidebar=sidebar]]:border-r [&_[data-sidebar=sidebar]]:border-gray-100 dark:[&_[data-sidebar=sidebar]]:bg-gray-900 dark:[&_[data-sidebar=sidebar]]:border-gray-800"
    >
      <SidebarContent className="flex flex-col overflow-y-auto">
        {/* Logo */}
        <div className={`${collapsed ? "py-3 flex items-center justify-center" : "px-4 pt-5 pb-4"}`}>
          {collapsed ? (
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
              <span className="text-sm font-bold text-white">VH</span>
            </div>
          ) : (
            <div className="flex items-center gap-3 px-2 py-2 mb-2">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-white">VH</span>
              </div>
              <div>
                <span className="text-base font-bold text-gray-900 leading-tight block dark:text-white">ViaHub</span>
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider leading-tight block dark:text-gray-500">
                  O ecossistema da sua agência
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Main items */}
        <SidebarGroup className="py-0 px-0">
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {mainItems.filter(i => i.show).map(renderItem)}
              {/* AI Copilot shortcut */}
              {renderItem({ title: "Assistente IA", url: "#", icon: Bot, onClick: () => setAiModalOpen(true), proBadge: true })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Configurações */}
        {canAccessConfig && (
          <SidebarGroup className="py-0 px-0">
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
          <SidebarGroup className="py-0 px-0">
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
          <SidebarGroup className="py-1 px-0 mt-auto border-t border-gray-100 dark:border-gray-800">
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip={collapsed ? "Ajuda & Suporte" : undefined}>
                    <NavLink
                      to="/suporte"
                      title={collapsed ? "Ajuda & Suporte" : undefined}
                      className={({ isActive }) => `${navCls(isActive)} ${collapsed ? "relative" : ""}`}
                    >
                      {({ isActive }) => (
                        <>
                          <LifeBuoy className={iconCls(isActive)} strokeWidth={isActive ? 2 : 1.5} />
                          {!collapsed && <span className="flex-1">Ajuda & Suporte</span>}
                        </>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* Footer */}
      {!collapsed ? (
        <SidebarFooter className="p-0">
          <div className="mt-auto border-t border-gray-100 dark:border-gray-800 p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center shrink-0">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate dark:text-white">
                  {nome || user?.email || "Usuário"}
                </p>
                <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
                  {cargoLabel}
                </p>
                {nomeAgencia && (
                  <p className="flex items-center gap-1 text-xs text-gray-400 truncate mt-0.5 dark:text-gray-500" title={nomeAgencia}>
                    <Building2 className="w-3 h-3 shrink-0" />
                    {nomeAgencia}
                  </p>
                )}
              </div>
              <button
                onClick={handleSignOut}
                className="p-1.5 rounded-lg ml-auto text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors dark:hover:bg-gray-800 dark:hover:text-gray-200"
                title="Sair"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </SidebarFooter>
      ) : (
        <SidebarFooter className="p-0">
          <div className="flex justify-center py-3 border-t border-gray-100 dark:border-gray-800">
            <button
              onClick={handleSignOut}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors dark:hover:bg-gray-800 dark:hover:text-gray-200"
              title="Sair"
            >
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
