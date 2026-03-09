import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, ChevronLeft, ChevronRight, X, Clock, AlertTriangle, MessageCircle, FileText, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import useAgenciaId from "@/hooks/useAgenciaId";
import { useIsMobile } from "@/hooks/use-mobile";
import useVerificarVencidos from "@/hooks/useVerificarVencidos";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import SortableTableHead from "@/components/SortableTableHead";
import StatusBadge from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import EmptyState from "@/components/EmptyState";
import { formatarApenasDatabrasilia } from "@/lib/date-utils";
import AICopilotModal from "@/components/ai/AICopilotModal";

const filtroLabels: Record<string, string> = {
  vencendo_hoje: "Vencendo hoje",
  vencendo_em_breve: "Vencendo em breve",
  aguardando: "Aguardando resposta",
};

function getValidadeIndicator(validade: string | null, status: string | null) {
  if (!validade || !["rascunho", "enviado"].includes(status || "")) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const val = new Date(validade + "T00:00:00");
  const diffDays = Math.ceil((val.getTime() - today.getTime()) / 86400000);
  if (diffDays < 0) return { className: "text-destructive font-semibold", icon: Clock, label: "Vencido" };
  if (diffDays === 0) return { className: "text-warning font-bold", icon: AlertTriangle, label: "Vence hoje" };
  if (diffDays <= 3) return { className: "text-warning", icon: AlertTriangle, label: `Vence em ${diffDays}d` };
  return null;
}

const PAGE_SIZE = 20;
const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function Orcamentos() {
  const agenciaId = useAgenciaId();
  useVerificarVencidos(agenciaId);
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  const filtroAlerta = searchParams.get("filtro");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [page, setPage] = useState(0);
  const [ordenacao, setOrdenacao] = useState({ campo: "criado_em", direcao: "desc" as "asc" | "desc" });
  const [aiModalOpen, setAiModalOpen] = useState(false);

  const handleSort = (campo: string, direcao: "asc" | "desc") => {
    setOrdenacao({ campo, direcao });
    setPage(0);
  };

  const clearFiltro = () => {
    searchParams.delete("filtro");
    setSearchParams(searchParams);
  };

  const { data, isLoading } = useQuery({
    queryKey: ["orcamentos", agenciaId, statusFilter, search, page, filtroAlerta, ordenacao.campo, ordenacao.direcao],
    enabled: !!agenciaId,
    queryFn: async () => {
      let query = supabase
        .from("orcamentos")
        .select("id, titulo, valor_final, status, validade, criado_em, enviado_whatsapp, enviado_whatsapp_em, clientes(nome)", { count: "exact" })
        .eq("agencia_id", agenciaId!)
        .order(ordenacao.campo, { ascending: ordenacao.direcao === "asc" });

      if (filtroAlerta === "vencendo_hoje") {
        const today = new Date().toISOString().slice(0, 10);
        query = query.in("status", ["rascunho", "enviado"]).eq("validade", today);
      } else if (filtroAlerta === "vencendo_em_breve") {
        const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
        const in3days = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
        query = query.in("status", ["rascunho", "enviado"]).gte("validade", tomorrow).lte("validade", in3days);
      } else if (filtroAlerta === "aguardando") {
        const oneDayAgo = new Date(Date.now() - 1 * 86400000).toISOString();
        query = query.eq("status", "enviado").not("enviado_whatsapp_em", "is", null).lt("enviado_whatsapp_em", oneDayAgo);
      } else {
        if (statusFilter !== "todos") query = query.eq("status", statusFilter);
        if (search.trim()) query = query.or(`titulo.ilike.%${search}%`);
        query = query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { rows: data, count: count ?? 0 };
    },
  });

  const totalPages = Math.ceil((data?.count ?? 0) / PAGE_SIZE);
  const now = new Date();

  return (
    <TooltipProvider>
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-2xl font-bold">Orçamentos</h2>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setAiModalOpen(true)}
            className="gap-2 font-semibold text-white border-0 shadow-md hover:shadow-lg transition-all"
            style={{ background: "var(--accent-gradient)" }}
          >
            <Sparkles className="h-4 w-4" />
            Gerar com IA ✨
          </Button>
          <Button variant="gradient" asChild>
            <Link to="/orcamentos/novo"><Plus className="h-4 w-4 mr-2" /> Novo Orçamento</Link>
          </Button>
        </div>
      </div>

      {filtroAlerta && filtroLabels[filtroAlerta] && (
        <div className="flex items-center gap-2">
          <Badge variant="default" className="text-sm px-3 py-1">{filtroLabels[filtroAlerta]}</Badge>
          <Button variant="ghost" size="sm" onClick={clearFiltro}><X className="h-4 w-4 mr-1" /> Limpar filtro</Button>
        </div>
      )}

      <Card className="rounded-2xl">
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por título..." className="pl-9" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
              <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="rascunho">Rascunho</SelectItem>
                <SelectItem value="enviado">Enviado</SelectItem>
                <SelectItem value="aprovado">Aprovado</SelectItem>
                <SelectItem value="perdido">Perdido</SelectItem>
                <SelectItem value="emitido">Emitido</SelectItem>
                <SelectItem value="pago">Pago</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : isMobile ? (
            <div className="space-y-3">
              {data?.rows?.map((o) => (
                <Link key={o.id} to={`/orcamentos/${o.id}`} className="block">
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{(o.clientes as any)?.nome || "Sem cliente"}</span>
                        <div className="flex items-center gap-1">
                          <StatusBadge status={o.status || "rascunho"} />
                          {o.status === "perdido" && o.validade && new Date(o.validade) < now && (
                            <Tooltip>
                              <TooltipTrigger asChild><Clock className="h-3.5 w-3.5 text-destructive cursor-help" /></TooltipTrigger>
                              <TooltipContent>Movido para Perdido por vencimento</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{o.titulo || "Sem título"}</p>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold">{fmt(Number(o.valor_final) || 0)}</span>
                        <span className="text-muted-foreground text-xs">{o.criado_em ? formatarApenasDatabrasilia(o.criado_em) : "-"}</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
              {data?.rows?.length === 0 && (
                <EmptyState
                  icon={<FileText className="h-9 w-9" />}
                  title="Nenhum orçamento ainda"
                  description="Crie seu primeiro orçamento e comece a fechar negócios"
                  actionLabel="Criar primeiro orçamento"
                  onAction={() => window.location.href = "/orcamentos/novo"}
                />
              )}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <SortableTableHead label="Título" field="titulo" currentField={ordenacao.campo} currentDirection={ordenacao.direcao} defaultField="criado_em" onSort={handleSort} />
                    <SortableTableHead label="Valor Final" field="valor_final" currentField={ordenacao.campo} currentDirection={ordenacao.direcao} defaultField="criado_em" onSort={handleSort} />
                    <SortableTableHead label="Status" field="status" currentField={ordenacao.campo} currentDirection={ordenacao.direcao} defaultField="criado_em" onSort={handleSort} />
                    <SortableTableHead label="Validade" field="validade" currentField={ordenacao.campo} currentDirection={ordenacao.direcao} defaultField="criado_em" onSort={handleSort} />
                    <SortableTableHead label="Criado em" field="criado_em" currentField={ordenacao.campo} currentDirection={ordenacao.direcao} defaultField="criado_em" onSort={handleSort} />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.rows?.map((o) => (
                    <TableRow key={o.id} className="cursor-pointer">
                      <TableCell>
                        <Link to={`/orcamentos/${o.id}`} className="font-medium hover:text-primary">
                          {(o.clientes as any)?.nome || "Sem cliente"}
                        </Link>
                      </TableCell>
                      <TableCell>{o.titulo || "Sem título"}</TableCell>
                      <TableCell className="font-semibold">{fmt(Number(o.valor_final) || 0)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <StatusBadge status={o.status || "rascunho"} />
                          {(o as any).enviado_whatsapp && (
                            <Tooltip>
                              <TooltipTrigger asChild><MessageCircle className="h-3.5 w-3.5 text-success cursor-help" /></TooltipTrigger>
                              <TooltipContent>Enviado via WhatsApp</TooltipContent>
                            </Tooltip>
                          )}
                          {o.status === "perdido" && o.validade && new Date(o.validade) < now && (
                            <Tooltip>
                              <TooltipTrigger asChild><Clock className="h-3.5 w-3.5 text-destructive cursor-help" /></TooltipTrigger>
                              <TooltipContent>Movido para Perdido por vencimento</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const ind = getValidadeIndicator(o.validade, o.status);
                          if (!ind) return <span className="text-muted-foreground">{o.validade ? formatarApenasDatabrasilia(o.validade + "T12:00:00") : "-"}</span>;
                          const IndIcon = ind.icon;
                          return (
                            <span className={`inline-flex items-center gap-1 ${ind.className}`}>
                              <IndIcon className="h-3.5 w-3.5" />
                              {o.validade ? formatarApenasDatabrasilia(o.validade + "T12:00:00") : "-"}
                            </span>
                          );
                        })()}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{o.criado_em ? formatarApenasDatabrasilia(o.criado_em) : "-"}</TableCell>
                    </TableRow>
                  ))}
                  {data?.rows?.length === 0 && (
                    <TableRow><TableCell colSpan={6}>
                      <EmptyState
                        icon={<FileText className="h-9 w-9" />}
                        title="Nenhum orçamento ainda"
                        description="Crie seu primeiro orçamento e comece a fechar negócios"
                        actionLabel="Criar primeiro orçamento"
                        onAction={() => window.location.href = "/orcamentos/novo"}
                      />
                    </TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">Página {page + 1} de {totalPages}</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                    <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}><ChevronRight className="h-4 w-4" /></Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
      <AICopilotModal open={aiModalOpen} onOpenChange={setAiModalOpen} />
    </div>
    </TooltipProvider>
  );
}
