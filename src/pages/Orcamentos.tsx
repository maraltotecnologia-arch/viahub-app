import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import useAgenciaId from "@/hooks/useAgenciaId";
import { useIsMobile } from "@/hooks/use-mobile";

const statusVariant: Record<string, "muted" | "default" | "success" | "destructive" | "info"> = {
  rascunho: "muted", enviado: "default", aprovado: "success", perdido: "destructive", emitido: "info",
};

const PAGE_SIZE = 20;
const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function Orcamentos() {
  const agenciaId = useAgenciaId();
  const isMobile = useIsMobile();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["orcamentos", agenciaId, statusFilter, search, page],
    enabled: !!agenciaId,
    queryFn: async () => {
      let query = supabase
        .from("orcamentos")
        .select("id, titulo, valor_final, status, validade, criado_em, enviado_whatsapp, clientes(nome)", { count: "exact" })
        .eq("agencia_id", agenciaId!)
        .order("criado_em", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (statusFilter !== "todos") query = query.eq("status", statusFilter);
      if (search.trim()) query = query.or(`titulo.ilike.%${search}%`);

      const { data, error, count } = await query;
      if (error) throw error;
      return { rows: data, count: count ?? 0 };
    },
  });

  const totalPages = Math.ceil((data?.count ?? 0) / PAGE_SIZE);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-2xl font-bold">Orçamentos</h2>
        <Button variant="gradient" asChild>
          <Link to="/orcamentos/novo"><Plus className="h-4 w-4 mr-2" /> Novo Orçamento</Link>
        </Button>
      </div>

      <Card>
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
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : isMobile ? (
            /* Mobile: stacked cards */
            <div className="space-y-3">
              {data?.rows?.map((o) => (
                <Link key={o.id} to={`/orcamentos/${o.id}`} className="block">
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{(o.clientes as any)?.nome || "Sem cliente"}</span>
                        <Badge variant={statusVariant[o.status || "rascunho"]}>{o.status}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{o.titulo || "Sem título"}</p>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold">{fmt(Number(o.valor_final) || 0)}</span>
                        <span className="text-muted-foreground text-xs">{o.criado_em ? new Date(o.criado_em).toLocaleDateString("pt-BR") : "-"}</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
              {data?.rows?.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhum orçamento encontrado</p>}
            </div>
          ) : (
            /* Desktop: table */
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead>Valor Final</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Validade</TableHead>
                    <TableHead>Criado em</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.rows?.map((o) => (
                    <TableRow key={o.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell>
                        <Link to={`/orcamentos/${o.id}`} className="font-medium hover:text-primary">
                          {(o.clientes as any)?.nome || "Sem cliente"}
                        </Link>
                      </TableCell>
                      <TableCell>{o.titulo || "Sem título"}</TableCell>
                      <TableCell className="font-semibold">{fmt(Number(o.valor_final) || 0)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Badge variant={statusVariant[o.status || "rascunho"]}>{o.status}</Badge>
                          {(o as any).enviado_whatsapp && <span title="Enviado via WhatsApp" className="text-[#25D366]">📱</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{o.validade ? new Date(o.validade).toLocaleDateString("pt-BR") : "-"}</TableCell>
                      <TableCell className="text-muted-foreground">{o.criado_em ? new Date(o.criado_em).toLocaleDateString("pt-BR") : "-"}</TableCell>
                    </TableRow>
                  ))}
                  {data?.rows?.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum orçamento encontrado</TableCell></TableRow>
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
    </div>
  );
}
