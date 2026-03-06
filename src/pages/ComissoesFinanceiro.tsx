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
import { DollarSign, FileText, Percent, Download } from "lucide-react";
import { toast } from "sonner";

const planoComissao: Record<string, number> = {
  starter_a: 0,
  starter_b: 0.015,
  pro_a: 0,
  pro_b: 0.012,
  agency_c: 0,
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

  const { data: agencia } = useQuery({
    queryKey: ["agencia-plano", agenciaId],
    enabled: !!agenciaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agencias")
        .select("plano")
        .eq("id", agenciaId!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const taxa = planoComissao[agencia?.plano || "starter_a"] || 0;

  const { data: orcamentos, isLoading } = useQuery({
    queryKey: ["comissoes-orcamentos", agenciaId, periodo],
    enabled: !!agenciaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orcamentos")
        .select("id, numero_orcamento, valor_final, pago_em, atualizado_em, criado_em, status, cliente_id, clientes(nome)")
        .eq("agencia_id", agenciaId!)
        .eq("status", "pago");
      if (error) throw error;
      return data;
    },
  });

  const filtered = useMemo(() => {
    if (!orcamentos) return [];
    return orcamentos.filter((o) => {
      const dataRef = o.pago_em || o.atualizado_em || o.criado_em;
      if (!dataRef) return false;
      const d = new Date(dataRef);
      return d >= start && d <= end;
    });
  }, [orcamentos, start, end]);

  const totalRecebido = filtered.reduce((s, o) => s + (Number(o.valor_final) || 0), 0);
  const totalComissao = totalRecebido * taxa;

  const handleExportCSV = () => {
    if (!filtered.length) { toast.info("Nenhum dado para exportar"); return; }
    const header = "Nº Orçamento;Cliente;Valor Pago;Taxa Op. (%);Valor Taxa Op.;Data Pagamento";
    const rows = filtered.map((o) => {
      const clienteNome = (o as any).clientes?.nome || "—";
      const val = Number(o.valor_final) || 0;
      const comVal = val * taxa;
      const dataRef = o.pago_em || o.atualizado_em || o.criado_em;
      const dataFmt = dataRef ? new Date(dataRef).toLocaleDateString("pt-BR") : "—";
      return `${o.numero_orcamento || "—"};${clienteNome};${val.toFixed(2)};${(taxa * 100).toFixed(1)}%;${comVal.toFixed(2)};${dataFmt}`;
    });
    const csv = [header, ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `receita_operacional_${periodo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (roleLoading) return <div className="p-6"><Skeleton className="h-64 w-full" /></div>;

  const { isSuperadmin } = useUserRole();

  if (!isSuperadmin) {
    navigate("/dashboard", { replace: true });
    return null;
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold">Receita Operacional</h2>
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Recebido</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{fmt(totalRecebido)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Taxa Operacional Gerada</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmt(totalComissao)}</div>
            {taxa > 0 && <p className="text-xs text-muted-foreground mt-1">Encargo operacional embutido</p>}
            {taxa === 0 && <p className="text-xs text-muted-foreground mt-1">Plano sem taxa operacional</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Orçamentos Pagos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{filtered.length}</div></CardContent>
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
                  <TableHead>Nº Orçamento</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Valor Pago</TableHead>
                  <TableHead className="text-right">Taxa Op.</TableHead>
                  <TableHead>Data Pgto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((o) => {
                  const val = Number(o.valor_final) || 0;
                  const comVal = val * taxa;
                  const dataRef = o.pago_em || o.atualizado_em || o.criado_em;
                  const clienteNome = (o as any).clientes?.nome || "—";
                  return (
                    <TableRow key={o.id}>
                      <TableCell className="font-medium">{o.numero_orcamento || "—"}</TableCell>
                      <TableCell>{clienteNome}</TableCell>
                      <TableCell className="text-right">{fmt(val)}</TableCell>
                      <TableCell className="text-right">{taxa > 0 ? fmt(comVal) : "—"}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {dataRef ? new Date(dataRef).toLocaleDateString("pt-BR") : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                      Nenhum orçamento pago no período
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
