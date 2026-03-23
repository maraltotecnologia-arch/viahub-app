import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Wand2, Loader2, Plane, ArrowLeft, FileText, Check } from "lucide-react";
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

interface CopilotItem {
  tipo: string;
  descricao: string;
  custo: number;
  markup: number;
  taxa_fixa: number;
  quantidade: number;
  valor_final: number;
  partida_data?: string;
  partida_hora?: string;
  chegada_data?: string;
  chegada_hora?: string;
  observacao?: string;
}

interface CopilotResponse {
  texto_formatado: string;
  titulo_orcamento: string;
  markup_aplicado: number;
  solicitacao_original: string;
  origem_cidade?: string;
  destino_cidade?: string;
  data_ida?: string;
  data_volta?: string | null;
  adultos?: number;
  is_round_trip?: boolean;
  total_com_markup?: number;
  itens_orcamento: CopilotItem[];
}

const SUGGESTIONS = [
  {
    label: "Pacote Família Disney",
    prompt: "Cotação para família com 2 adultos e 2 crianças. Pacote Disney Orlando saindo de São Paulo em julho, 10 dias.",
  },
  {
    label: "Fim de semana em Buenos Aires",
    prompt: "Cotação para casal, fim de semana em Buenos Aires saindo de São Paulo em maio. Voo + hotel 3 estrelas.",
  },
  {
    label: "Resort no Nordeste",
    prompt: "Cotação para casal, 5 dias em resort no Nordeste saindo de São Paulo em junho. Voo + all inclusive.",
  },
];

function parseOptions(text: string): { label: string; content: string }[] {
  const optionRegex = /(?:^|\n)(?:#{1,4}\s*)?(?:\*{1,2})?(?:Opção|Opcao|Option)\s+(\d+)(?:\*{1,2})?[:\s\-–—]*/gi;
  const matches = [...text.matchAll(optionRegex)];
  if (matches.length < 2) return [{ label: "Resultado", content: text }];
  const options: { label: string; content: string }[] = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index!;
    const end = i + 1 < matches.length ? matches[i + 1].index! : text.length;
    options.push({ label: `Opção ${matches[i][1]}`, content: text.substring(start, end).trim() });
  }
  return options;
}

export default function AICopilotModal({ open, onOpenChange }: AICopilotModalProps) {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("");
  const [phase, setPhase] = useState<"input" | "loading" | "done">("input");
  const [resposta, setResposta] = useState("");
  const [structuredData, setStructuredData] = useState<CopilotResponse | null>(null);
  const [erro, setErro] = useState("");
  const [slowWarning, setSlowWarning] = useState(false);
  const [markupUsado, setMarkupUsado] = useState<number>(10);
  const [selectedOption, setSelectedOption] = useState(0);
  const { hasAIAccess } = useAgenciaPlano();
  const agenciaId = useAgenciaId();

  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setPhase("input");
        setPrompt("");
        setResposta("");
        setStructuredData(null);
        setErro("");
        setSlowWarning(false);
        setSelectedOption(0);
      }, 300);
    }
  }, [open]);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setErro("Digite sua solicitação antes de continuar.");
      return;
    }
    setPhase("loading");
    setErro("");
    setResposta("");
    setStructuredData(null);
    setSlowWarning(false);
    setSelectedOption(0);

    const slowTimer = setTimeout(() => setSlowWarning(true), 15000);

    try {
      let markupVoos = 10;
      if (agenciaId) {
        const { data: markupData } = await supabase
          .from("configuracoes_markup")
          .select("markup_percentual")
          .eq("agencia_id", agenciaId)
          .eq("tipo_servico", "voo")
          .eq("ativo", true)
          .maybeSingle();

        if (markupData?.markup_percentual) {
          markupVoos = Number(markupData.markup_percentual);
        }
      }
      setMarkupUsado(markupVoos);

      const { data, error } = await supabase.functions.invoke("copilot-webhook", {
        body: { mensagem: prompt, agencia_id: agenciaId },
      });

      if (error) throw error;

      if (data?.error) {
        setErro(data.error);
        setPhase("input");
        return;
      }

      if (data?.structured) {
        setStructuredData(data.structured);
        setResposta(data.structured.texto_formatado || "");
        setMarkupUsado(data.structured.markup_aplicado || markupVoos);
      } else {
        setResposta(data?.resposta || "Sem resposta do servidor.");
      }
      setPhase("done");
    } catch {
      setErro("Não foi possível conectar ao assistente.");
      setPhase("input");
    } finally {
      clearTimeout(slowTimer);
    }
  };

  const options = resposta ? parseOptions(resposta) : [];
  const hasMultipleOptions = options.length > 1;

  const handleCriarOrcamento = () => {
    onOpenChange(false);

    if (structuredData && structuredData.itens_orcamento?.length > 0) {
      let itensToUse = structuredData.itens_orcamento;

      if (!structuredData.is_round_trip && hasMultipleOptions && itensToUse.length >= options.length) {
        itensToUse = [itensToUse[selectedOption]];
      }

      navigate("/orcamentos/novo", {
        state: {
          copilot: {
            titulo: structuredData.titulo_orcamento,
            observacoes: structuredData.solicitacao_original,
            itens: itensToUse,
            markup_aplicado: structuredData.markup_aplicado,
          },
        },
      });
    } else {
      navigate("/orcamentos/novo", {
        state: { observacoesPrefill: prompt },
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold font-headline text-on-surface">
            <span>✈️</span>
            Assistente de Cotação
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-surface-container-highest text-on-surface-variant font-label ml-1">Beta</span>
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
                  onChange={(e) => {
                    setPrompt(e.target.value);
                    if (erro) setErro("");
                  }}
                  placeholder="Ex: Cotação para casal, 7 dias em Paris saindo de SP em outubro..."
                  className="min-h-[120px] resize-none text-sm bg-surface-container-high rounded-xl p-4 border-none focus:ring-1 focus:ring-primary/30"
                />

                <div className="space-y-1.5">
                  <p className="text-xs font-medium font-label text-on-surface-variant">Sugestões rápidas:</p>
                  <div className="flex flex-wrap gap-2">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s.label}
                        onClick={() => {
                          setPrompt(s.prompt);
                          if (erro) setErro("");
                        }}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-xs font-medium font-label transition-all duration-150",
                          "bg-surface-container-high text-on-surface-variant hover:bg-primary/10 hover:text-primary cursor-pointer",
                          prompt === s.prompt && "bg-primary/10 text-primary"
                        )}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {erro && (
                  <div className="rounded-xl border border-error/20 bg-error-container/20 p-3 text-sm text-error">
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
                <div className="h-14 w-14 rounded-full bg-surface-container-high flex items-center justify-center animate-pulse">
                  <Plane className="h-6 w-6 text-on-surface-variant" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-on-surface flex items-center gap-2 justify-center font-headline">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Buscando voos...
                  </p>
                  <p className="text-xs text-on-surface-variant font-body">
                    Isso pode levar de 5 a 10 segundos.
                  </p>
                  {slowWarning && (
                    <p className="text-xs text-[#e65100] mt-1">
                      A resposta está demorando mais que o esperado.
                    </p>
                  )}
                </div>
              </div>
            )}

            {phase === "done" && (
              <div className="space-y-4 mt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-on-surface-variant hover:text-on-surface"
                  onClick={() => {
                    setPhase("input");
                    setResposta("");
                    setStructuredData(null);
                    setPrompt("");
                    setSelectedOption(0);
                  }}
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Nova consulta
                </Button>

                {hasMultipleOptions ? (
                  <div className="space-y-3">
                    {options.map((opt, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "rounded-xl border p-4 cursor-pointer transition-all duration-150",
                          selectedOption === idx
                            ? "border-primary bg-primary/6"
                            : "border-outline-variant/20 hover:border-primary/30 hover:bg-primary/4"
                        )}
                        onClick={() => setSelectedOption(idx)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold font-label text-on-surface-variant">{opt.label}</span>
                          {selectedOption === idx && (
                            <span className="flex items-center gap-1 text-xs font-medium text-primary">
                              <Check className="h-3.5 w-3.5" />
                              Selecionada
                            </span>
                          )}
                        </div>
                        <div className="prose prose-sm dark:prose-invert max-w-none overflow-y-auto max-h-[30vh]">
                          <ReactMarkdown>{opt.content}</ReactMarkdown>
                        </div>
                        {selectedOption !== idx && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-3 gap-1.5"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedOption(idx);
                            }}
                          >
                            Usar esta opção
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="prose prose-sm dark:prose-invert max-w-none rounded-xl bg-surface-container-low p-5 overflow-y-auto max-h-[50vh]">
                    <ReactMarkdown>{resposta}</ReactMarkdown>
                  </div>
                )}

                {structuredData?.is_round_trip && structuredData?.total_com_markup != null && (
                  <div className="rounded-xl border border-primary/20 bg-primary/6 p-3 text-center">
                    <p className="text-sm text-on-surface-variant font-body">Total ida + volta</p>
                    <p className="text-lg font-bold font-display text-on-surface">
                      R$ {structuredData.total_com_markup.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                )}

                <p className="text-xs text-on-surface-variant font-label">
                  Markup aplicado: <span className="font-semibold text-on-surface">{markupUsado}%</span>
                </p>

                <Button
                  className="w-full gap-2"
                  onClick={handleCriarOrcamento}
                >
                  <FileText className="h-4 w-4" />
                  Criar orçamento com estes dados
                </Button>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
