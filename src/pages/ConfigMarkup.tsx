import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Save } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import useAgenciaId from "@/hooks/useAgenciaId";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface MarkupRow {
  id: string | null; // null if not yet in DB
  tipo: string;
  markup: number;
  taxa: number;
  acrescimoCartao: number;
}

const tiposServico = ["aereo", "hotel", "pacote", "passeio", "seguro", "transfer"];
const tiposLabel: Record<string, string> = { aereo: "Aéreo", hotel: "Hotel", pacote: "Pacote", passeio: "Passeio", seguro: "Seguro", transfer: "Transfer" };
const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function ConfigMarkup() {
  const agenciaId = useAgenciaId();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [configs, setConfigs] = useState<MarkupRow[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["markup-config", agenciaId],
    enabled: !!agenciaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("configuracoes_markup")
        .select("*")
        .eq("agencia_id", agenciaId!);
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    const rows: MarkupRow[] = tiposServico.map((tipo) => {
      const existing = data?.find((d) => d.tipo_servico === tipo);
      return {
        id: existing?.id || null,
        tipo,
        markup: Number(existing?.markup_percentual) || 0,
        taxa: Number(existing?.taxa_fixa) || 0,
        acrescimoCartao: Number(existing?.acrescimo_cartao) || 0,
      };
    });
    setConfigs(rows);
  }, [data]);

  const update = (tipo: string, field: keyof MarkupRow, value: number) => {
    setConfigs(configs.map((c) => (c.tipo === tipo ? { ...c, [field]: value } : c)));
  };

  const save = async (row: MarkupRow) => {
    if (!agenciaId) return;
    setSavingId(row.tipo);

    if (row.id) {
      const { error } = await supabase.from("configuracoes_markup").update({
        markup_percentual: row.markup,
        taxa_fixa: row.taxa,
        acrescimo_cartao: row.acrescimoCartao,
      }).eq("id", row.id);
      if (error) { toast({ title: "Erro ao salvar", variant: "destructive" }); } else {
        toast({ title: `Markup de ${tiposLabel[row.tipo]} salvo!` });
        queryClient.invalidateQueries({ queryKey: ["markup-config"] });
      }
    } else {
      const { error } = await supabase.from("configuracoes_markup").insert({
        agencia_id: agenciaId!,
        tipo_servico: row.tipo,
        markup_percentual: row.markup,
        taxa_fixa: row.taxa,
        acrescimo_cartao: row.acrescimoCartao,
      });
      if (error) { toast({ title: "Erro ao salvar", variant: "destructive" }); } else {
        toast({ title: `Markup de ${tiposLabel[row.tipo]} salvo!` });
        queryClient.invalidateQueries({ queryKey: ["markup-config"] });
      }
    }
    setSavingId(null);
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <h2 className="text-2xl font-bold">Configurações de Markup</h2>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Markup por Tipo de Serviço</CardTitle>
          <p className="text-sm text-muted-foreground">Configure o markup padrão para cada tipo de serviço.</p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo de Serviço</TableHead>
                  <TableHead>Markup %</TableHead>
                  <TableHead>Taxa Fixa (R$)</TableHead>
                  <TableHead>Acréscimo Cartão %</TableHead>
                  <TableHead>Preview (R$ 1.000)</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {configs.map((c) => {
                  const preview = 1000 * (1 + c.markup / 100) + c.taxa;
                  return (
                    <TableRow key={c.tipo}>
                      <TableCell className="font-medium">{tiposLabel[c.tipo]}</TableCell>
                      <TableCell><Input type="number" min={0} className="w-20" value={c.markup || ""} onChange={(e) => update(c.tipo, "markup", Number(e.target.value))} /></TableCell>
                      <TableCell><Input type="number" min={0} className="w-24" value={c.taxa || ""} onChange={(e) => update(c.tipo, "taxa", Number(e.target.value))} /></TableCell>
                      <TableCell><Input type="number" min={0} className="w-20" value={c.acrescimoCartao || ""} onChange={(e) => update(c.tipo, "acrescimoCartao", Number(e.target.value))} /></TableCell>
                      <TableCell><span className="font-semibold text-primary">{fmt(preview)}</span></TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => save(c)} disabled={savingId === c.tipo}>
                          <Save className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
