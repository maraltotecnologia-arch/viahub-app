import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import useAgenciaId from "@/hooks/useAgenciaId";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import useVerificarVencidos from "@/hooks/useVerificarVencidos";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Clock, LayoutGrid } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import EmptyState from "@/components/EmptyState";
import { formatarApenasDatabrasilia } from "@/lib/date-utils";
import { registrarHistorico } from "@/lib/historico-orcamento";

const statusConfig: { id: string; title: string; variant: "muted" | "default" | "success" | "destructive" | "info"; borderColor: string }[] = [
  { id: "rascunho", title: "Rascunho", variant: "muted", borderColor: "#64748B" },
  { id: "enviado", title: "Enviado", variant: "default", borderColor: "#2563EB" },
  { id: "aprovado", title: "Aprovado", variant: "success", borderColor: "#22C55E" },
  { id: "perdido", title: "Perdido", variant: "destructive", borderColor: "#EF4444" },
  { id: "emitido", title: "Emitido", variant: "info", borderColor: "#8B5CF6" },
];

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function Pipeline() {
  const agenciaId = useAgenciaId();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  useVerificarVencidos(agenciaId);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [justDropped, setJustDropped] = useState<string | null>(null);

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
    setDropTarget(null);
    if (!dragId) return;

    const oldStatus = orcamentos?.find((o) => o.id === dragId)?.status;
    if (oldStatus === newStatus) { setDragId(null); return; }

    setJustDropped(dragId);
    setTimeout(() => setJustDropped(null), 300);

    const { error } = await supabase.from("orcamentos").update({ status: newStatus }).eq("id", dragId);
    if (error) { toast({ title: "Erro ao mover", variant: "destructive" }); } else {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && agenciaId) {
        await registrarHistorico({
          orcamento_id: dragId,
          usuario_id: user.id,
          agencia_id: agenciaId,
          tipo: "status_alterado",
          status_anterior: oldStatus || null,
          status_novo: newStatus,
          descricao: `Status alterado de "${oldStatus}" para "${newStatus}" via Pipeline`,
        });
      }
      queryClient.invalidateQueries({ queryKey: ["pipeline"] });
      queryClient.invalidateQueries({ queryKey: ["orcamentos"] });
      queryClient.invalidateQueries({ queryKey: ["historico-orcamento"] });
    }
    setDragId(null);
  };

  if (isLoading) return (
    <div className="space-y-6"><h2 className="text-2xl font-bold">Pipeline</h2><div className="flex gap-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-64 flex-1" />)}</div></div>
  );

  const now = new Date();

  return (
    <TooltipProvider>
    <div className="space-y-6 animate-fade-in-up">
      <h2 className="text-2xl font-bold">Pipeline</h2>
      {(!orcamentos || orcamentos.length === 0) ? (
        <EmptyState
          icon={<LayoutGrid className="h-9 w-9" />}
          title="Pipeline vazio"
          description="Seus orçamentos aparecerão aqui conforme forem criados"
        />
      ) : (
      <div className="flex flex-col md:flex-row gap-3 pb-4">
        {statusConfig.map((col) => {
          const cards = orcamentos?.filter((o) => o.status === col.id) || [];
          const total = cards.reduce((s, c) => s + (Number(c.valor_final) || 0), 0);
          const isDropActive = dropTarget === col.id;

          return (
            <div
              key={col.id}
              className="min-w-0 flex-1 flex flex-col rounded-lg p-2 transition-all duration-200"
              style={{
                background: isDropActive ? "#EFF6FF" : "transparent",
                border: isDropActive ? "2px dashed #2563EB" : "2px dashed transparent",
              }}
              onDragOver={(e) => { e.preventDefault(); setDropTarget(col.id); }}
              onDragLeave={() => setDropTarget(null)}
              onDrop={() => handleDrop(col.id)}
            >
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <StatusBadge status={col.id} />
                  <span className="text-xs text-muted-foreground">{cards.length}</span>
                </div>
                <span className="text-xs font-semibold text-muted-foreground">{fmt(total)}</span>
              </div>

              <div className="space-y-3 flex-1">
                {cards.map((card) => {
                  const validade = card.validade ? new Date(card.validade) : null;
                  const diasParaVencer = validade ? Math.ceil((validade.getTime() - now.getTime()) / 86400000) : 999;
                  const isDragging = dragId === card.id;
                  const isJustDropped = justDropped === card.id;
                  const isPerdidoPorVencimento = card.status === "perdido" && validade && validade < now;

                  return (
                    <div
                      key={card.id}
                      draggable
                      onDragStart={() => setDragId(card.id)}
                      onDragEnd={() => { setDragId(null); setDropTarget(null); }}
                      style={{
                        opacity: isDragging ? 0.5 : 1,
                        transform: isDragging
                          ? "rotate(2deg) scale(1.02)"
                          : isJustDropped
                          ? "scale(1)"
                          : undefined,
                        transition: "all 200ms ease",
                        animation: isJustDropped ? "pipeline-snap 200ms ease" : undefined,
                      }}
                      className="cursor-grab active:cursor-grabbing"
                    >
                      <Link to={`/orcamentos/${card.id}`}>
                        <Card
                          className={`transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                            isDragging ? "shadow-lg" : ""
                          } ${diasParaVencer <= 3 && diasParaVencer >= 0 ? "border-accent border-2" : ""
                          } ${diasParaVencer < 0 ? "opacity-60" : ""}`}
                          style={{
                            borderLeft: diasParaVencer <= 3 && diasParaVencer >= 0 ? undefined : `3px solid ${col.borderColor}`,
                          }}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center gap-1">
                              <p className="font-semibold text-sm">{card.titulo || "Sem título"}</p>
                              {isPerdidoPorVencimento && (
                                <Tooltip>
                                  <TooltipTrigger asChild><Clock className="h-3.5 w-3.5 text-destructive cursor-help" /></TooltipTrigger>
                                  <TooltipContent>Movido para Perdido por vencimento</TooltipContent>
                                </Tooltip>
                              )}
                            </div>
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
      )}

      <style>{`
        @keyframes pipeline-snap {
          0% { transform: scale(0.95); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
    </TooltipProvider>
  );
}
