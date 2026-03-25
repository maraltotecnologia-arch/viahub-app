import { Card, CardContent } from "@/components/ui/card";
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
import EmptyState from "@/components/EmptyState";
import { registrarHistorico } from "@/lib/historico-orcamento";

const statusConfig: { id: string; title: string; color: string; borderColor: string; bg: string }[] = [
  { id: "rascunho",  title: "Rascunho",  color: "text-slate-500",  borderColor: "#64748B", bg: "bg-slate-500/8" },
  { id: "enviado",   title: "Enviado",   color: "text-blue-600",   borderColor: "#2563EB", bg: "bg-blue-500/8" },
  { id: "aprovado",  title: "Aprovado",  color: "text-emerald-600",borderColor: "#22C55E", bg: "bg-emerald-500/8" },
  { id: "perdido",   title: "Perdido",   color: "text-red-500",    borderColor: "#EF4444", bg: "bg-red-500/8" },
  { id: "emitido",   title: "Emitido",   color: "text-violet-500", borderColor: "#8B5CF6", bg: "bg-violet-500/8" },
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
    <div className="flex items-center justify-center w-full flex-1">
      <Skeleton className="h-8 w-8 rounded-full" />
    </div>
  );

  const now = new Date();

  return (
    <TooltipProvider>
    {/* Break out of AppLayout padding to fill full available area */}
    <div className="animate-fade-in-up flex flex-col -mx-4 sm:-mx-6 lg:-mx-8 -mt-4 sm:-mt-8 -mb-4 sm:-mb-8 overflow-hidden bg-surface" style={{ height: "calc(100vh - 3.5rem)" }}>

      {/* Header */}
      <div className="px-4 sm:px-8 py-4 sm:py-5 bg-surface-container-lowest/80 backdrop-blur-sm border-b border-outline-variant/10 flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold font-display tracking-tight text-on-surface">Pipeline de Vendas</h2>
          {orcamentos && orcamentos.length > 0 && (
            <p className="text-xs text-on-surface-variant mt-0.5">
              {orcamentos.length} orçamento{orcamentos.length !== 1 ? "s" : ""} • {fmt(orcamentos.reduce((s, o) => s + (Number(o.valor_final) || 0), 0))} em carteira
            </p>
          )}
        </div>
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
        /* Kanban board — columns fill available width, horizontal scroll on small screens */
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <div className="flex gap-3 p-4 sm:p-5 h-full min-w-max sm:min-w-0 sm:w-full">
            {statusConfig.map((col) => {
              const cards = orcamentos?.filter((o) => o.status === col.id) || [];
              const total = cards.reduce((s, c) => s + (Number(c.valor_final) || 0), 0);
              const isDropActive = dropTarget === col.id;

              return (
                <div
                  key={col.id}
                  className="w-[280px] sm:w-auto sm:flex-1 min-w-[220px] flex flex-col rounded-2xl transition-all duration-200"
                  style={{
                    background: isDropActive ? "rgba(0,55,176,0.05)" : "var(--surface-container-low)",
                    border: isDropActive ? "2px dashed #0037b0" : "2px solid transparent",
                    outline: isDropActive ? "none" : "1px solid var(--outline-variant)",
                    outlineOffset: "-1px",
                  }}
                  onDragOver={(e) => { e.preventDefault(); setDropTarget(col.id); }}
                  onDragLeave={() => setDropTarget(null)}
                  onDrop={() => handleDrop(col.id)}
                >
                  {/* Column header */}
                  <div className="px-3 pt-3 pb-2 shrink-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`inline-block w-2 h-2 rounded-full`} style={{ backgroundColor: col.borderColor }} />
                        <span className="text-xs font-bold font-label text-on-surface-variant uppercase tracking-wider">{col.title}</span>
                        <span className="text-xs bg-surface-container-high text-on-surface-variant rounded-full px-2 py-0.5 font-medium">{cards.length}</span>
                      </div>
                    </div>
                    <p className="text-sm font-bold text-on-surface pl-4">{fmt(total)}</p>
                  </div>

                  {/* Divider */}
                  <div className="mx-3 h-px bg-outline-variant/20 shrink-0" />

                  {/* Cards */}
                  <div className="flex-1 overflow-y-auto p-2 space-y-2">
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
                            opacity: isDragging ? 0.45 : 1,
                            transform: isDragging
                              ? "rotate(2deg) scale(1.03)"
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
                              className={`transition-all duration-150 bg-surface-container-lowest rounded-xl border border-outline-variant/10 hover:border-primary/25 hover:shadow-[0_4px_16px_rgba(13,28,45,0.10)] ${
                                isDragging ? "shadow-lg" : ""
                              } ${diasParaVencer < 0 ? "opacity-60" : ""}`}
                            >
                              <CardContent className="p-3">
                                <div className="flex justify-between items-start gap-2 mb-1.5">
                                  <p className="text-sm font-semibold font-headline text-on-surface leading-snug line-clamp-2">{card.titulo || "Sem título"}</p>
                                  {isPerdidoPorVencimento && (
                                    <Tooltip>
                                      <TooltipTrigger asChild><Clock className="h-3.5 w-3.5 text-destructive cursor-help shrink-0 mt-0.5" /></TooltipTrigger>
                                      <TooltipContent>Movido para Perdido por vencimento</TooltipContent>
                                    </Tooltip>
                                  )}
                                </div>
                                <p className="text-xs text-on-surface-variant truncate">{(card.clientes as any)?.nome || "Sem cliente"}</p>
                                <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-outline-variant/10">
                                  <span className="text-sm font-bold font-display text-on-surface">{fmt(Number(card.valor_final) || 0)}</span>
                                  <span className={`text-xs tabular-nums ${diasParaVencer <= 3 && diasParaVencer >= 0 ? "text-orange-600 dark:text-orange-400 font-semibold" : diasParaVencer < 0 ? "text-destructive font-semibold" : "text-on-surface-variant"}`}>
                                    {diasParaVencer < 0 ? "Vencido" : validade ? (diasParaVencer === 0 ? "Hoje" : `${diasParaVencer}d`) : "—"}
                                  </span>
                                </div>
                                {diasParaVencer <= 3 && diasParaVencer >= 0 && (
                                  <p className="text-xs text-orange-600 dark:text-orange-400 bg-orange-500/10 rounded-md px-2 py-1 mt-2 flex items-center gap-1.5">
                                    <Clock className="h-3 w-3 shrink-0" />
                                    {diasParaVencer === 0 ? "Vence hoje!" : `Vence em ${diasParaVencer}d`}
                                  </p>
                                )}
                              </CardContent>
                            </Card>
                          </Link>
                        </div>
                      );
                    })}

                    {/* Drop zone hint when column is empty */}
                    {cards.length === 0 && (
                      <div className="h-20 rounded-xl border-2 border-dashed border-outline-variant/30 flex items-center justify-center">
                        <p className="text-xs text-on-surface-variant/50">Arraste aqui</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
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
