import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Wand2, Loader2, Plane } from "lucide-react";
import { cn } from "@/lib/utils";
import useAgenciaPlano from "@/hooks/useAgenciaPlano";
import useAgenciaId from "@/hooks/useAgenciaId";
import AIPaywall from "@/components/ai/AIPaywall";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";

interface AICopilotModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SUGGESTIONS = [
  "Pacote Família Disney",
  "Fim de semana em Buenos Aires",
  "Resort no Nordeste",
];

export default function AICopilotModal({ open, onOpenChange }: AICopilotModalProps) {
  const [prompt, setPrompt] = useState("");
  const [phase, setPhase] = useState<"input" | "loading" | "done">("input");
  const [resposta, setResposta] = useState("");
  const [erro, setErro] = useState("");
  const [slowWarning, setSlowWarning] = useState(false);
  const { hasAIAccess } = useAgenciaPlano();
  const agenciaId = useAgenciaId();

  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setPhase("input");
        setPrompt("");
        setResposta("");
        setErro("");
      }, 300);
    }
  }, [open]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setPhase("loading");
    setErro("");
    setResposta("");

    try {
      const { data, error } = await supabase.functions.invoke("copilot-webhook", {
        body: { mensagem: prompt, agencia_id: agenciaId },
      });

      if (error) throw error;

      if (data?.error) {
        setErro(data.error);
        setPhase("input");
        return;
      }

      setResposta(data?.resposta || "Sem resposta do servidor.");
      setPhase("done");
    } catch (err: any) {
      console.error("Copilot error:", err);
      setErro(err?.message || "Erro ao conectar com o assistente.");
      setPhase("input");
    }
  };

  const handleSuggestion = (s: string) => {
    setPrompt(s);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
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

                {erro && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                    {erro}
                  </div>
                )}

                <Button
                  onClick={handleGenerate}
                  disabled={!prompt.trim()}
                  className="w-full gap-2"
                >
                  <Wand2 className="h-4 w-4" />
                  Gerar com IA
                </Button>
              </div>
            )}

            {phase === "loading" && (
              <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
                <div className="h-14 w-14 rounded-full bg-muted border border-border flex items-center justify-center animate-pulse">
                  <Plane className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground flex items-center gap-2 justify-center">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    IA pesquisando voos e calculando taxas...
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Isso pode levar de 5 a 10 segundos.
                  </p>
                </div>
              </div>
            )}

            {phase === "done" && (
              <div className="space-y-4 mt-1">
                <div className="prose prose-sm dark:prose-invert max-w-none rounded-lg border bg-muted/30 p-4 overflow-x-auto">
                  <ReactMarkdown>{resposta}</ReactMarkdown>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setPhase("input");
                      setResposta("");
                    }}
                  >
                    Nova consulta
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => onOpenChange(false)}
                  >
                    Fechar
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
