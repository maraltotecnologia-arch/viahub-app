import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Wand2, Check, Loader2, Brain, Plane, Hotel, Percent, FileCheck, PartyPopper } from "lucide-react";
import { cn } from "@/lib/utils";
import useAgenciaPlano from "@/hooks/useAgenciaPlano";
import AIPaywall from "@/components/ai/AIPaywall";

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
  const { hasAIAccess } = useAgenciaPlano();

  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setPhase("input");
        setPrompt("");
        setCurrentStep(0);
      }, 300);
    }
  }, [open]);

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
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <Wand2 className="h-4 w-4 text-muted-foreground" />
            Assistente de Cotação
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground ml-1">Beta</span>
          </DialogTitle>
        </DialogHeader>

        {!hasAIAccess ? (
          <AIPaywall />
        ) : (
          <>
            {phase === "input" && (
              <div className="space-y-4 mt-1">
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Ex: Cotação para casal, 7 dias em Paris saindo de SP em outubro. Hotel 4 estrelas e voo direto..."
                  className="min-h-[120px] resize-none text-sm"
                />

                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">Sugestões rápidas:</p>
                  <div className="flex flex-wrap gap-2">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => handleSuggestion(s)}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150",
                          "border-border hover:border-foreground/30 hover:bg-muted/50 text-muted-foreground",
                          prompt === s && "border-primary bg-primary/5 text-primary"
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={handleGenerate}
                  disabled={!prompt.trim()}
                  className="w-full gap-2"
                >
                  <Wand2 className="h-4 w-4" />
                  Gerar Orçamento
                </Button>
              </div>
            )}

            {phase === "loading" && (
              <div className="space-y-2.5 mt-3 py-1">
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
                        active && "bg-muted",
                        !done && !active && "opacity-40"
                      )}
                    >
                      <div className={cn(
                        "flex items-center justify-center h-7 w-7 rounded-full shrink-0 transition-all duration-300",
                        done && "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
                        active && "bg-muted-foreground/10 text-foreground",
                        !done && !active && "bg-muted text-muted-foreground"
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
                        className={cn(
                          "text-sm font-medium transition-colors",
                          done && "text-emerald-600 dark:text-emerald-400",
                          active && "text-foreground",
                          !done && !active && "text-muted-foreground"
                        )}
                      >
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {phase === "done" && (
              <div className="flex flex-col items-center justify-center py-8 gap-4 text-center animate-fade-in">
                <div className="h-16 w-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <PartyPopper className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    Orçamento Gerado com Sucesso!
                  </h3>
                  <p className="text-sm mt-1 text-muted-foreground">
                    Seu orçamento está pronto para revisão e envio ao cliente.
                  </p>
                </div>
                <Button
                  className="gap-2 mt-2"
                  onClick={() => onOpenChange(false)}
                >
                  <FileCheck className="h-4 w-4" />
                  Ver Orçamento
                </Button>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
