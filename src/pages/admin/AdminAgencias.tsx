import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Plus, DollarSign, Activity, Percent } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import useUserRole from "@/hooks/useUserRole";
import { useTheme } from "@/contexts/ThemeContext";

const planoConfig: Record<string, { label: string; color: string }> = {
  starter_a: { label: "Starter", color: "bg-muted text-muted-foreground" },
  starter_b: { label: "Starter", color: "bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300" },
  pro_a: { label: "Pro", color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
  pro_b: { label: "Pro", color: "bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-blue-200" },
  agency_c: { label: "Elite", color: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300" },
};

const planoPreco: Record<string, number> = {
  starter_a: 397,
  starter_b: 197,
  pro_a: 697,
  pro_b: 297,
  agency_c: 1997,
};

const planoComissao: Record<string, number> = {
  starter_a: 0,
  starter_b: 0.015,
  pro_a: 0,
  pro_b: 0.012,
  agency_c: 0,
};

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function getPeriodRange(period: string): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  let start: Date;
  switch (period) {
    case "mes_anterior": {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endPrev = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { start, end: endPrev };
    }
    case "ultimos_3":
      start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      return { start, end };
    case "ultimos_6":
      start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      return { start, end };
    case "este_ano":
      start = new Date(now.getFullYear(), 0, 1);
      return { start, end };
    default: // mes_atual
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start, end };
  }
}

export default function AdminAgencias() {
  const navigate = useNavigate();
  const { isSuperadmin, loading: roleLoading } = useUserRole();
  const queryClient = useQueryClient();
  const { isDark } = useTheme();
  const [periodo, setPeriodo] = useState("mes_atual");

  const planoBadgeDarkStyle = (plano: string): React.CSSProperties => {
    const map: Record<string, React.CSSProperties> = {
      starter_a: { background: "rgba(100,116,139,0.25)", color: "#CBD5E1", border: "1px solid rgba(100,116,139,0.4)" },
      starter_b: { background: "rgba(14,165,233,0.25)", color: "#7DD3FC", border: "1px solid rgba(14,165,233,0.4)" },
      pro_a: { background: "rgba(37,99,235,0.25)", color: "#93C5FD", border: "1px solid rgba(37,99,235,0.4)" },
      pro_b: { background: "rgba(29,78,216,0.25)", color: "#BFDBFE", border: "1px solid rgba(29,78,216,0.4)" },
      agency_c: { background: "rgba(139,92,246,0.25)", color: "#C4B5FD", border: "1px solid rgba(139,92,246,0.4)" },
    };
    return map[plano] ?? map.starter_a;
  };

  useEffect(() => {
    if (!roleLoading && !isSuperadmin) {
      toast.error("Acesso não autorizado");
      navigate("/dashboard", { replace: true });
    }
  }, [roleLoading, isSuperadmin, navigate]);

  const { data: agencias, isLoading } = useQuery({
    queryKey: ["admin-agencias"],
    enabled: isSuperadmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agencias")
        .select("*")
        .order("criado_em", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { start: periodoStart, end: periodoEnd } = useMemo(() => getPeriodRange(periodo), [periodo]);

  const { data: orcamentosPagos } = useQuery({
    queryKey: ["admin-comissoes-orcamentos", periodo],
    enabled: isSuperadmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orcamentos")
        .select("agencia_id, valor_final, pago_em, atualizado_em, criado_em")
        .eq("status", "pago");
      if (error) throw error;
      return data?.filter((o) => {
        const dataRef = o.pago_em || o.atualizado_em || o.criado_em;
        if (!dataRef) return false;
        const d = new Date(dataRef);
        return d >= periodoStart && d <= periodoEnd;
      }) ?? [];
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase.from("agencias").update({ ativo }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-agencias"] });
      toast.success("Status atualizado");
    },
  });

  if (roleLoading || (!isSuperadmin && !roleLoading)) {
    return <div className="p-6"><Skeleton className="h-8 w-48" /></div>;
  }

  const total = agencias?.length ?? 0;
  const ativas = agencias?.filter((a) => a.ativo !== false).length ?? 0;
  const mrr = agencias
    ?.filter((a) => a.ativo !== false)
    .reduce((s, a) => s + (planoPreco[a.plano || "starter_a"] || 0), 0) ?? 0;

  // Commission calculations
  const volumeByAgencia: Record<string, number> = {};
  orcamentosPagos?.forEach((o) => {
    volumeByAgencia[o.agencia_id] = (volumeByAgencia[o.agencia_id] || 0) + (Number(o.valor_final) || 0);
  });

  const mrrMensalidades = mrr;
  const mrrComissoes = agencias
    ?.filter((a) => a.ativo !== false)
    .reduce((s, a) => {
      const taxa = planoComissao[a.plano || "starter_a"] || 0;
      const vol = volumeByAgencia[a.id] || 0;
      return s + vol * taxa;
    }, 0) ?? 0;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Agências</h2>
        <Button onClick={() => navigate("/admin/agencias/nova")}>
          <Plus className="h-4 w-4 mr-2" /> Nova Agência
        </Button>
      </div>

      <Tabs defaultValue="agencias">
        <TabsList>
          <TabsTrigger value="agencias">Agências</TabsTrigger>
          <TabsTrigger value="comissoes">Receita Variável</TabsTrigger>
        </TabsList>

        <TabsContent value="agencias">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Total de Agências</CardTitle>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent><div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{total}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Agências Ativas</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent><div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{ativas}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>MRR Estimado</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent><div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{fmt(mrr)}</div></CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="pt-6">
                {isLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome Fantasia</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Plano</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Cadastro</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {agencias?.map((a) => {
                        const plano = planoConfig[a.plano || "starter_a"] || planoConfig.starter_a;
                        return (
                          <TableRow key={a.id}>
                            <TableCell className="font-medium">{a.nome_fantasia}</TableCell>
                            <TableCell className="text-muted-foreground">{a.email || "—"}</TableCell>
                            <TableCell>
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${!isDark ? plano.color : ""}`}
                                style={isDark ? planoBadgeDarkStyle(a.plano || "starter_a") : undefined}
                              >
                                {plano.label}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Switch
                                checked={a.ativo !== false}
                                onCheckedChange={(checked) => toggleMutation.mutate({ id: a.id, ativo: checked })}
                              />
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {a.criado_em ? new Date(a.criado_em).toLocaleDateString("pt-BR") : "—"}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button variant="ghost" size="sm" asChild>
                                  <Link to={`/admin/agencias/${a.id}`}>Ver detalhes</Link>
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {agencias?.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6}>
                            <EmptyState
                              icon={<Building2 className="h-9 w-9" />}
                              title="Nenhuma agência cadastrada"
                              description="Cadastre a primeira agência cliente da plataforma"
                              actionLabel="Cadastrar agência"
                              onAction={() => navigate("/admin/agencias/nova")}
                            />
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="comissoes">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>MRR Mensalidades</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent><div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{fmt(mrrMensalidades)}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>MRR Receita Variável</CardTitle>
                  <Percent className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent><div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{fmt(mrrComissoes)}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>MRR Total</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent><div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{fmt(mrrMensalidades + mrrComissoes)}</div></CardContent>
              </Card>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-muted-foreground">Período:</span>
              <Select value={periodo} onValueChange={setPeriodo}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mes_atual">Mês atual</SelectItem>
                  <SelectItem value="mes_anterior">Mês anterior</SelectItem>
                  <SelectItem value="ultimos_3">Últimos 3 meses</SelectItem>
                  <SelectItem value="ultimos_6">Últimos 6 meses</SelectItem>
                  <SelectItem value="este_ano">Este ano</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Agência</TableHead>
                      <TableHead>Plano</TableHead>
                      <TableHead className="text-right">Mensalidade</TableHead>
                      <TableHead className="text-right">Volume pago</TableHead>
                       <TableHead className="text-right">Taxa op.</TableHead>
                       <TableHead className="text-right">Receita variável</TableHead>
                       <TableHead className="text-right">Total estimado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agencias?.filter((a) => a.ativo !== false).map((a) => {
                      const plano = a.plano || "starter_a";
                      const planoInfo = planoConfig[plano] || planoConfig.starter_a;
                      const mensalidade = planoPreco[plano] || 0;
                      const taxa = planoComissao[plano] || 0;
                      const volume = volumeByAgencia[a.id] || 0;
                      const comissao = volume * taxa;
                      return (
                        <TableRow key={a.id}>
                          <TableCell className="font-medium">{a.nome_fantasia}</TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${!isDark ? planoInfo.color : ""}`}
                              style={isDark ? planoBadgeDarkStyle(plano) : undefined}
                            >
                              {planoInfo.label}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">{fmt(mensalidade)}</TableCell>
                          <TableCell className="text-right">{fmt(volume)}</TableCell>
                          <TableCell className="text-right">{taxa > 0 ? `${(taxa * 100).toFixed(1)}%` : "—"}</TableCell>
                          <TableCell className="text-right">{fmt(comissao)}</TableCell>
                          <TableCell className="text-right font-medium">{fmt(mensalidade + comissao)}</TableCell>
                        </TableRow>
                      );
                    })}
                    {(!agencias || agencias.filter((a) => a.ativo !== false).length === 0) && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          Nenhuma agência ativa
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
