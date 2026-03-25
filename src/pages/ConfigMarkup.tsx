import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save, Plane, Hotel, Package, Map, ShieldCheck, Car, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import useAgenciaId from "@/hooks/useAgenciaId";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface MarkupRow {
  id: string | null;
  tipo: string;
  markup: number;
  taxa: number;
  acrescimoCartao: number;
}

const tiposServico = ["aereo", "hotel", "pacote", "passeio", "seguro", "transfer"];
const tiposLabel: Record<string, string> = { aereo: "Aéreo", hotel: "Hotel", pacote: "Pacote", passeio: "Passeio", seguro: "Seguro", transfer: "Transfer" };
const tiposIcon: Record<string, typeof Plane> = { aereo: Plane, hotel: Hotel, pacote: Package, passeio: Map, seguro: ShieldCheck, transfer: Car };

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
      const { data, error } = await supabase.from("configuracoes_markup").select("*").eq("agencia_id", agenciaId!);
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    const rows: MarkupRow[] = tiposServico.map((tipo) => {
      const existing = data?.find((d) => d.tipo_servico === tipo);
      return { id: existing?.id || null, tipo, markup: Number(existing?.markup_percentual) || 0, taxa: Number(existing?.taxa_fixa) || 0, acrescimoCartao: Number(existing?.acrescimo_cartao) || 0 };
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
      const { error } = await supabase.from("configuracoes_markup").update({ markup_percentual: row.markup, taxa_fixa: row.taxa, acrescimo_cartao: row.acrescimoCartao }).eq("id", row.id);
      if (error) { toast({ title: "Erro ao salvar", variant: "destructive" }); } else { toast({ title: `Markup de ${tiposLabel[row.tipo]} salvo!` }); queryClient.invalidateQueries({ queryKey: ["markup-config"] }); }
    } else {
      const { error } = await supabase.from("configuracoes_markup").insert({ agencia_id: agenciaId!, tipo_servico: row.tipo, markup_percentual: row.markup, taxa_fixa: row.taxa, acrescimo_cartao: row.acrescimoCartao });
      if (error) { toast({ title: "Erro ao salvar", variant: "destructive" }); } else { toast({ title: `Markup de ${tiposLabel[row.tipo]} salvo!` }); queryClient.invalidateQueries({ queryKey: ["markup-config"] }); }
    }
    setSavingId(null);
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h2 className="text-3xl font-bold font-display tracking-tight text-on-surface">Configurações de Markup</h2>
        <p className="text-sm text-on-surface-variant font-body mt-1">Configure o markup padrão para cada tipo de serviço.</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 w-full rounded-2xl" />)}</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {configs.map((c) => {
            const Icon = tiposIcon[c.tipo] || Plane;
            return (
              <div key={c.tipo} className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/10 hover:border-primary/20 transition-colors shadow-ambient">
                <div className="rounded-xl p-2.5 bg-primary/8 text-primary w-10 h-10 flex items-center justify-center mb-3">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-xs font-semibold font-label text-on-surface-variant uppercase tracking-wide mb-2">{tiposLabel[c.tipo]}</p>
                <div className="flex items-baseline gap-1">
                  <Input
                    type="number"
                    min={0}
                    className="text-3xl font-extrabold font-display w-24 border-none bg-transparent focus:outline-none text-on-surface p-0 h-auto"
                    value={c.markup || ""}
                    onChange={(e) => update(c.tipo, "markup", Number(e.target.value))}
                  />
                  <span className="text-lg text-on-surface-variant font-label">%</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => save(c)} disabled={savingId === c.tipo} className="mt-3 w-full">
                  {savingId === c.tipo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Save className="h-3.5 w-3.5 mr-1" />Salvar</>}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
