import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, DollarSign, TrendingUp, TrendingDown, Percent, Building2, AlertCircle, AlertTriangle, Info, Clock, BadgeCheck, Target } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import useUserRole from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import useAlertas from "@/hooks/useAlertas";
import StatusBadge from "@/components/StatusBadge";
import { formatarApenasDatabrasilia } from "@/lib/date-utils";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const MRR_MAP: Record<string, number> = {
  starter_a: 397, starter_b: 197, pro_a: 697, pro_b: 297, agency_c: 1997,
};

const COMISSAO_MAP: Record<string, number> = {
  starter_a: 0, starter_b: 0.015, pro_a: 0, pro_b: 0.012, agency_c: 0,
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [agenciaId, setAgenciaId] = useState<string | null>(null);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [isSuperadmin, setIsSuperadmin] = useState(false);

  useEffect(() => {
    let mounted = true;
    const checkAccess = async () => {
      if (!user) { navigate("/login", { replace: true }); return; }
      try {
        const { data: perfil, error: perfilError } = await supabase
          .from("usuarios").select("agencia_id, cargo").eq("id", user.id).maybeSingle();
        if (perfilError || !perfil) { await supabase.auth.signOut(); navigate("/login", { replace: true }); return; }
        if (perfil.cargo === "superadmin") {
          if (mounted) { setIsSuperadmin(true); setAgenciaId(perfil.agencia_id ?? "__superadmin__"); }
        } else {
          if (!perfil.agencia_id) { await supabase.auth.signOut(); navigate("/login", { replace: true }); return; }
          const { data: agencia, error: agenciaError } = await supabase
            .from("agencias").select("onboarding_completo").eq("id", perfil.agencia_id).maybeSingle();
          if (agenciaError || !agencia) { await supabase.auth.signOut(); navigate("/login", { replace: true }); return; }
          if (agencia.onboarding_completo === false) { navigate("/onboarding", { replace: true }); return; }
          if (mounted) setAgenciaId(perfil.agencia_id);
        }
      } catch { await supabase.auth.signOut(); navigate("/login", { replace: true }); }
      finally { if (mounted) setCheckingAccess(false); }
    };
    checkAccess();
    return () => { mounted = false; };
  }, [user, navigate]);

  if (checkingAccess) return (
    <div className="space-y-6 animate-fade-in-up">
      <Skeleton className="h-8 w-40" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
      </div>
    </div>
  );

  if (isSuperadmin) return <SuperadminDashboard />;
  return <AgencyDashboard agenciaId={agenciaId!} />;
}

/* ===== METRIC CARD ===== */
function MetricCard({ title, value, icon: Icon, iconBg, isLoading, subtitle }: {
  title: string; value: string; icon: any; iconBg: string; isLoading?: boolean; subtitle?: string;
}) {
  return (
    <Card
      className="rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.15)] hover:-translate-y-0.5 transition-all duration-200"
      style={{
        background: "var(--bg-card)",
        borderColor: "var(--border-color)",
      }}
    >
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${iconBg}`}>
            <Icon className="h-[22px] w-[22px]" />
          </div>
          <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{title}</span>
        </div>
        {isLoading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <>
            <p className="text-[28px] font-bold leading-tight" style={{ color: "var(--text-primary)" }}>
              {value}
            </p>
            {subtitle && <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>{subtitle}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
}

/* ===== ALERTS CARD ===== */
function AlertasCard({ agenciaId }: { agenciaId: string }) {
  const { data: alertas } = useAlertas(agenciaId);
  if (!alertas || alertas.total === 0) return null;

  const alertIcons = {
    vencendoHoje: { icon: AlertCircle, colorClass: "text-destructive" },
    vencendoEmBreve: { icon: AlertTriangle, colorClass: "text-warning" },
    aguardandoResposta: { icon: Info, colorClass: "text-primary" },
    pipelineParado: { icon: Clock, colorClass: "text-muted-foreground" },
  };

  const items: { key: string; text: string; link: string }[] = [];
  if (alertas.vencendoHoje > 0) items.push({ key: "vencendoHoje", text: `${alertas.vencendoHoje} orçamento(s) vencem HOJE`, link: "/orcamentos?filtro=vencendo_hoje" });
  if (alertas.vencendoEmBreve > 0) items.push({ key: "vencendoEmBreve", text: `${alertas.vencendoEmBreve} orçamento(s) vencem em até 3 dias`, link: "/orcamentos?filtro=vencendo_em_breve" });
  if (alertas.aguardandoResposta > 0) items.push({ key: "aguardandoResposta", text: `${alertas.aguardandoResposta} orçamento(s) aguardando resposta há mais de 1 dia útil`, link: "/orcamentos?filtro=aguardando" });
  if (alertas.pipelineParado > 0) items.push({ key: "pipelineParado", text: `${alertas.pipelineParado} orçamento(s) no pipeline sem movimentação há mais de 7 dias`, link: "/pipeline" });

  return (
    <div className="rounded-2xl p-5 border border-warning/40 bg-gradient-to-br from-warning/5 to-warning/10">
      <h3 className="text-sm font-bold flex items-center gap-2 text-warning mb-4">
        <AlertTriangle className="h-4 w-4" /> Requer Atenção
      </h3>
      <div className="space-y-0.5">
        {items.map((item, i) => {
          const cfg = alertIcons[item.key as keyof typeof alertIcons];
          const Icon = cfg.icon;
          return (
            <Link
              key={i}
              to={item.link}
              className={`flex items-center gap-3 py-2.5 px-1 hover:bg-warning/5 rounded-lg transition-colors ${i < items.length - 1 ? "border-b border-warning/20" : ""}`}
            >
              <Icon className={`h-4 w-4 shrink-0 ${cfg.colorClass}`} />
              <span className="flex-1 text-sm">{item.text}</span>
              <span className="text-xs text-primary font-medium">Ver →</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/* ===== MINHA META CARD (agents) ===== */
function MinhaMetaCard({ agenciaId }: { agenciaId: string }) {
  const { user } = useAuth();
  const { isAgente } = useUserRole();
  const now = new Date();
  const mes = now.getMonth() + 1;
  const ano = now.getFullYear();

  const { data: meta } = useQuery({
    queryKey: ["minha-meta", agenciaId, user?.id, mes, ano],
    enabled: !!user && isAgente,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("metas_agentes")
        .select("meta_valor, meta_orcamentos")
        .eq("agencia_id", agenciaId)
        .eq("usuario_id", user!.id)
        .eq("mes", mes)
        .eq("ano", ano)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: realizado } = useQuery({
    queryKey: ["minha-meta-realizado", agenciaId, user?.id, mes, ano],
    enabled: !!user && isAgente,
    queryFn: async () => {
      const startDate = new Date(ano, mes - 1, 1).toISOString();
      const endDate = new Date(ano, mes, 0, 23, 59, 59, 999).toISOString();
      const { data, error } = await supabase
        .from("orcamentos")
        .select("valor_final")
        .eq("agencia_id", agenciaId)
        .eq("usuario_id", user!.id)
        .gte("criado_em", startDate)
        .lte("criado_em", endDate)
        .in("status", ["aprovado", "emitido", "pago"]);
      if (error) throw error;
      return (data ?? []).reduce((s, o) => s + (Number(o.valor_final) || 0), 0);
    },
  });

  if (!isAgente || !meta || (Number(meta.meta_valor) === 0 && Number(meta.meta_orcamentos) === 0)) return null;

  const metaValor = Number(meta.meta_valor) || 0;
  const valorRealizado = realizado ?? 0;
  const pct = metaValor > 0 ? Math.round((valorRealizado / metaValor) * 100) : 0;
  const progressColor = pct >= 100 ? "#16A34A" : pct >= 80 ? "#2563EB" : pct >= 50 ? "#F59E0B" : "#EF4444";

  return (
    <Card className="rounded-2xl" style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}>
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
            <Target className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Minha Meta</p>
            <p className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
              {fmt(valorRealizado)} <span className="text-sm font-normal text-muted-foreground">de {fmt(metaValor)}</span>
            </p>
          </div>
          <span className="text-lg font-bold" style={{ color: progressColor }}>{pct}%</span>
        </div>
        <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden mb-2">
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: progressColor }} />
        </div>
        <Link to="/metas" className="text-xs text-primary font-medium hover:underline">Ver detalhes →</Link>
      </CardContent>
    </Card>
  );
}

/* ===== SUPERADMIN DASHBOARD ===== */
function SuperadminDashboard() {
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["superadmin-metrics"],
    queryFn: async () => {
      const [agenciasRes, orcamentosRes, pagosRes] = await Promise.all([
        supabase.from("agencias").select("id, plano, ativo"),
        supabase.from("orcamentos").select("valor_final, criado_em").gte("criado_em", startOfMonth),
        supabase.from("orcamentos").select("valor_final, agencia_id, pago_em, atualizado_em, criado_em").eq("status", "pago"),
      ]);
      if (agenciasRes.error) throw agenciasRes.error;
      if (orcamentosRes.error) throw orcamentosRes.error;
      if (pagosRes.error) throw pagosRes.error;
      const agenciasAtivas = agenciasRes.data?.filter((a) => a.ativo !== false) ?? [];
      const orcamentos = orcamentosRes.data ?? [];
      const pagos = (pagosRes.data ?? []).filter((o) => {
        const dataRef = o.pago_em || o.atualizado_em || o.criado_em;
        if (!dataRef) return false;
        return new Date(dataRef) >= new Date(startOfMonth);
      });

      const mrrMensalidades = agenciasAtivas.reduce((sum, a) => sum + (MRR_MAP[a.plano || "starter_a"] || 0), 0);

      // Build volume by agency for commission
      const volumeByAgencia: Record<string, number> = {};
      pagos.forEach((o) => {
        if (o.agencia_id) volumeByAgencia[o.agencia_id] = (volumeByAgencia[o.agencia_id] || 0) + (Number(o.valor_final) || 0);
      });
      const mrrComissoes = agenciasAtivas.reduce((sum, a) => {
        const taxa = COMISSAO_MAP[a.plano || "starter_a"] || 0;
        return sum + (volumeByAgencia[a.id] || 0) * taxa;
      }, 0);

      return {
        totalAgencias: agenciasAtivas.length,
        totalOrcamentos: orcamentos.length,
        volumeTotal: orcamentos.reduce((s, o) => s + (Number(o.valor_final) || 0), 0),
        mrr: mrrMensalidades + mrrComissoes,
      };
    },
  });

  const { data: chartData, isLoading: chartLoading } = useQuery({
    queryKey: ["superadmin-chart"],
    queryFn: async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
      const { data, error } = await supabase.from("orcamentos").select("status").gte("criado_em", thirtyDaysAgo);
      if (error) throw error;
      const counts: Record<string, number> = { rascunho: 0, enviado: 0, aprovado: 0, perdido: 0, emitido: 0 };
      data?.forEach((o) => { if (o.status && counts[o.status] !== undefined) counts[o.status]++; });
      return Object.entries(counts).map(([name, total]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), total }));
    },
  });

  const { data: recentes, isLoading: recentesLoading } = useQuery({
    queryKey: ["superadmin-recentes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orcamentos")
        .select("id, titulo, valor_final, status, criado_em, clientes(nome), agencias!orcamentos_agencia_id_fkey(nome_fantasia)")
        .order("criado_em", { ascending: false }).limit(5);
      if (error) throw error;
      return data;
    },
  });

  const metricCards = [
    { title: "Agências ativas", value: metrics ? String(metrics.totalAgencias) : "0", icon: Building2, iconBg: "bg-blue-100 text-blue-600" },
    { title: "Orçamentos este mês", value: metrics ? String(metrics.totalOrcamentos) : "0", icon: FileText, iconBg: "bg-violet-100 text-violet-600" },
    { title: "Volume total orçado", value: metrics ? fmt(metrics.volumeTotal) : "R$ 0", icon: DollarSign, iconBg: "bg-emerald-100 text-emerald-600" },
    { title: "MRR estimado", value: metrics ? fmt(metrics.mrr) : "R$ 0", icon: TrendingUp, iconBg: "bg-orange-100 text-orange-600" },
  ];

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h2 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Painel Administrativo</h2>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Visão consolidada de todas as agências</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((m) => (
          <MetricCard key={m.title} title={m.title} value={m.value} icon={m.icon} iconBg={m.iconBg} isLoading={metricsLoading} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="rounded-2xl">
          <CardHeader><CardTitle className="text-lg">Orçamentos por Status</CardTitle></CardHeader>
          <CardContent>
            {chartLoading ? <Skeleton className="h-[250px] w-full" /> : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: "var(--text-secondary)" }} />
                  <YAxis tick={{ fontSize: 12, fill: "var(--text-secondary)" }} />
                   <Tooltip contentStyle={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#F8FAFC', fontSize: '12px' }} labelStyle={{ color: '#F8FAFC', fontWeight: '600', marginBottom: '4px' }} itemStyle={{ color: '#CBD5E1' }} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                   <Bar dataKey="total" fill="#2563EB" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader><CardTitle className="text-lg">Orçamentos Recentes</CardTitle></CardHeader>
          <CardContent>
            {recentesLoading ? (
              <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : (
              <div className="space-y-3">
                {recentes?.map((o: any) => (
                  <Link key={o.id} to={`/orcamentos/${o.id}`} className="flex flex-col sm:flex-row sm:items-center justify-between py-2.5 border-b last:border-0 hover:bg-muted/50 -mx-2 px-2 rounded-lg transition-colors gap-1">
                    <div>
                      <p className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>{o.titulo || "Sem título"}</p>
                      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                        {o.clientes?.nome || "Sem cliente"} • {o.agencias?.nome_fantasia || "—"} • {o.criado_em ? formatarApenasDatabrasilia(o.criado_em) : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{fmt(Number(o.valor_final) || 0)}</span>
                      <StatusBadge status={o.status || "rascunho"} />
                    </div>
                  </Link>
                ))}
                {recentes?.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhum orçamento ainda</p>}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ===== AGENCY DASHBOARD ===== */
function AgencyDashboard({ agenciaId }: { agenciaId: string }) {
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["dashboard-metrics", agenciaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orcamentos").select("status, valor_final, lucro_bruto, criado_em")
        .eq("agencia_id", agenciaId).gte("criado_em", startOfMonth);
      if (error) throw error;
      const orcamentos = data ?? [];
      const total = orcamentos.length;
      const valorTotal = orcamentos.reduce((s, o) => s + (Number(o.valor_final) || 0), 0);
      const pagos = orcamentos.filter((o) => o.status === "pago");
      const pagosCount = pagos.length;
      const conversao = total > 0 ? Math.round((pagosCount / total) * 100) : 0;
      const comissao = orcamentos
        .filter(o => ['aprovado', 'emitido', 'pago'].includes(o.status || ''))
        .reduce((s, o) => s + (Number(o.lucro_bruto) || 0), 0);
      const recebido = pagos.reduce((s, o) => s + (Number(o.valor_final) || 0), 0);
      return { total, valorTotal, conversao, comissao, recebido, pagosCount };
    },
  });

  const { data: chartData, isLoading: chartLoading } = useQuery({
    queryKey: ["dashboard-chart", agenciaId],
    queryFn: async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
      const { data, error } = await supabase.from("orcamentos").select("status").eq("agencia_id", agenciaId).gte("criado_em", thirtyDaysAgo);
      if (error) throw error;
      const counts: Record<string, number> = { rascunho: 0, enviado: 0, aprovado: 0, perdido: 0, emitido: 0 };
      data?.forEach((o) => { if (o.status && counts[o.status] !== undefined) counts[o.status]++; });
      return Object.entries(counts).map(([name, total]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), total }));
    },
  });

  const { data: recentes, isLoading: recentesLoading } = useQuery({
    queryKey: ["dashboard-recentes", agenciaId],
    queryFn: async () => {
      const { data, error } = await supabase.from("orcamentos")
        .select("id, titulo, valor_final, status, criado_em, clientes(nome)")
        .eq("agencia_id", agenciaId).order("criado_em", { ascending: false }).limit(5);
      if (error) throw error;
      return data;
    },
  });

  const metricCards = [
    { title: "Orçamentos no mês", value: metrics ? String(metrics.total) : "0", icon: FileText, iconBg: "bg-blue-100 text-blue-600", subtitle: "" },
    { title: "Valor total orçado", value: metrics ? fmt(metrics.valorTotal) : "R$ 0", icon: DollarSign, iconBg: "bg-emerald-100 text-emerald-600", subtitle: "" },
    { title: "Recebido no mês", value: metrics ? fmt(metrics.recebido) : "R$ 0", icon: BadgeCheck, iconBg: "bg-green-100 text-green-600", subtitle: metrics ? `${metrics.pagosCount} orçamentos pagos este mês` : "" },
    { title: "Taxa de conversão", value: metrics ? `${metrics.conversao}%` : "0%", icon: Percent, iconBg: "bg-violet-100 text-violet-600", subtitle: "" },
    { title: "Lucro estimado", value: metrics ? fmt(metrics.comissao) : "R$ 0", icon: TrendingUp, iconBg: "bg-orange-100 text-orange-600", subtitle: "" },
  ];

  return (
    <div className="space-y-6 animate-fade-in-up">
      <h2 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Dashboard</h2>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {metricCards.map((m) => (
          <MetricCard key={m.title} title={m.title} value={m.value} icon={m.icon} iconBg={m.iconBg} isLoading={metricsLoading} subtitle={m.subtitle} />
        ))}
      </div>

      <MinhaMetaCard agenciaId={agenciaId} />

      <AlertasCard agenciaId={agenciaId} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="rounded-2xl">
          <CardHeader><CardTitle className="text-lg">Orçamentos por Status</CardTitle></CardHeader>
          <CardContent>
            {chartLoading ? <Skeleton className="h-[250px] w-full" /> : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: "var(--text-secondary)" }} />
                  <YAxis tick={{ fontSize: 12, fill: "var(--text-secondary)" }} />
                   <Tooltip contentStyle={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#F8FAFC', fontSize: '12px' }} labelStyle={{ color: '#F8FAFC', fontWeight: '600', marginBottom: '4px' }} itemStyle={{ color: '#CBD5E1' }} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                   <Bar dataKey="total" fill="#2563EB" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader><CardTitle className="text-lg">Orçamentos Recentes</CardTitle></CardHeader>
          <CardContent>
            {recentesLoading ? (
              <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : (
              <div className="space-y-3">
                {recentes?.map((o) => (
                  <Link key={o.id} to={`/orcamentos/${o.id}`} className="flex flex-col sm:flex-row sm:items-center justify-between py-2.5 border-b last:border-0 hover:bg-muted/50 -mx-2 px-2 rounded-lg transition-colors gap-1">
                    <div>
                      <p className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>{o.titulo || "Sem título"}</p>
                      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                        {(o.clientes as any)?.nome || "Sem cliente"} • {o.criado_em ? formatarApenasDatabrasilia(o.criado_em) : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{fmt(Number(o.valor_final) || 0)}</span>
                      <StatusBadge status={o.status || "rascunho"} />
                    </div>
                  </Link>
                ))}
                {recentes?.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhum orçamento ainda</p>}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
