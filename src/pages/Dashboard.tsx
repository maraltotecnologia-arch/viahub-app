import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, DollarSign, TrendingUp, Percent, Building2, BarChart3, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import useAlertas from "@/hooks/useAlertas";

const statusVariant: Record<string, "muted" | "default" | "success" | "destructive" | "info"> = {
  rascunho: "muted",
  enviado: "default",
  aprovado: "success",
  perdido: "destructive",
  emitido: "info",
};

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const MRR_MAP: Record<string, number> = {
  starter_a: 397,
  starter_b: 397,
  pro_a: 697,
  pro_b: 697,
  agency_c: 1997,
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
      if (!user) {
        navigate("/login", { replace: true });
        return;
      }

      try {
        const { data: perfil, error: perfilError } = await supabase
          .from("usuarios")
          .select("agencia_id, cargo")
          .eq("id", user.id)
          .maybeSingle();

        if (perfilError || !perfil) {
          await supabase.auth.signOut();
          navigate("/login", { replace: true });
          return;
        }

        if (perfil.cargo === "superadmin") {
          if (mounted) {
            setIsSuperadmin(true);
            setAgenciaId(perfil.agencia_id ?? "__superadmin__");
          }
        } else {
          if (!perfil.agencia_id) {
            await supabase.auth.signOut();
            navigate("/login", { replace: true });
            return;
          }

          const { data: agencia, error: agenciaError } = await supabase
            .from("agencias")
            .select("onboarding_completo")
            .eq("id", perfil.agencia_id)
            .maybeSingle();

          if (agenciaError || !agencia) {
            await supabase.auth.signOut();
            navigate("/login", { replace: true });
            return;
          }

          if (agencia.onboarding_completo === false) {
            navigate("/onboarding", { replace: true });
            return;
          }

          if (mounted) {
            setAgenciaId(perfil.agencia_id);
          }
        }
      } catch {
        await supabase.auth.signOut();
        navigate("/login", { replace: true });
      } finally {
        if (mounted) {
          setCheckingAccess(false);
        }
      }
    };

    checkAccess();
    return () => { mounted = false; };
  }, [user, navigate]);

  if (checkingAccess) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton className="h-8 w-40" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="pt-6"><Skeleton className="h-8 w-24" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  if (isSuperadmin) {
    return <SuperadminDashboard />;
  }

  return <AgencyDashboard agenciaId={agenciaId!} />;
}

/* ===== ALERTS CARD ===== */
function AlertasCard({ agenciaId }: { agenciaId: string }) {
  const { data: alertas } = useAlertas(agenciaId);
  if (!alertas || alertas.total === 0) return null;

  const items: { emoji: string; text: string; link: string }[] = [];
  if (alertas.vencendoHoje > 0) items.push({ emoji: "🔴", text: `${alertas.vencendoHoje} orçamento(s) vencem HOJE`, link: "/orcamentos?filtro=vencendo_hoje" });
  if (alertas.vencendoEmBreve > 0) items.push({ emoji: "🟡", text: `${alertas.vencendoEmBreve} orçamento(s) vencem em até 3 dias`, link: "/orcamentos?filtro=vencendo_em_breve" });
  if (alertas.aguardandoResposta > 0) items.push({ emoji: "🔵", text: `${alertas.aguardandoResposta} orçamento(s) aguardando resposta há mais de 1 dia útil`, link: "/orcamentos?filtro=aguardando" });
  if (alertas.pipelineParado > 0) items.push({ emoji: "⚫", text: `${alertas.pipelineParado} orçamento(s) no pipeline sem movimentação há mais de 7 dias`, link: "/pipeline" });

  return (
    <Card className="border-l-4" style={{ borderLeftColor: "#F59E0B", backgroundColor: "#FFFBEB" }}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold flex items-center gap-2" style={{ color: "#F59E0B" }}>
          <AlertTriangle className="h-4 w-4" /> Requer Atenção
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {items.map((item, i) => (
          <Link key={i} to={item.link} className="flex items-center gap-2 text-sm hover:underline">
            <span>{item.emoji}</span>
            <span>{item.text}</span>
          </Link>
        ))}
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
      const [agenciasRes, orcamentosRes] = await Promise.all([
        supabase.from("agencias").select("plano, ativo"),
        supabase.from("orcamentos").select("valor_final, criado_em").gte("criado_em", startOfMonth),
      ]);

      if (agenciasRes.error) throw agenciasRes.error;
      if (orcamentosRes.error) throw orcamentosRes.error;

      const agenciasAtivas = agenciasRes.data?.filter((a) => a.ativo) ?? [];
      const totalAgencias = agenciasAtivas.length;

      const mrr = agenciasAtivas.reduce((sum, a) => sum + (MRR_MAP[a.plano || ""] || 0), 0);

      const orcamentos = orcamentosRes.data ?? [];
      const totalOrcamentos = orcamentos.length;
      const volumeTotal = orcamentos.reduce((s, o) => s + (Number(o.valor_final) || 0), 0);

      return { totalAgencias, totalOrcamentos, volumeTotal, mrr };
    },
  });

  const { data: chartData, isLoading: chartLoading } = useQuery({
    queryKey: ["superadmin-chart"],
    queryFn: async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
      const { data, error } = await supabase
        .from("orcamentos")
        .select("status")
        .gte("criado_em", thirtyDaysAgo);
      if (error) throw error;

      const counts: Record<string, number> = { rascunho: 0, enviado: 0, aprovado: 0, perdido: 0, emitido: 0 };
      data?.forEach((o) => {
        if (o.status && counts[o.status] !== undefined) counts[o.status]++;
      });
      return Object.entries(counts).map(([name, total]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        total,
      }));
    },
  });

  const { data: recentes, isLoading: recentesLoading } = useQuery({
    queryKey: ["superadmin-recentes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orcamentos")
        .select("id, titulo, valor_final, status, criado_em, clientes(nome), agencias!orcamentos_agencia_id_fkey(nome_fantasia)")
        .order("criado_em", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  const metricCards = [
    { title: "Agências ativas", value: metrics ? String(metrics.totalAgencias) : "0", icon: Building2 },
    { title: "Orçamentos este mês", value: metrics ? String(metrics.totalOrcamentos) : "0", icon: FileText },
    { title: "Volume total orçado", value: metrics ? fmt(metrics.volumeTotal) : "R$ 0", icon: DollarSign },
    { title: "MRR estimado", value: metrics ? fmt(metrics.mrr) : "R$ 0", icon: TrendingUp },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold">Painel Administrativo</h2>
        <p className="text-sm text-muted-foreground">Visão consolidada de todas as agências</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((m) => (
          <Card key={m.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">{m.title}</CardTitle>
              <m.icon className="h-4 w-4 text-muted-foreground hidden sm:block" />
            </CardHeader>
            <CardContent>
              {metricsLoading ? <Skeleton className="h-8 w-24" /> : <div className="text-lg sm:text-2xl font-bold">{m.value}</div>}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">Orçamentos por Status</CardTitle></CardHeader>
          <CardContent>
            {chartLoading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="total" fill="hsl(217, 91%, 60%)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Orçamentos Recentes</CardTitle></CardHeader>
          <CardContent>
            {recentesLoading ? (
              <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : (
              <div className="space-y-3">
                {recentes?.map((o: any) => (
                  <Link key={o.id} to={`/orcamentos/${o.id}`} className="flex flex-col sm:flex-row sm:items-center justify-between py-2.5 border-b last:border-0 hover:bg-muted/50 -mx-2 px-2 rounded-md transition-colors gap-1">
                    <div>
                      <p className="font-medium text-sm">{o.titulo || "Sem título"}</p>
                      <p className="text-xs text-muted-foreground">
                        {o.clientes?.nome || "Sem cliente"} • {o.agencias?.nome_fantasia || "—"} • {o.criado_em ? new Date(o.criado_em).toLocaleDateString("pt-BR") : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold">{fmt(Number(o.valor_final) || 0)}</span>
                      <Badge variant={statusVariant[o.status || "rascunho"]}>{o.status}</Badge>
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

/* ===== AGENCY DASHBOARD (unchanged logic) ===== */
function AgencyDashboard({ agenciaId }: { agenciaId: string }) {
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["dashboard-metrics", agenciaId],
    queryFn: async () => {
      const { data: orcamentos, error } = await supabase
        .from("orcamentos")
        .select("status, valor_final, lucro_bruto, criado_em")
        .eq("agencia_id", agenciaId)
        .gte("criado_em", startOfMonth);

      if (error) throw error;

      const total = orcamentos?.length ?? 0;
      const valorTotal = orcamentos?.reduce((s, o) => s + (Number(o.valor_final) || 0), 0) ?? 0;
      const enviados = orcamentos?.filter((o) => o.status === "enviado").length ?? 0;
      const aprovados = orcamentos?.filter((o) => o.status === "aprovado").length ?? 0;
      const conversao = enviados > 0 ? Math.round((aprovados / enviados) * 100) : 0;
      const comissao = orcamentos?.reduce((s, o) => s + (Number(o.lucro_bruto) || 0), 0) ?? 0;

      return { total, valorTotal, conversao, comissao };
    },
  });

  const { data: chartData, isLoading: chartLoading } = useQuery({
    queryKey: ["dashboard-chart", agenciaId],
    queryFn: async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
      const { data, error } = await supabase
        .from("orcamentos")
        .select("status")
        .eq("agencia_id", agenciaId)
        .gte("criado_em", thirtyDaysAgo);
      if (error) throw error;

      const counts: Record<string, number> = { rascunho: 0, enviado: 0, aprovado: 0, perdido: 0, emitido: 0 };
      data?.forEach((o) => {
        if (o.status && counts[o.status] !== undefined) counts[o.status]++;
      });
      return Object.entries(counts).map(([name, total]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        total,
      }));
    },
  });

  const { data: recentes, isLoading: recentesLoading } = useQuery({
    queryKey: ["dashboard-recentes", agenciaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orcamentos")
        .select("id, titulo, valor_final, status, criado_em, clientes(nome)")
        .eq("agencia_id", agenciaId)
        .order("criado_em", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  const metricCards = [
    { title: "Orçamentos no mês", value: metrics ? String(metrics.total) : "0", icon: FileText },
    { title: "Valor total orçado", value: metrics ? fmt(metrics.valorTotal) : "R$ 0", icon: DollarSign },
    { title: "Taxa de conversão", value: metrics ? `${metrics.conversao}%` : "0%", icon: Percent },
    { title: "Comissão total", value: metrics ? fmt(metrics.comissao) : "R$ 0", icon: TrendingUp },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold">Dashboard</h2>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((m) => (
          <Card key={m.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">{m.title}</CardTitle>
              <m.icon className="h-4 w-4 text-muted-foreground hidden sm:block" />
            </CardHeader>
            <CardContent>
              {metricsLoading ? <Skeleton className="h-8 w-24" /> : <div className="text-lg sm:text-2xl font-bold">{m.value}</div>}
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertasCard agenciaId={agenciaId} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">Orçamentos por Status</CardTitle></CardHeader>
          <CardContent>
            {chartLoading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="total" fill="hsl(217, 91%, 60%)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Orçamentos Recentes</CardTitle></CardHeader>
          <CardContent>
            {recentesLoading ? (
              <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : (
              <div className="space-y-3">
                {recentes?.map((o) => (
                  <Link key={o.id} to={`/orcamentos/${o.id}`} className="flex flex-col sm:flex-row sm:items-center justify-between py-2.5 border-b last:border-0 hover:bg-muted/50 -mx-2 px-2 rounded-md transition-colors gap-1">
                    <div>
                      <p className="font-medium text-sm">{o.titulo || "Sem título"}</p>
                      <p className="text-xs text-muted-foreground">
                        {(o.clientes as any)?.nome || "Sem cliente"} • {o.criado_em ? new Date(o.criado_em).toLocaleDateString("pt-BR") : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold">{fmt(Number(o.valor_final) || 0)}</span>
                      <Badge variant={statusVariant[o.status || "rascunho"]}>{o.status}</Badge>
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
