import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, ArrowRight, MessageCircle, Copy, Edit, Clock, UserCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatarDataHoraBrasilia } from "@/lib/date-utils";

const iconByTipo: Record<string, React.ElementType> = {
  criado: Plus,
  status_alterado: ArrowRight,
  enviado_whatsapp: MessageCircle,
  duplicado: Copy,
  editado: Edit,
};

const colorByTipo: Record<string, string> = {
  criado: "#3B82F6",
  status_alterado: "#8B5CF6",
  enviado_whatsapp: "#22C55E",
  duplicado: "#94A3B8",
  editado: "#F59E0B",
};

interface Props {
  orcamentoId: string;
}

export default function HistoricoOrcamento({ orcamentoId }: Props) {
  const { data: eventos, isLoading } = useQuery({
    queryKey: ["historico-orcamento", orcamentoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("historico_orcamento" as any)
        .select("*, usuarios(nome)")
        .eq("orcamento_id", orcamentoId)
        .order("criado_em", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  if (isLoading) return <Skeleton className="h-24 w-full" />;

  if (!eventos || eventos.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">Nenhum evento registrado</p>;
  }

  return (
    <div className="relative pl-6">
      {/* Vertical line */}
      <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-border" />

      <div className="space-y-4">
        {eventos.map((ev: any) => {
          const Icon = iconByTipo[ev.tipo] || Clock;
          const color = colorByTipo[ev.tipo] || "#94A3B8";
          const data = ev.criado_em ? formatarDataHoraBrasilia(ev.criado_em) : "";
          const nomeUsuario = ev.usuarios?.nome || "Sistema";

          return (
            <div key={ev.id} className="relative flex items-start gap-3">
              {/* Circle */}
              <div
                className="absolute -left-6 top-0.5 w-[22px] h-[22px] rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: color }}
              >
                <Icon className="h-3 w-3 text-white" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm">{ev.descricao}</p>
                <p className="text-xs text-muted-foreground">{nomeUsuario}</p>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">{data}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
