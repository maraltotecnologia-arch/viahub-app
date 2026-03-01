import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import useAgenciaId from "@/hooks/useAgenciaId";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

const statusConfig: { id: string; title: string; variant: "muted" | "default" | "success" | "destructive" | "info" }[] = [
  { id: "rascunho", title: "Rascunho", variant: "muted" },
  { id: "enviado", title: "Enviado", variant: "default" },
  { id: "aprovado", title: "Aprovado", variant: "success" },
  { id: "perdido", title: "Perdido", variant: "destructive" },
  { id: "emitido", title: "Emitido", variant: "info" },
];

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function Pipeline() {
  const agenciaId = useAgenciaId();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dragId, setDragId] = useState<string | null>(null);

  const { data: orcamentos, isLoading } = useQuery({
    queryKey: ["pipeline", agenciaId],
    enabled: !!agenciaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orcamentos")
        .select("id, titulo, valor_final, status, validade, clientes(nome)")
        .eq("agencia_id", agenciaId!);
      if (error) throw error;
      return data;
    },
  });

  const handleDrop = async (newStatus: string) => {
    if (!dragId) return;
    const { error } = await supabase.from("orcamentos").update({ status: newStatus }).eq("id", dragId);
    if (error) { toast({ title: "Erro ao mover", variant: "destructive" }); } else {
      queryClient.invalidateQueries({ queryKey: ["pipeline"] });
      queryClient.invalidateQueries({ queryKey: ["orcamentos"] });
    }
    setDragId(null);
  };

  if (isLoading) return (
    <div className="space-y-6"><h2 className="text-2xl font-bold">Pipeline</h2><div className="flex gap-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-64 flex-1" />)}</div></div>
  );

  const now = new Date();

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold">Pipeline</h2>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {statusConfig.map((col) => {
          const cards = orcamentos?.filter((o) => o.status === col.id) || [];
          const total = cards.reduce((s, c) => s + (Number(c.valor_final) || 0), 0);

          return (
            <div
              key={col.id}
              className="min-w-[280px] flex-1 flex flex-col"
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(col.id)}
            >
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <Badge variant={col.variant}>{col.title}</Badge>
                  <span className="text-xs text-muted-foreground">{cards.length}</span>
                </div>
                <span className="text-xs font-semibold text-muted-foreground">{fmt(total)}</span>
              </div>

              <div className="space-y-3 flex-1">
                {cards.map((card) => {
                  const validade = card.validade ? new Date(card.validade) : null;
                  const diasParaVencer = validade ? Math.ceil((validade.getTime() - now.getTime()) / 86400000) : 999;

                  return (
                    <div
                      key={card.id}
                      draggable
                      onDragStart={() => setDragId(card.id)}
                      className="cursor-grab active:cursor-grabbing"
                    >
                      <Link to={`/orcamentos/${card.id}`}>
                        <Card
                          className={`hover:shadow-md transition-shadow ${
                            diasParaVencer <= 3 && diasParaVencer >= 0 ? "border-accent border-2" : ""
                          } ${diasParaVencer < 0 ? "opacity-60" : ""}`}
                        >
                          <CardContent className="p-4">
                            <p className="font-semibold text-sm">{card.titulo || "Sem título"}</p>
                            <p className="text-xs text-muted-foreground mt-1">{(card.clientes as any)?.nome || "Sem cliente"}</p>
                            <div className="flex items-center justify-between mt-3">
                              <span className="font-bold text-sm">{fmt(Number(card.valor_final) || 0)}</span>
                              <span className={`text-xs ${diasParaVencer <= 3 ? "text-accent font-semibold" : "text-muted-foreground"}`}>
                                {diasParaVencer < 0 ? "Vencido" : validade ? `${diasParaVencer}d` : "-"}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
