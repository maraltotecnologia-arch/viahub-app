import { Fragment, useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/ConfirmDialog";

export type StatusViagem = "cotacao" | "confirmado" | "em_viagem" | "concluido" | "cancelado";

export const STATUS_VIAGEM_LABELS: Record<StatusViagem, string> = {
  cotacao: "Em cotação",
  confirmado: "Confirmado",
  em_viagem: "Em viagem",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

const STEPS: StatusViagem[] = ["cotacao", "confirmado", "em_viagem", "concluido"];

function getNextStep(current: StatusViagem): StatusViagem | null {
  const idx = STEPS.indexOf(current);
  if (idx === -1 || idx >= STEPS.length - 1) return null;
  return STEPS[idx + 1];
}

function canAdvance(current: StatusViagem, orcStatus: string): boolean {
  if (current === "cancelado" || current === "concluido") return false;
  const next = getNextStep(current);
  if (!next) return false;
  if (next === "confirmado") return ["aprovado", "emitido", "pago"].includes(orcStatus);
  return true;
}

function canCancel(current: StatusViagem): boolean {
  return ["cotacao", "confirmado", "em_viagem"].includes(current);
}

interface Props {
  statusViagem: string | null;
  orcStatus: string;
  onAdvance: (next: StatusViagem) => Promise<void>;
  onCancel: () => Promise<void>;
  loading?: boolean;
}

export default function StatusViagemStepper({ statusViagem, orcStatus, onAdvance, onCancel, loading }: Props) {
  const current = (statusViagem as StatusViagem) || "cotacao";
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const isCanceled = current === "cancelado";
  const next = getNextStep(current);
  const canAdvanceNow = canAdvance(current, orcStatus);
  const needsApproval = !canAdvanceNow && next === "confirmado" && !["aprovado", "emitido", "pago"].includes(orcStatus);
  const currentIdx = STEPS.indexOf(current);

  return (
    <div className="space-y-4">
      {/* Horizontal stepper */}
      <div className="flex items-start w-full">
        {STEPS.map((step, i) => {
          const isDone = !isCanceled && currentIdx > i;
          const isActive = !isCanceled && currentIdx === i;

          return (
            <Fragment key={step}>
              <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                <div
                  className={[
                    "h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all",
                    isDone
                      ? "bg-success/10 border-success text-success"
                      : isActive
                      ? "text-white border-[#0037b0]"
                      : "bg-muted border-muted text-muted-foreground",
                  ].join(" ")}
                  style={isActive ? { backgroundColor: "#0037b0" } : undefined}
                >
                  {isDone ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                <span
                  className={[
                    "text-[11px] font-medium text-center leading-tight max-w-[60px]",
                    isDone ? "text-success" : isActive ? "font-semibold" : "text-muted-foreground",
                  ].join(" ")}
                  style={isActive ? { color: "#0037b0" } : undefined}
                >
                  {step === "em_viagem" ? "Em viagem" : step === "cotacao" ? "Cotação" : step === "confirmado" ? "Confirmado" : "Concluído"}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={[
                    "flex-1 h-0.5 mx-2 mt-4 rounded-full transition-colors",
                    !isCanceled && currentIdx > i ? "bg-success" : "bg-muted",
                  ].join(" ")}
                />
              )}
            </Fragment>
          );
        })}
      </div>

      {/* Cancelled banner */}
      {isCanceled && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/8 border border-destructive/20">
          <X className="h-4 w-4 text-destructive shrink-0" />
          <p className="text-sm text-destructive font-medium">Viagem cancelada</p>
        </div>
      )}

      {/* Actions */}
      {!isCanceled && current !== "concluido" && (
        <div className="flex items-center gap-2 flex-wrap">
          {next && (
            <Button
              size="sm"
              disabled={!canAdvanceNow || loading}
              onClick={() => onAdvance(next)}
              className="text-white hover:opacity-90"
              style={{ backgroundColor: "#0037b0" }}
            >
              {loading ? "Salvando…" : `Avançar para ${STATUS_VIAGEM_LABELS[next]}`}
            </Button>
          )}
          {needsApproval && (
            <p className="text-xs text-muted-foreground">Aprove o orçamento para confirmar a viagem.</p>
          )}
          {canCancel(current) && (
            <Button
              size="sm"
              variant="outline"
              className="border-destructive/40 text-destructive hover:bg-destructive/8"
              disabled={loading}
              onClick={() => setShowCancelConfirm(true)}
            >
              Cancelar viagem
            </Button>
          )}
        </div>
      )}

      <ConfirmDialog
        open={showCancelConfirm}
        onOpenChange={setShowCancelConfirm}
        title="Cancelar viagem?"
        description="A viagem será marcada como cancelada. Esta ação não pode ser desfeita facilmente."
        confirmLabel="Confirmar cancelamento"
        variant="destructive"
        onConfirm={() => {
          setShowCancelConfirm(false);
          onCancel();
        }}
      />
    </div>
  );
}

/* ── Badge used in listing ─────────────────────────────────────── */
export function StatusViagemBadge({ status }: { status: string | null }) {
  const s = (status || "cotacao") as StatusViagem;
  const cfg: Record<StatusViagem, { label: string; cls: string; pulse?: boolean }> = {
    cotacao:    { label: "Em cotação",  cls: "bg-muted text-muted-foreground" },
    confirmado: { label: "Confirmado",  cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
    em_viagem:  { label: "Em viagem",   cls: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", pulse: true },
    concluido:  { label: "Concluído",   cls: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
    cancelado:  { label: "Cancelado",   cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  };
  const c = cfg[s] ?? cfg.cotacao;
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${c.cls}`}>
      {c.pulse && <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />}
      {c.label}
    </span>
  );
}
