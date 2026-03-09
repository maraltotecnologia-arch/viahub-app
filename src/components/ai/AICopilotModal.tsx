import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Check, Loader2, Brain, Plane, Hotel, Percent, FileCheck, PartyPopper } from "lucide-react";
import { cn } from "@/lib/utils";

interface AICopilotModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SUGGESTIONS = [
  "Pacote Família Disney",
  "Fim de semana em Buenos Aires",
  "Resort no Nordeste",
];

const STEPS = [
  { label: "Interpretando pedido...", icon: Brain },
  { label: "Buscando voos em tempo real...", icon: Plane },
  { label: "Selecionando os melhores hotéis...", icon: Hotel },
  { label: "Aplicando markup da agência...", icon: Percent },
  { label: "Finalizando PDF...", icon: FileCheck },
];

export default function AICopilotModal({ open, onOpenChange }: AICopilotModalProps) {
  const [prompt, setPrompt] = useState("");
  const [phase, setPhase] = useState<"input" | "loading" | "done">("input");
  const [currentStep, setCurrentStep] = useState(0);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setPhase("input");
        setPrompt("");
        setCurrentStep(0);
      }, 300);
    }
  }, [open]);

  // Simulated step progression
  useEffect(() => {
    if (phase !== "loading") return;
    if (currentStep >= STEPS.length) {
      const t = setTimeout(() => setPhase("done"), 600);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setCurrentStep((s) => s + 1), 900);
    return () => clearTimeout(t);
  }, [phase, currentStep]);

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    setPhase("loading");
    setCurrentStep(0);
  };

  const handleSuggestion = (s: string) => {
    setPrompt(s);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto border-[color:var(--border-color)] bg-[color:var(--bg-card)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold" style={{ color: "var(--text-primary)" }}>
            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white">
              <Sparkles className="h-4 w-4" />
            </div>
            ViaHub AI Copilot
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] ml-1">Beta</span>
          </DialogTitle>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Assistente de Cotação Inteligente</p>
        </DialogHeader>

        {phase === "input" && (
          <div className="space-y-4 mt-2">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ex: Cotação para casal, 7 dias em Paris saindo de SP em outubro. Hotel 4 estrelas e voo direto..."
              className="min-h-[120px] resize-none text-sm border-[color:var(--border-input)] bg-[color:var(--bg-input)]"
              style={{ color: "var(--text-primary)" }}
            />

            {/* Suggestion chips */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Sugestões rápidas:</p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSuggestion(s)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150",
                      "border-[color:var(--border-color)] hover:border-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10",
                      prompt === s
                        ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]"
                        : ""
                    )}
                    style={{ color: prompt === s ? "var(--accent-primary)" : "var(--text-secondary)" }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={!prompt.trim()}
              className="w-full gap-2 font-semibold text-white"
              style={{
                background: prompt.trim() ? "var(--accent-gradient)" : undefined,
              }}
              variant={prompt.trim() ? "default" : "secondary"}
            >
              <Sparkles className="h-4 w-4" />
              Gerar Orçamento Mágico ✨
            </Button>
          </div>
        )}

        {phase === "loading" && (
          <div className="space-y-3 mt-4 py-2">
            {STEPS.map((step, i) => {
              const done = i < currentStep;
              const active = i === currentStep;
              const StepIcon = step.icon;

              return (
                <div
                  key={i}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-300",
                    done && "bg-emerald-500/10",
                    active && "bg-[var(--accent-primary)]/10",
                    !done && !active && "opacity-40"
                  )}
                >
                  <div className={cn(
                    "flex items-center justify-center h-7 w-7 rounded-full shrink-0 transition-all duration-300",
                    done && "bg-emerald-500/20 text-emerald-500 dark:text-emerald-400",
                    active && "bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]",
                    !done && !active && "bg-[var(--border-color)] text-[var(--text-muted)]"
                  )}>
                    {done ? (
                      <Check className="h-4 w-4" />
                    ) : active ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <StepIcon className="h-3.5 w-3.5" />
                    )}
                  </div>
                  <span
                    className={cn("text-sm font-medium transition-colors", done && "text-emerald-600 dark:text-emerald-400")}
                    style={{ color: done ? undefined : active ? "var(--text-primary)" : "var(--text-muted)" }}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {phase === "done" && (
          <div className="flex flex-col items-center justify-center py-8 gap-4 text-center animate-fade-in-up">
            <div className="h-16 w-16 rounded-full bg-emerald-500/15 flex items-center justify-center">
              <PartyPopper className="h-8 w-8 text-emerald-500" />
            </div>
            <div>
              <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                Orçamento Gerado com Sucesso!
              </h3>
              <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
                Seu orçamento está pronto para revisão e envio ao cliente.
              </p>
            </div>
            <Button
              variant="gradient"
              className="gap-2 mt-2"
              onClick={() => onOpenChange(false)}
            >
              <FileCheck className="h-4 w-4" />
              Ver Orçamento
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
