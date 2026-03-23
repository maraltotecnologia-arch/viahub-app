import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import useAgenciaId from "@/hooks/useAgenciaId";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useState, useRef } from "react";
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
  const isDroppingRef = useRef(false);

  const { data: orcamentos, isLoading } = useQuery({
    queryKey: ["pipeline", agenciaId],
    enabled: !!agenciaId,
    staleTime: 30 * 1000,
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
    if (!dragId || isDroppingRef.current) return;

    const oldStatus = orcamentos?.find((o) => o.id === dragId)?.status;
    if (oldStatus === newStatus) { setDragId(null); return; }

    isDroppingRef.current = true;
    const currentDragId = dragId;

    setJustDropped(currentDragId);
    setTimeout(() => setJustDropped(null), 300);

    try {
      const { error } = await supabase.from("orcamentos").update({ status: newStatus }).eq("id", currentDragId);
      if (error) { toast({ title: "Erro ao mover", variant: "destructive" }); } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && agenciaId) {
          await registrarHistorico({
            orcamento_id: currentDragId,
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
    } finally {
      setDragId(null);
      isDroppingRef.current = false;
    }
  };

  if (isLoading) return (
    <div className="flex items-center justify-center w-full" style={{ minHeight: "calc(100vh - 3.5rem)" }}>
      <Skeleton className="h-8 w-8 rounded-full" />
    </div>
  );

  const now = new Date();

  return (
    <TooltipProvider>
    <div className="animate-fade-in-up flex-1 flex flex-col h-[calc(100vh-56px)] overflow-hidden bg-surface">
      <div className="px-4 sm:px-8 py-4 sm:py-5 bg-surface-container-lowest/80 backdrop-blur-sm border-b border-outline-variant/10 flex items-center justify-between">
        <h2 className="text-2xl sm:text-3xl font-bold font-display tracking-tight text-on-surface">Pipeline de Vendas</h2>
      </div>
      {(!orcamentos || orcamentos.length === 0) ? (
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            icon={<LayoutGrid className="h-9 w-9" />}
            title="Pipeline vazio"
            description="Seus orçamentos aparecerão aqui conforme forem criados"
          />
        </div>
      ) : (
      <div className="flex-1 overflow-x-auto p-4 sm:p-6 flex gap-4 items-start snap-x snap-mandatory sm:snap-none">
        {statusConfig.map((col) => {
          const cards = orcamentos?.filter((o) => o.status === col.id) || [];
          const total = cards.reduce((s, c) => s + (Number(c.valor_final) || 0), 0);
          const isDropActive = dropTarget === col.id;

          return (
            <div
              key={col.id}
              className="min-w-[280px] w-72 flex-shrink-0 flex flex-col rounded-2xl p-2 transition-all duration-200 snap-start"
              style={{
                background: isDropActive ? "rgba(0,55,176,0.06)" : "transparent",
                border: isDropActive ? "2px dashed #0037b0" : "2px dashed transparent",
              }}
              onDragOver={(e) => { e.preventDefault(); setDropTarget(col.id); }}
              onDragLeave={() => setDropTarget(null)}
              onDrop={() => handleDrop(col.id)}
            >
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold font-label text-on-surface-variant uppercase tracking-wider">{col.title}</span>
                  <span className="text-xs bg-surface-container-high text-on-surface-variant rounded-full px-2 py-0.5">{cards.length}</span>
                </div>
              </div>
              <p className="text-xs font-semibold text-on-surface px-1 mb-3">{fmt(total)}</p>

              <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-220px)] pb-2 flex-1">
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
                          className={`transition-all duration-150 bg-surface-container-lowest rounded-xl border border-outline-variant/10 hover:border-primary/20 hover:shadow-[0_4px_12px_rgba(13,28,45,0.08)] ${
                            isDragging ? "shadow-ambient" : ""
                          } ${diasParaVencer < 0 ? "opacity-60" : ""}`}
                        >
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start gap-2">
                              <p className="text-sm font-semibold font-headline text-on-surface leading-snug">{card.titulo || "Sem título"}</p>
                              {isPerdidoPorVencimento && (
                                <Tooltip>
                                  <TooltipTrigger asChild><Clock className="h-3.5 w-3.5 text-error cursor-help shrink-0" /></TooltipTrigger>
                                  <TooltipContent>Movido para Perdido por vencimento</TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                            <p className="text-xs text-on-surface-variant mt-1.5">{(card.clientes as any)?.nome || "Sem cliente"}</p>
                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-outline-variant/10">
                              <span className="text-sm font-bold font-display text-on-surface">{fmt(Number(card.valor_final) || 0)}</span>
                              <span className={`text-xs ${diasParaVencer <= 3 ? "text-[#e65100] font-semibold" : "text-on-surface-variant"}`}>
                                {diasParaVencer < 0 ? "Vencido" : validade ? `${diasParaVencer}d` : "-"}
                              </span>
                            </div>
                            {diasParaVencer <= 3 && diasParaVencer >= 0 && (
                              <p className="text-xs text-error bg-error-container/20 rounded-md px-2 py-1 mt-2 flex items-center gap-1">
                                <Clock className="h-3 w-3" /> Vence em {diasParaVencer}d
                              </p>
                            )}
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
