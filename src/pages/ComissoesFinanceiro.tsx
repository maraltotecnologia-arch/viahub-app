import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import useUserRole from "@/hooks/useUserRole";
import useAgenciaId from "@/hooks/useAgenciaId";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, FileText, Download } from "lucide-react";
import { toast } from "sonner";

const planoPreco: Record<string, number> = {
  starter: 397,
  pro: 697,
  elite: 1997,
};

const periodos = [
  { value: "mes_atual", label: "Mês atual" },
  { value: "mes_anterior", label: "Mês anterior" },
  { value: "3_meses", label: "Últimos 3 meses" },
  { value: "6_meses", label: "Últimos 6 meses" },
  { value: "ano", label: "Este ano" },
];

function getDateRange(periodo: string): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  let start: Date;

  switch (periodo) {
    case "mes_anterior":
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return { start, end: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999) };
    case "3_meses":
      start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      return { start, end };
    case "6_meses":
      start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      return { start, end };
    case "ano":
      start = new Date(now.getFullYear(), 0, 1);
      return { start, end };
    default: // mes_atual
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start, end };
  }
}

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function ComissoesFinanceiro() {
  const navigate = useNavigate();
  const { isSuperadmin, loading: roleLoading } = useUserRole();
  const agenciaId = useAgenciaId();
  const [periodo, setPeriodo] = useState("mes_atual");

  const { start, end } = useMemo(() => getDateRange(periodo), [periodo]);

  const { data: agencias, isLoading } = useQuery({
    queryKey: ["comissoes-agencias"],
    enabled: isSuperadmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agencias")
        .select("id, nome_fantasia, plano, status_pagamento, data_proximo_vencimento")
        .eq("ativo", true)
        .order("nome_fantasia");
      if (error) throw error;
      return data;
    },
  });

  const { data: pagamentos } = useQuery({
    queryKey: ["comissoes-pagamentos", periodo],
    enabled: isSuperadmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("asaas_pagamentos")
        .select("*")
        .in("status", ["RECEIVED", "CONFIRMED"])
        .gte("pago_em", start.toISOString())
        .lte("pago_em", end.toISOString())
        .order("pago_em", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const totalRecebido = useMemo(() => {
    if (!pagamentos) return 0;
    return pagamentos.reduce((s, p) => s + (Number(p.valor) || 0), 0);
  }, [pagamentos]);

  const mrrEstimado = agencias?.reduce((s, a) => s + (planoPreco[a.plano || "starter"] || 0), 0) ?? 0;

  const handleExportCSV = () => {
    if (!agencias?.length) { toast.info("Nenhum dado para exportar"); return; }
    const header = "Agência;Plano;Mensalidade;Status Pagamento;Próx. Vencimento";
    const rows = agencias.map((a) => {
      const mensalidade = planoPreco[a.plano || "starter"] || 0;
      const proxVenc = a.data_proximo_vencimento ? new Date(a.data_proximo_vencimento).toLocaleDateString("pt-BR") : "—";
      return `${a.nome_fantasia};${a.plano || "starter"};${mensalidade.toFixed(2)};${(a as any).status_pagamento || "ativo"};${proxVenc}`;
    });
    const csv = [header, ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mensalidades_${periodo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (roleLoading) return <div className="p-6"><Skeleton className="h-64 w-full" /></div>;

  if (!isSuperadmin) {
    navigate("/dashboard", { replace: true });
    return null;
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold">Mensalidades</h2>
        <div className="flex gap-2">
          <Select value={periodo} onValueChange={setPeriodo}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {periodos.map((p) => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" /> CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">MRR Estimado</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{fmt(mrrEstimado)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Recebido no Período</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{fmt(totalRecebido)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Agências Ativas</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{agencias?.length ?? 0}</div></CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agência</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead className="text-right">Mensalidade</TableHead>
                  <TableHead>Status Pgto</TableHead>
                  <TableHead>Próx. Vencimento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agencias?.map((a) => {
                  const mensalidade = planoPreco[a.plano || "starter"] || 0;
                  const statusPgto = (a as any).status_pagamento || "ativo";
                  const proxVenc = a.data_proximo_vencimento;
                  const statusColor: Record<string, string> = {
                    ativo: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
                    inadimplente: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
                    bloqueado: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
                    cancelado: "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300",
                  };
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.nome_fantasia}</TableCell>
                      <TableCell className="capitalize">{a.plano || "starter"}</TableCell>
                      <TableCell className="text-right">{fmt(mensalidade)}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[statusPgto] || statusColor.ativo}`}>
                          {statusPgto.charAt(0).toUpperCase() + statusPgto.slice(1)}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {proxVenc ? new Date(proxVenc).toLocaleDateString("pt-BR") : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {(!agencias || agencias.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                      Nenhuma agência ativa
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
