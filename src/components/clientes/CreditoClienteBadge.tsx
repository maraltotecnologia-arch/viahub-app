import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { Wallet, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { formatarApenasDatabrasilia } from "@/lib/date-utils";
import useUserRole from "@/hooks/useUserRole";

// ── Types ──────────────────────────────────────────────────────────────────

interface HistoricoEntry {
  id: string;
  tipo: "entrada" | "uso";
  valor: number;
  descricao: string | null;
  created_at: string;
  usuarios: { nome: string } | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// ── Component ──────────────────────────────────────────────────────────────

interface CreditoClienteBadgeProps {
  clienteId: string;
  agenciaId: string;
  credito: number;
}

export default function CreditoClienteBadge({
  clienteId,
  credito,
}: CreditoClienteBadgeProps) {
  const { isAdmin, isFinanceiro } = useUserRole();
  const canViewHistory = isAdmin || isFinanceiro;

  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: historico = [], isLoading } = useQuery({
    queryKey: ["historico-credito", clienteId],
    enabled: dialogOpen && canViewHistory,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("historico_credito_cliente" as any)
        .select("id, tipo, valor, descricao, created_at, usuarios(nome)")
        .eq("cliente_id", clienteId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as HistoricoEntry[];
    },
  });

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <>
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
        <div className="h-9 w-9 rounded-xl flex items-center justify-center bg-emerald-500/15 shrink-0">
          <Wallet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        </div>

        <div className="flex-1 min-w-0">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 cursor-default w-fit">
                  {fmt(credito)} em crédito disponível
                </p>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[220px] text-center text-xs">
                Crédito gerado por reembolso — válido para próxima viagem
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <p className="text-xs text-muted-foreground mt-0.5">
            Pode ser aplicado ao criar um novo orçamento
          </p>
        </div>

        {canViewHistory && (
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 text-xs h-8 border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-700 dark:hover:text-emerald-300"
            onClick={() => setDialogOpen(true)}
          >
            <History className="h-3.5 w-3.5 mr-1.5" />
            Ver histórico
          </Button>
        )}
      </div>

      {/* ── Histórico Dialog ─────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Histórico de Crédito</DialogTitle>
          </DialogHeader>

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : historico.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              Nenhuma movimentação encontrada
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {historico.map((h) => (
                <div
                  key={h.id}
                  className="flex items-start gap-3 p-3 rounded-xl border bg-surface-container-low dark:bg-surface-container"
                >
                  {/* Type dot */}
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${
                      h.tipo === "entrada"
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        : "bg-red-500/15 text-red-600 dark:text-red-400"
                    }`}
                  >
                    {h.tipo === "entrada" ? "+" : "−"}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm font-semibold ${
                          h.tipo === "entrada"
                            ? "text-emerald-700 dark:text-emerald-300"
                            : "text-red-700 dark:text-red-400"
                        }`}
                      >
                        {h.tipo === "entrada" ? "+" : "−"}{fmt(Number(h.valor))}
                      </span>
                      <Badge
                        variant={h.tipo === "entrada" ? "success" : "destructive"}
                        className="text-[10px] px-1.5 py-0 h-4 shrink-0"
                      >
                        {h.tipo === "entrada" ? "Entrada" : "Uso"}
                      </Badge>
                    </div>
                    {h.descricao && (
                      <p className="text-xs text-muted-foreground mt-0.5">{h.descricao}</p>
                    )}
                    <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground/70">
                      <span>{formatarApenasDatabrasilia(h.created_at)}</span>
                      {h.usuarios?.nome && (
                        <>
                          <span>·</span>
                          <span>{h.usuarios.nome}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Saldo atual */}
          <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-surface-container border mt-1">
            <span className="text-sm font-medium text-muted-foreground">Saldo atual</span>
            <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
              {fmt(credito)}
            </span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
