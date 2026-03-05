import React, { useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, eachMonthOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from "recharts";
import { Download, FileText, TrendingUp, DollarSign, BadgeCheck, BarChart3, ChevronDown, ChevronRight } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import StatusBadge from "@/components/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import useAgenciaId from "@/hooks/useAgenciaId";
import { formatarApenasDatabrasilia } from "@/lib/date-utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const PERIODOS = [
  { value: "este_mes", label: "Este mês" },
  { value: "mes_anterior", label: "Mês anterior" },
  { value: "ultimos_3", label: "Últimos 3 meses" },
  { value: "ultimos_6", label: "Últimos 6 meses" },
  { value: "este_ano", label: "Este ano" },
];

const STATUS_COLORS: Record<string, string> = {
  aprovado: "#2563EB",
  emitido: "#8B5CF6",
  pago: "#16A34A",
  perdido: "#EF4444",
  enviado: "#94A3B8",
};

function getDateRange(periodo: string) {
  const now = new Date();
  switch (periodo) {
    case "mes_anterior": return { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) };
    case "ultimos_3": return { start: startOfMonth(subMonths(now, 2)), end: endOfMonth(now) };
    case "ultimos_6": return { start: startOfMonth(subMonths(now, 5)), end: endOfMonth(now) };
    case "este_ano": return { start: startOfYear(now), end: endOfYear(now) };
    default: return { start: startOfMonth(now), end: endOfMonth(now) };
  }
}

function getInitials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

type AgentPerf = {
  id: string;
  nome: string;
  cargo: string;
  criados: number;
  enviados: number;
  aprovados: number;
  pagos: number;
  perdidos: number;
  valorTotal: number;
  valorPago: number;
  orcamentos: any[];
};

export default function RelatorioAgentes() {
  const agenciaId = useAgenciaId();
  const [periodo, setPeriodo] = useState("este_mes");
  const [agenteFiltro, setAgenteFiltro] = useState("todos");
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);

  const dateRange = useMemo(() => getDateRange(periodo), [periodo]);

  const { data: usuarios, isLoading: loadingUsers } = useQuery({
    queryKey: ["usuarios-relatorio-agentes", agenciaId],
    enabled: !!agenciaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("usuarios")
        .select("id, nome, cargo")
        .eq("agencia_id", agenciaId!)
        .eq("ativo", true);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: orcamentos, isLoading: loadingOrc } = useQuery({
    queryKey: ["orcamentos-relatorio-agentes", agenciaId, dateRange.start.toISOString(), dateRange.end.toISOString()],
    enabled: !!agenciaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orcamentos")
        .select("id, numero_orcamento, criado_em, valor_final, status, usuario_id, cliente_id, clientes(nome)")
        .eq("agencia_id", agenciaId!)
        .gte("criado_em", dateRange.start.toISOString())
        .lte("criado_em", dateRange.end.toISOString());
      if (error) throw error;
      return (data || []).map(o => ({
        ...o,
        cliente_nome: (o.clientes as any)?.nome || "Sem cliente",
      }));
    },
  });

  const isLoading = loadingUsers || loadingOrc;

  const agentPerformance = useMemo(() => {
    if (!usuarios || !orcamentos) return [];
    const map = new Map<string, AgentPerf>();
    usuarios.forEach(u => {
      map.set(u.id, {
        id: u.id,
        nome: u.nome || "Sem nome",
        cargo: u.cargo || "agente",
        criados: 0, enviados: 0, aprovados: 0, pagos: 0, perdidos: 0,
        valorTotal: 0, valorPago: 0,
        orcamentos: [],
      });
    });

    orcamentos.forEach(o => {
      const agent = map.get(o.usuario_id || "");
      if (!agent) return;
      agent.criados++;
      agent.valorTotal += Number(o.valor_final) || 0;
      agent.orcamentos.push(o);
      const st = o.status || "";
      if (st === "enviado") agent.enviados++;
      if (st === "aprovado") agent.aprovados++;
      if (st === "pago") { agent.pagos++; agent.valorPago += Number(o.valor_final) || 0; }
      if (st === "perdido") agent.perdidos++;
      if (st === "emitido") agent.aprovados++; // emitido counts as approved too
    });

    const list = Array.from(map.values());
    list.sort((a, b) => b.valorPago - a.valorPago);
    return list;
  }, [usuarios, orcamentos]);

  const filteredPerf = useMemo(() => {
    if (agenteFiltro === "todos") return agentPerformance;
    return agentPerformance.filter(a => a.id === agenteFiltro);
  }, [agentPerformance, agenteFiltro]);

  // Summary totals
  const totalCriados = filteredPerf.reduce((s, a) => s + a.criados, 0);
  const totalPagos = filteredPerf.reduce((s, a) => s + a.pagos, 0);
  const taxaConversao = totalCriados > 0 ? (totalPagos / totalCriados) * 100 : 0;
  const valorTotal = filteredPerf.reduce((s, a) => s + a.valorTotal, 0);
  const valorConvertido = filteredPerf.reduce((s, a) => s + a.valorPago, 0);
  const ticketMedio = totalCriados > 0 ? valorTotal / totalCriados : 0;

  // Chart data
  const chartData = useMemo(() => {
    if (!orcamentos) return [];

    if (agenteFiltro !== "todos") {
      // Single agent: show by months
      const months = eachMonthOfInterval({ start: dateRange.start, end: dateRange.end });
      return months.map(m => {
        const key = format(m, "MMM/yy", { locale: ptBR });
        const mOrcs = orcamentos.filter(o => o.usuario_id === agenteFiltro && o.criado_em && format(new Date(o.criado_em), "yyyy-MM") === format(m, "yyyy-MM"));
        return {
          name: key,
          aprovado: mOrcs.filter(o => o.status === "aprovado").length,
          emitido: mOrcs.filter(o => o.status === "emitido").length,
          pago: mOrcs.filter(o => o.status === "pago").length,
          perdido: mOrcs.filter(o => o.status === "perdido").length,
          enviado: mOrcs.filter(o => o.status === "enviado").length,
        };
      });
    }

    // All agents: show by agent
    return agentPerformance.map(a => ({
      name: (a.nome || "").split(" ")[0],
      aprovado: a.aprovados,
      emitido: orcamentos.filter(o => o.usuario_id === a.id && o.status === "emitido").length,
      pago: a.pagos,
      perdido: a.perdidos,
      enviado: a.enviados,
    }));
  }, [orcamentos, agenteFiltro, agentPerformance, dateRange]);

  // Totals row
  const totals = useMemo(() => ({
    criados: filteredPerf.reduce((s, a) => s + a.criados, 0),
    enviados: filteredPerf.reduce((s, a) => s + a.enviados, 0),
    aprovados: filteredPerf.reduce((s, a) => s + a.aprovados, 0),
    pagos: filteredPerf.reduce((s, a) => s + a.pagos, 0),
    perdidos: filteredPerf.reduce((s, a) => s + a.perdidos, 0),
    valorTotal: filteredPerf.reduce((s, a) => s + a.valorTotal, 0),
    valorPago: filteredPerf.reduce((s, a) => s + a.valorPago, 0),
  }), [filteredPerf]);

  const exportarCSV = () => {
    const headers = ["Agente", "Orçamentos Criados", "Enviados", "Aprovados", "Pagos", "Perdidos", "Taxa Conversão", "Valor Total", "Valor Pago", "Ticket Médio"];
    const rows = filteredPerf.map(a => [
      a.nome,
      a.criados,
      a.enviados,
      a.aprovados,
      a.pagos,
      a.perdidos,
      a.criados > 0 ? ((a.pagos / a.criados) * 100).toFixed(1) + "%" : "0%",
      (a.valorTotal).toFixed(2).replace(".", ","),
      (a.valorPago).toFixed(2).replace(".", ","),
      a.criados > 0 ? (a.valorTotal / a.criados).toFixed(2).replace(".", ",") : "0,00",
    ]);
    const csv = [headers, ...rows].map(r => r.join(";")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `conversao-agentes-${format(new Date(), "MM-yyyy")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getProgressColor = (pct: number) => {
    if (pct >= 100) return "#16A34A";
    if (pct >= 80) return "#2563EB";
    if (pct >= 50) return "#F59E0B";
    return "#EF4444";
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Período</label>
              <Select value={periodo} onValueChange={setPeriodo}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PERIODOS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Agente</label>
              <Select value={agenteFiltro} onValueChange={setAgenteFiltro}>
                <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os agentes</SelectItem>
                  {(usuarios || []).map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.nome || u.id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={exportarCSV} disabled={filteredPerf.length === 0}>
              <Download className="h-4 w-4 mr-2" /> Exportar CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-500" /> Total de Orçamentos
                </CardTitle>
              </CardHeader>
              <CardContent><p className="text-2xl font-bold">{totalCriados}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" /> Taxa de Conversão
                </CardTitle>
              </CardHeader>
              <CardContent><p className="text-2xl font-bold">{taxaConversao.toFixed(1)}%</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-blue-500" /> Valor Total
                </CardTitle>
              </CardHeader>
              <CardContent><p className="text-2xl font-bold">{fmt(valorTotal)}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                  <BadgeCheck className="h-4 w-4 text-green-500" /> Valor Convertido
                </CardTitle>
              </CardHeader>
              <CardContent><p className="text-2xl font-bold text-green-600">{fmt(valorConvertido)}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-cyan-500" /> Ticket Médio
                </CardTitle>
              </CardHeader>
              <CardContent><p className="text-2xl font-bold">{fmt(ticketMedio)}</p></CardContent>
            </Card>
          </div>

          {/* Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {agenteFiltro === "todos" ? "Orçamentos por Agente" : "Orçamentos por Mês"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color, #334155)" />
                    <XAxis dataKey="name" fontSize={11} tick={{ fill: 'var(--text-secondary, #94A3B8)', fontSize: 12 }} />
                    <YAxis fontSize={11} tick={{ fill: 'var(--text-secondary, #94A3B8)', fontSize: 12 }} allowDecimals={false} />
                    <RechartsTooltip contentStyle={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#F8FAFC' }} />
                    <Legend />
                    <Bar dataKey="aprovado" name="Aprovado" fill={STATUS_COLORS.aprovado} radius={[2, 2, 0, 0]} />
                    <Bar dataKey="emitido" name="Emitido" fill={STATUS_COLORS.emitido} radius={[2, 2, 0, 0]} />
                    <Bar dataKey="pago" name="Pago" fill={STATUS_COLORS.pago} radius={[2, 2, 0, 0]} />
                    <Bar dataKey="perdido" name="Perdido" fill={STATUS_COLORS.perdido} radius={[2, 2, 0, 0]} />
                    <Bar dataKey="enviado" name="Enviado" fill={STATUS_COLORS.enviado} radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState icon={<BarChart3 className="h-9 w-9" />} title="Sem dados no período" description="Crie orçamentos para visualizar o relatório de conversão" />
              )}
            </CardContent>
          </Card>

          {/* Performance Table */}
          <Card>
            <CardHeader><CardTitle className="text-base">Performance por Agente</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8"></TableHead>
                      <TableHead>Agente</TableHead>
                      <TableHead className="text-center">Criados</TableHead>
                      <TableHead className="text-center">Enviados</TableHead>
                      <TableHead className="text-center">Aprovados</TableHead>
                      <TableHead className="text-center">Pagos</TableHead>
                      <TableHead className="text-center">Perdidos</TableHead>
                      <TableHead className="text-center">Conversão</TableHead>
                      <TableHead className="text-right">Valor Total</TableHead>
                      <TableHead className="text-right">Valor Pago</TableHead>
                      <TableHead className="text-right">Ticket Médio</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPerf.length === 0 ? (
                      <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-8">Nenhum dado no período</TableCell></TableRow>
                    ) : filteredPerf.map(agent => {
                      const taxa = agent.criados > 0 ? (agent.pagos / agent.criados) * 100 : 0;
                      const tm = agent.criados > 0 ? agent.valorTotal / agent.criados : 0;
                      const isExpanded = expandedAgent === agent.id;

                      return (
                        <React.Fragment key={agent.id}>
                          <TableRow
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => setExpandedAgent(isExpanded ? null : agent.id)}
                          >
                            <TableCell className="w-8">
                              {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground text-xs font-bold shrink-0">
                                  {getInitials(agent.nome)}
                                </div>
                                <div>
                                  <p className="font-medium text-sm">{agent.nome}</p>
                                  <p className="text-xs text-muted-foreground capitalize">{agent.cargo}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">{agent.criados}</TableCell>
                            <TableCell className="text-center">{agent.enviados}</TableCell>
                            <TableCell className="text-center">{agent.aprovados}</TableCell>
                            <TableCell className="text-center font-medium">{agent.pagos}</TableCell>
                            <TableCell className="text-center text-destructive">{agent.perdidos}</TableCell>
                            <TableCell className="text-center">
                              <span className="font-semibold" style={{ color: getProgressColor(taxa) }}>
                                {taxa.toFixed(1)}%
                              </span>
                            </TableCell>
                            <TableCell className="text-right">{fmt(agent.valorTotal)}</TableCell>
                            <TableCell className="text-right font-medium text-green-600">{fmt(agent.valorPago)}</TableCell>
                            <TableCell className="text-right">{fmt(tm)}</TableCell>
                          </TableRow>

                          {isExpanded && (
                            <TableRow>
                              <TableCell colSpan={11} className="bg-muted/30 p-0">
                                <div className="p-4">
                                  <p className="text-sm font-medium mb-3 text-muted-foreground">
                                    Orçamentos de {agent.nome} no período
                                  </p>
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Nº Orçamento</TableHead>
                                        <TableHead>Cliente</TableHead>
                                        <TableHead className="text-right">Valor</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Data</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {agent.orcamentos.length === 0 ? (
                                        <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-4">Nenhum orçamento</TableCell></TableRow>
                                      ) : agent.orcamentos.map((o: any) => (
                                        <TableRow key={o.id}>
                                          <TableCell className="text-sm font-medium">{o.numero_orcamento || "-"}</TableCell>
                                          <TableCell className="text-sm">{o.cliente_nome}</TableCell>
                                          <TableCell className="text-sm text-right">{fmt(Number(o.valor_final) || 0)}</TableCell>
                                          <TableCell><StatusBadge status={o.status || "rascunho"} /></TableCell>
                                          <TableCell className="text-sm">{o.criado_em ? formatarApenasDatabrasilia(o.criado_em) : "-"}</TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </TableBody>
                  {filteredPerf.length > 1 && (
                    <TableFooter>
                      <TableRow>
                        <TableCell />
                        <TableCell className="font-semibold">Totais</TableCell>
                        <TableCell className="text-center font-semibold">{totals.criados}</TableCell>
                        <TableCell className="text-center font-semibold">{totals.enviados}</TableCell>
                        <TableCell className="text-center font-semibold">{totals.aprovados}</TableCell>
                        <TableCell className="text-center font-semibold">{totals.pagos}</TableCell>
                        <TableCell className="text-center font-semibold">{totals.perdidos}</TableCell>
                        <TableCell className="text-center font-semibold">
                          {totals.criados > 0 ? ((totals.pagos / totals.criados) * 100).toFixed(1) : "0.0"}%
                        </TableCell>
                        <TableCell className="text-right font-semibold">{fmt(totals.valorTotal)}</TableCell>
                        <TableCell className="text-right font-semibold">{fmt(totals.valorPago)}</TableCell>
                        <TableCell className="text-right font-semibold">
                          {totals.criados > 0 ? fmt(totals.valorTotal / totals.criados) : fmt(0)}
                        </TableCell>
                      </TableRow>
                    </TableFooter>
                  )}
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
