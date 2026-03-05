import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight } from "lucide-react";

const PER_PAGE = 20;

const periodos = [
  { value: "7", label: "Últimos 7 dias" },
  { value: "30", label: "Últimos 30 dias" },
  { value: "90", label: "Últimos 3 meses" },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

export default function LogsAcessoAgencia({ agenciaId }: { agenciaId: string }) {
  const [periodo, setPeriodo] = useState("30");
  const [page, setPage] = useState(0);

  const since = new Date();
  since.setDate(since.getDate() - Number(periodo));
  const sinceISO = since.toISOString();

  const { data, isLoading } = useQuery({
    queryKey: ["logs-acesso", agenciaId, periodo, page],
    queryFn: async () => {
      const from = page * PER_PAGE;
      const to = from + PER_PAGE - 1;

      const { data: logs, error, count } = await (supabase as any)
        .from("logs_acesso")
        .select("*", { count: "exact" })
        .eq("agencia_id", agenciaId)
        .gte("criado_em", sinceISO)
        .order("criado_em", { ascending: false })
        .range(from, to);

      if (error) throw error;
      return { logs: logs as any[], total: count as number };
    },
  });

  const totalPages = Math.ceil((data?.total ?? 0) / PER_PAGE);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Log de Acesso</h3>
        <Select value={periodo} onValueChange={(v) => { setPeriodo(v); setPage(0); }}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {periodos.map((p) => (
              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Cargo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.logs?.map((log: any) => (
                <TableRow key={log.id}>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDate(log.criado_em)}
                  </TableCell>
                  <TableCell className="font-medium">{log.usuario_nome || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{log.cargo || "agente"}</Badge>
                  </TableCell>
                </TableRow>
              ))}
              {(!data?.logs || data.logs.length === 0) && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                    Nenhum acesso registrado no período
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-sm text-muted-foreground">
                {data?.total ?? 0} registro(s) — Página {page + 1} de {totalPages}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
