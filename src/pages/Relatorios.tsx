import React, { useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, eachDayOfInterval, eachMonthOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import StatusBadge from "@/components/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { CalendarIcon, Download, Filter, BarChart2, BadgeCheck, TrendingUp, PieChart as PieChartIcon, FileDown } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import useAgenciaId from "@/hooks/useAgenciaId";

import SortableTableHead from "@/components/SortableTableHead";
import { formatarApenasDatabrasilia } from "@/lib/date-utils";
import { pdf } from "@react-pdf/renderer";
import RelatorioPDFDocument from "@/components/pdf/RelatorioPDFDocument";
import type { RelatorioPDFProps } from "@/components/pdf/RelatorioPDFDocument";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RelatorioAgentes from "@/components/relatorios/RelatorioAgentes";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const PERIODOS = [
  { value: "este_mes", label: "Este mês" },
  { value: "mes_anterior", label: "Mês anterior" },
  { value: "ultimos_3", label: "Últimos 3 meses" },
  { value: "ultimos_6", label: "Últimos 6 meses" },
  { value: "este_ano", label: "Este ano" },
  { value: "personalizado", label: "Personalizado" },
];

const TIPOS_SERVICO = ["Aéreo", "Hotel", "Pacote", "Passeio", "Seguro", "Transfer"];
const STATUS_OPTIONS = ["Todos", "aprovado", "emitido", "pago"];
const PIE_COLORS = ["#2563EB", "#06B6D4", "#8B5CF6", "#F59E0B", "#10B981", "#EF4444"];
const PAGE_SIZE = 20;

function getDateRange(periodo: string, customStart?: Date, customEnd?: Date) {
  const now = new Date();
  switch (periodo) {
    case "mes_anterior": return { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) };
    case "ultimos_3": return { start: startOfMonth(subMonths(now, 2)), end: endOfMonth(now) };
    case "ultimos_6": return { start: startOfMonth(subMonths(now, 5)), end: endOfMonth(now) };
    case "este_ano": return { start: startOfYear(now), end: endOfYear(now) };
    case "personalizado": return { start: customStart || startOfMonth(now), end: customEnd || endOfMonth(now) };
    default: return { start: startOfMonth(now), end: endOfMonth(now) };
  }
}

export default function Relatorios() {
  const agenciaId = useAgenciaId();
  const [periodo, setPeriodo] = useState("este_mes");
  const [tiposFiltro, setTiposFiltro] = useState<string[]>([]);
  const [statusFiltro, setStatusFiltro] = useState("Todos");
  const [customStart, setCustomStart] = useState<Date | undefined>();
  const [customEnd, setCustomEnd] = useState<Date | undefined>();
  const [page, setPage] = useState(0);
  const [ordenacao, setOrdenacao] = useState({ campo: "criado_em", direcao: "desc" as "asc" | "desc" });
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const { data: agenciaData } = useQuery({
    queryKey: ["agencia-relatorio", agenciaId],
    enabled: !!agenciaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agencias")
        .select("nome_fantasia, logo_url, plano")
        .eq("id", agenciaId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const handleSort = (campo: string, direcao: "asc" | "desc") => {
    setOrdenacao({ campo, direcao });
    setPage(0);
  };

  const [appliedFilters, setAppliedFilters] = useState({
    periodo: "este_mes",
    tipos: [] as string[],
    status: "Todos",
    customStart: undefined as Date | undefined,
    customEnd: undefined as Date | undefined,
  });

  const dateRange = useMemo(() => getDateRange(appliedFilters.periodo, appliedFilters.customStart, appliedFilters.customEnd), [appliedFilters]);

  const { data: rawData, isLoading } = useQuery({
    queryKey: ["relatorios", agenciaId, dateRange.start.toISOString(), dateRange.end.toISOString(), appliedFilters.status],
    enabled: !!agenciaId,
    queryFn: async () => {
      let query = supabase
        .from("orcamentos")
        .select("id, numero_orcamento, criado_em, valor_final, lucro_bruto, margem_percentual, status, cliente_id, clientes(nome), itens_orcamento(tipo)")
        .eq("agencia_id", agenciaId!)
        .gte("criado_em", dateRange.start.toISOString())
        .lte("criado_em", dateRange.end.toISOString())
        .order("criado_em", { ascending: false });

      if (appliedFilters.status !== "Todos") {
        query = query.eq("status", appliedFilters.status);
      } else {
        query = query.in("status", ["aprovado", "emitido", "pago"]);
      }

      const { data: orcamentos, error } = await query;
      if (error) throw error;

      return (orcamentos || []).map((o) => {
        const tipos = (o.itens_orcamento as any[] || []).map((i: any) => i.tipo as string);
        const uniqueTipos = [...new Set(tipos)];
        return {
          ...o,
          cliente_nome: (o.clientes as any)?.nome || "Sem cliente",
          tipos_servico: uniqueTipos,
        };
      });
    },
  });

  const filteredData = useMemo(() => {
    if (!rawData) return [];
    let result = rawData.filter((o) => {
      if (appliedFilters.status !== "Todos" && o.status !== appliedFilters.status) return false;
      if (appliedFilters.tipos.length > 0 && !o.tipos_servico.some((t) => appliedFilters.tipos.includes(t))) return false;
      return true;
    });
    // Client-side sort
    const { campo, direcao } = ordenacao;
    result.sort((a, b) => {
      let va: any = (a as any)[campo];
      let vb: any = (b as any)[campo];
      if (campo === "valor_final" || campo === "lucro_bruto" || campo === "margem_percentual") {
        va = Number(va) || 0;
        vb = Number(vb) || 0;
      }
      if (va == null) va = "";
      if (vb == null) vb = "";
      if (va < vb) return direcao === "asc" ? -1 : 1;
      if (va > vb) return direcao === "asc" ? 1 : -1;
      return 0;
    });
    return result;
  }, [rawData, appliedFilters, ordenacao]);

  const applyFilters = () => {
    setAppliedFilters({ periodo, tipos: tiposFiltro, status: statusFiltro, customStart, customEnd });
    setPage(0);
  };

  // Summary cards
  const plano = agenciaData?.plano;
  const faturamentoBruto = filteredData.reduce((s, o) => s + (Number(o.valor_final) || 0), 0);
  const totalComissoes = filteredData.reduce((s, o) => {
    const lucro = Number(o.lucro_bruto) || 0;
    return s + Math.max(lucro, 0);
  }, 0);
  const ticketMedio = filteredData.length > 0 ? faturamentoBruto / filteredData.length : 0;
  const totalOrcamentos = filteredData.length;

  // Payment metrics
  const pagos = filteredData.filter((o) => o.status === "pago");
  const totalRecebido = pagos.reduce((s, o) => s + (Number(o.valor_final) || 0), 0);
  const ticketMedioRecebido = pagos.length > 0 ? totalRecebido / pagos.length : 0;
  const aprovadosTotal = filteredData.filter((o) => ["aprovado", "emitido", "pago"].includes(o.status || "")).reduce((s, o) => s + (Number(o.valor_final) || 0), 0);
  const percentConvertidoCaixa = aprovadosTotal > 0 ? Math.round((totalRecebido / aprovadosTotal) * 100) : 0;

  // Bar chart data
  const barData = useMemo(() => {
    const diffMs = dateRange.end.getTime() - dateRange.start.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    if (diffDays <= 35) {
      const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
      return days.map((d) => {
        const key = format(d, "dd/MM");
        const dayItems = filteredData.filter((o) => o.criado_em && format(new Date(o.criado_em), "yyyy-MM-dd") === format(d, "yyyy-MM-dd"));
        return { name: key, valor: dayItems.reduce((s, o) => s + (Number(o.valor_final) || 0), 0) };
      });
    } else {
      const months = eachMonthOfInterval({ start: dateRange.start, end: dateRange.end });
      return months.map((m) => {
        const key = format(m, "MMM/yy", { locale: ptBR });
        const mItems = filteredData.filter((o) => o.criado_em && format(new Date(o.criado_em), "yyyy-MM") === format(m, "yyyy-MM"));
        return { name: key, valor: mItems.reduce((s, o) => s + (Number(o.valor_final) || 0), 0) };
      });
    }
  }, [filteredData, dateRange]);

  // Pie chart data
  const pieData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredData.forEach((o) => {
      // Distribute lucro_bruto evenly across service types
      const tipos = o.tipos_servico.length > 0 ? o.tipos_servico : ["Outros"];
      const share = (Number(o.lucro_bruto) || 0) / tipos.length;
      tipos.forEach((t) => { map[t] = (map[t] || 0) + share; });
    });
    return Object.entries(map)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }));
  }, [filteredData]);

  const pieTotal = pieData.reduce((s, d) => s + d.value, 0);

  // Pagination
  const pagedData = filteredData.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filteredData.length / PAGE_SIZE);

  // CSV Export
  const escapeCsv = (value: string | null | undefined) => {
    if (value === null || value === undefined) return "";
    const str = String(value);
    if (str.includes(";") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const exportarCSV = () => {
    const headers = ["Data", "Nº Orçamento", "Cliente", "Valor Final", "Lucro Bruto", "Margem %", "Status"];
    const rows = filteredData.map((o) => [
      o.criado_em ? format(new Date(o.criado_em), "dd/MM/yyyy") : "-",
      escapeCsv(o.numero_orcamento || "-"),
      escapeCsv(o.cliente_nome),
      (Number(o.valor_final) || 0).toFixed(2).replace(".", ","),
      (Number(o.lucro_bruto) || 0).toFixed(2).replace(".", ","),
      (Number(o.margem_percentual) || 0).toFixed(1) + "%",
      escapeCsv(o.status),
    ]);
    const csv = [headers, ...rows].map((r) => r.join(";")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio_${format(new Date(), "MM-yyyy")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // PDF Export
  const exportarPDF = async () => {
    if (!agenciaData) { toast.error("Dados da agência não carregados"); return; }
    setGeneratingPdf(true);
    try {
      const filtroParts: string[] = [];
      const periodoLabel = PERIODOS.find((p) => p.value === appliedFilters.periodo)?.label || appliedFilters.periodo;
      if (appliedFilters.periodo !== "este_mes") filtroParts.push(`Período: ${periodoLabel}`);
      if (appliedFilters.tipos.length > 0) filtroParts.push(`Tipos: ${appliedFilters.tipos.join(", ")}`);
      if (appliedFilters.status !== "Todos") filtroParts.push(`Status: ${appliedFilters.status}`);

      const pdfData: RelatorioPDFProps = {
        agenciaNome: agenciaData.nome_fantasia || "Agência",
        logoUrl: agenciaData.logo_url,
        periodoLabel,
        dateStart: format(dateRange.start, "dd/MM/yyyy"),
        dateEnd: format(dateRange.end, "dd/MM/yyyy"),
        filtrosTexto: filtroParts.length > 0 ? filtroParts.join(" · ") : undefined,
        faturamentoBruto,
        totalComissoes,
        ticketMedio,
        totalOrcamentos,
        totalRecebido,
        ticketMedioRecebido,
        percentConvertidoCaixa,
        orcamentos: filteredData.map((o) => ({
          numero_orcamento: o.numero_orcamento,
          cliente_nome: o.cliente_nome,
          tipos_servico: o.tipos_servico,
          valor_final: Number(o.valor_final) || 0,
          status: o.status || "rascunho",
          criado_em: o.criado_em,
        })),
      };

      const blob = await pdf(<RelatorioPDFDocument data={pdfData} />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const nomeAgencia = (agenciaData.nome_fantasia || "agencia").toLowerCase().replace(/\s+/g, "-").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      link.href = url;
      link.download = `relatorio-${nomeAgencia}-${format(new Date(), "MM-yyyy")}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("PDF gerado com sucesso!");
    } catch (e) {
      console.error("Erro ao gerar PDF:", e);
      toast.error("Erro ao gerar PDF");
    } finally {
      setGeneratingPdf(false);
    }
  };

  const toggleTipo = (tipo: string) => {
    setTiposFiltro((prev) => prev.includes(tipo) ? prev.filter((t) => t !== tipo) : [...prev, tipo]);
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Relatórios</h2>
      </div>

      <Tabs defaultValue="financeiro" className="space-y-6">
        <TabsList>
          <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
          <TabsTrigger value="agentes">Por Agente</TabsTrigger>
        </TabsList>

        <TabsContent value="agentes">
          <RelatorioAgentes />
        </TabsContent>

        <TabsContent value="financeiro" className="space-y-6">
      <div className="flex items-center justify-end">
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportarPDF} disabled={filteredData.length === 0 || generatingPdf}>
            <FileDown className="h-4 w-4 mr-2" /> {generatingPdf ? "Gerando..." : "Exportar PDF"}
          </Button>
          <Button variant="outline" onClick={exportarCSV} disabled={filteredData.length === 0}>
            <Download className="h-4 w-4 mr-2" /> Exportar CSV
          </Button>
        </div>
      </div>

      {/* FILTERS */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Período</label>
              <Select value={periodo} onValueChange={setPeriodo}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PERIODOS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {periodo === "personalizado" && (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Início</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-[150px] justify-start text-left font-normal", !customStart && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customStart ? format(customStart, "dd/MM/yyyy") : "Selecionar"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={customStart} onSelect={setCustomStart} initialFocus className="p-3 pointer-events-auto" fromYear={2020} toYear={2099} disabled={(date) => date.getFullYear() < 2020 || date.getFullYear() > 2099} />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Fim</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-[150px] justify-start text-left font-normal", !customEnd && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customEnd ? format(customEnd, "dd/MM/yyyy") : "Selecionar"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={customEnd} onSelect={setCustomEnd} initialFocus className="p-3 pointer-events-auto" fromYear={2020} toYear={2099} disabled={(date) => date.getFullYear() < 2020 || date.getFullYear() > 2099} />
                    </PopoverContent>
                  </Popover>
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <Select value={statusFiltro} onValueChange={setStatusFiltro}>
                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>{s === "Todos" ? "Todos" : s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Tipo de Serviço</label>
              <div className="flex flex-wrap gap-1.5">
                {TIPOS_SERVICO.map((t) => (
                  <Badge
                    key={t}
                    variant={tiposFiltro.includes(t) ? "default" : "outline"}
                    className="cursor-pointer text-xs"
                    style={!tiposFiltro.includes(t) ? { background: 'transparent', borderColor: 'var(--border-input)', color: 'var(--text-primary)' } : { background: 'var(--accent-primary)', borderColor: 'var(--accent-primary)', color: '#FFFFFF' }}
                    onClick={() => toggleTipo(t)}
                  >
                    {t}
                  </Badge>
                ))}
              </div>
            </div>

            <Button onClick={applyFilters} className="shrink-0">
              <Filter className="h-4 w-4 mr-2" /> Aplicar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : (
        <>
          {/* SUMMARY CARDS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Faturamento Bruto</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{fmt(faturamentoBruto)}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Lucro Bruto</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold text-primary">{fmt(totalComissoes)}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Ticket Médio</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{fmt(ticketMedio)}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total de Orçamentos</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{totalOrcamentos}</p></CardContent>
            </Card>
          </div>

          {/* PAYMENT CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                  <BadgeCheck className="h-4 w-4 text-green-500 dark:text-green-400" /> Total Recebido
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{fmt(totalRecebido)}</p>
                <p className="text-xs text-muted-foreground mt-1">confirmado pelos agentes</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-600" /> Ticket Médio Recebido
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{fmt(ticketMedioRecebido)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                  <PieChartIcon className="h-4 w-4 text-cyan-600" /> % Convertido em Caixa
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{percentConvertidoCaixa}%</p>
              </CardContent>
            </Card>
          </div>

          {/* CHARTS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Faturamento por Período</CardTitle></CardHeader>
              <CardContent>
                {barData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={barData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                      <XAxis dataKey="name" fontSize={11} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} axisLine={{ stroke: 'var(--border-color)' }} tickLine={{ stroke: 'var(--border-color)' }} />
                      <YAxis fontSize={11} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} axisLine={{ stroke: 'var(--border-color)' }} tickLine={{ stroke: 'var(--border-color)' }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                      <RechartsTooltip formatter={(v: number) => fmt(v)} labelClassName="font-medium" contentStyle={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#F8FAFC' }} labelStyle={{ color: '#F8FAFC' }} itemStyle={{ color: '#CBD5E1' }} />
                      <Bar dataKey="valor" fill="#2563EB" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState icon={<BarChart2 className="h-9 w-9" />} title="Sem dados no período" description="Aprove orçamentos para começar a ver seus relatórios financeiros" />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Lucro por Tipo de Serviço</CardTitle></CardHeader>
              <CardContent>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value" label={({ name, value }) => `${name} ${pieTotal > 0 ? ((value / pieTotal) * 100).toFixed(0) : 0}%`}>
                        {pieData.map((_, idx) => <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />)}
                      </Pie>
                      <RechartsTooltip formatter={(v: number) => fmt(v)} contentStyle={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#F8FAFC' }} labelStyle={{ color: '#F8FAFC' }} itemStyle={{ color: '#CBD5E1' }} />
                      <Legend wrapperStyle={{ color: 'var(--text-secondary)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState icon={<BarChart2 className="h-9 w-9" />} title="Sem dados no período" description="Aprove orçamentos para começar a ver seus relatórios financeiros" />
                )}
              </CardContent>
            </Card>
          </div>

          {/* TABLE */}
          <Card>
            <CardHeader><CardTitle className="text-base">Orçamentos do Período</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortableTableHead label="Data" field="criado_em" currentField={ordenacao.campo} currentDirection={ordenacao.direcao} defaultField="criado_em" onSort={handleSort} />
                      <TableHead>Nº Orçamento</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Tipo</TableHead>
                      <SortableTableHead label="Valor Final" field="valor_final" currentField={ordenacao.campo} currentDirection={ordenacao.direcao} defaultField="criado_em" onSort={handleSort} className="text-right" />
                      <SortableTableHead label="Lucro" field="lucro_bruto" currentField={ordenacao.campo} currentDirection={ordenacao.direcao} defaultField="criado_em" onSort={handleSort} className="text-right" />
                      <SortableTableHead label="Margem %" field="margem_percentual" currentField={ordenacao.campo} currentDirection={ordenacao.direcao} defaultField="criado_em" onSort={handleSort} className="text-right" />
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedData.length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhum orçamento no período</TableCell></TableRow>
                    ) : pagedData.map((o) => (
                      <TableRow key={o.id}>
                        <TableCell className="text-sm">{o.criado_em ? formatarApenasDatabrasilia(o.criado_em) : "-"}</TableCell>
                        <TableCell className="text-sm font-medium">{o.numero_orcamento || "-"}</TableCell>
                        <TableCell className="text-sm">{o.cliente_nome}</TableCell>
                        <TableCell className="text-sm">{o.tipos_servico.join(", ") || "-"}</TableCell>
                        <TableCell className="text-sm text-right">{fmt(Number(o.valor_final) || 0)}</TableCell>
                        <TableCell className="text-sm text-right">{fmt(Number(o.lucro_bruto) || 0)}</TableCell>
                        <TableCell className="text-sm text-right">{(Number(o.margem_percentual) || 0).toFixed(1)}%</TableCell>
                        <TableCell><StatusBadge status={o.status || "rascunho"} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  {filteredData.length > 0 && (
                    <TableFooter>
                      <TableRow>
                        <TableCell colSpan={4} className="font-semibold">Totais</TableCell>
                        <TableCell className="text-right font-semibold">{fmt(faturamentoBruto)}</TableCell>
                        <TableCell className="text-right font-semibold">{fmt(totalComissoes)}</TableCell>
                        <TableCell className="text-right font-semibold">{filteredData.length > 0 ? (totalComissoes / faturamentoBruto * 100).toFixed(1) : "0.0"}%</TableCell>
                        <TableCell />
                      </TableRow>
                    </TableFooter>
                  )}
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Página {page + 1} de {totalPages} ({filteredData.length} resultados)
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
                    <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>Próxima</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
