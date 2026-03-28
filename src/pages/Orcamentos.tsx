import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, ChevronLeft, ChevronRight, X, Clock, AlertTriangle, Eye, MessageCircle, FileText, Wand2 } from "lucide-react";
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
import { CATEGORIAS_ITEM } from "@/lib/categorias-item";
import { StatusViagemBadge } from "@/components/orcamento/StatusViagemStepper";

const filtroLabels: Record<string, string> = {
  vencendo_hoje: "Vencendo hoje",
  vencendo_em_breve: "Vencendo em breve",
  aguardando: "Aguardando resposta",
};

function getValidadeIndicator(validade: string | null, status: string | null, expirado?: boolean | null, dataValidade?: string | null) {
  // If explicitly marked as expirado
  if (expirado) return { className: "text-muted-foreground line-through", icon: Clock, label: "Expirado" };
  // Use data_validade if available, fallback to validade
  const dateStr = dataValidade || validade;
  if (!dateStr || !["rascunho", "enviado"].includes(status || "")) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const val = new Date(dateStr + "T00:00:00");
  const diffDays = Math.ceil((val.getTime() - today.getTime()) / 86400000);
  if (diffDays < 0) return { className: "text-destructive font-semibold", icon: Clock, label: "Expirado" };
  if (diffDays === 0) return { className: "text-warning font-bold", icon: AlertTriangle, label: "Expira hoje" };
  if (diffDays <= 3) return { className: "text-warning", icon: AlertTriangle, label: `Expira em ${diffDays}d` };
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
  const [categoriaFilter, setCategoriaFilter] = useState("todas");
  const [page, setPage] = useState(0);
  const [ordenacao, setOrdenacao] = useState({ campo: "criado_em", direcao: "desc" as "asc" | "desc" });
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [statusViagemFilter, setStatusViagemFilter] = useState(() => searchParams.get("status_viagem") || "todas");

  const handleSort = (campo: string, direcao: "asc" | "desc") => {
    setOrdenacao({ campo, direcao });
    setPage(0);
  };

  const clearFiltro = () => {
    searchParams.delete("filtro");
    setSearchParams(searchParams);
  };

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["orcamentos", agenciaId, statusFilter, categoriaFilter, statusViagemFilter, search, page, filtroAlerta, ordenacao.campo, ordenacao.direcao],
    enabled: !!agenciaId,
    staleTime: 30 * 1000,
    queryFn: async () => {
      let query = supabase
        .from("orcamentos")
        .select("id, titulo, valor_final, status, status_viagem, validade, data_validade, expirado, criado_em, enviado_whatsapp, enviado_whatsapp_em, email_aberto_em, clientes(nome)", { count: "exact" })
        .eq("agencia_id", agenciaId!)
        .order(ordenacao.campo, { ascending: ordenacao.direcao === "asc" });

      // Resolve orcamento IDs that match the categoria filter (two-step)
      if (categoriaFilter !== "todas" && !filtroAlerta) {
        const { data: matchItens } = await supabase
          .from("itens_orcamento")
          .select("orcamento_id")
          .eq("categoria", categoriaFilter);
        const ids = [...new Set((matchItens ?? []).map((r) => r.orcamento_id))];
        if (ids.length === 0) return { rows: [], count: 0 };
        query = query.in("id", ids);
      }

      if (statusViagemFilter !== "todas") {
        query = query.eq("status_viagem", statusViagemFilter);
      }

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
      <div className="flex items-center justify-between flex-wrap gap-2 mb-8">
        <h2 className="text-3xl font-bold font-display tracking-tight text-on-surface">Orçamentos</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setAiModalOpen(true)}
            className="gap-2"
          >
            <Wand2 className="h-4 w-4" />
            Gerar com IA
          </Button>
          <Button variant="default" asChild>
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
          <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[160px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por título..." className="pl-9" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
              <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                <SelectItem value="rascunho">Rascunho</SelectItem>
                <SelectItem value="enviado">Enviado</SelectItem>
                <SelectItem value="aprovado">Aprovado</SelectItem>
                <SelectItem value="perdido">Perdido</SelectItem>
                <SelectItem value="emitido">Emitido</SelectItem>
                <SelectItem value="pago">Pago</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoriaFilter} onValueChange={(v) => { setCategoriaFilter(v); setPage(0); }}>
              <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Categoria de item" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as categorias</SelectItem>
                {CATEGORIAS_ITEM.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    <span className="flex items-center gap-1.5">{c.emoji} {c.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusViagemFilter} onValueChange={(v) => { setStatusViagemFilter(v); setPage(0); }}>
              <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="Viagem" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as viagens</SelectItem>
                <SelectItem value="cotacao">Em cotação</SelectItem>
                <SelectItem value="confirmado">Confirmado</SelectItem>
                <SelectItem value="em_viagem">Em viagem</SelectItem>
                <SelectItem value="concluido">Concluído</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : isError ? (
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
              <p className="font-semibold mb-1">Erro ao carregar orçamentos</p>
              <p className="font-mono text-xs opacity-80">{(error as Error)?.message ?? "Erro desconhecido"}</p>
              <p className="mt-2 text-muted-foreground text-xs">Se a mensagem mencionar uma coluna inexistente, verifique se todas as migrations foram aplicadas ao banco.</p>
            </div>
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
                    <TableHead>Viagem</TableHead>
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
                          {(o as any).email_aberto_em && (
                            <Tooltip>
                              <TooltipTrigger asChild><Eye className="h-3.5 w-3.5 text-primary cursor-help" /></TooltipTrigger>
                              <TooltipContent>
                                Email aberto em {new Date((o as any).email_aberto_em).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                              </TooltipContent>
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
                          const ind = getValidadeIndicator(o.validade, o.status, (o as any).expirado, (o as any).data_validade);
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
                      <TableCell><StatusViagemBadge status={(o as any).status_viagem} /></TableCell>
                    </TableRow>
                  ))}
                  {data?.rows?.length === 0 && (
                    <TableRow><TableCell colSpan={7}>
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
