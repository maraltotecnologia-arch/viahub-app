import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Plus, ExternalLink, Loader2, History } from "lucide-react";
import { toast } from "sonner";
import { formatarDataHoraBrasilia } from "@/lib/date-utils";
import { formatError } from "@/lib/errors";
import { useAuth } from "@/contexts/AuthContext";
import {
  useTimelineCliente,
  TIPO_ICONE,
  TIPO_LABEL,
  type TipoInteracao,
} from "@/hooks/useTimelineCliente";

// ── Constants ──────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

const STATUS_VARIANT: Record<string, "muted" | "default" | "success" | "destructive" | "info"> = {
  rascunho:  "muted",
  enviado:   "default",
  aprovado:  "success",
  perdido:   "destructive",
  emitido:   "info",
  pago:      "success",
};

const STATUS_LABEL: Record<string, string> = {
  rascunho: "Rascunho",
  enviado:  "Enviado",
  aprovado: "Aprovado",
  perdido:  "Perdido",
  emitido:  "Emitido",
  pago:     "Pago",
};

// ── Helpers ────────────────────────────────────────────────────────────────

/** Retorna "YYYY-MM-DDTHH:MM" no fuso de Brasília para o input datetime-local */
function nowBrtLocal(): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const brt = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  return `${brt.getFullYear()}-${pad(brt.getMonth() + 1)}-${pad(brt.getDate())}T${pad(brt.getHours())}:${pad(brt.getMinutes())}`;
}

/** Converte valor de datetime-local (interpretado como BRT) para ISO UTC */
function brtLocalToIso(localStr: string): string {
  return new Date(`${localStr}:00-03:00`).toISOString();
}

// ── Component ──────────────────────────────────────────────────────────────

interface TimelineClienteProps {
  clienteId: string;
  agenciaId: string;
}

export default function TimelineCliente({ clienteId, agenciaId }: TimelineClienteProps) {
  const { user } = useAuth();
  const { items, isLoading, addInteracao } = useTimelineCliente(clienteId, agenciaId);

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [sheetOpen,    setSheetOpen]    = useState(false);

  // Form state
  const [tipo,      setTipo]      = useState<TipoInteracao | "">("");
  const [dataHora,  setDataHora]  = useState(nowBrtLocal);
  const [descricao, setDescricao] = useState("");

  const visibleItems = items.slice(0, visibleCount);
  const hasMore = items.length > visibleCount;

  const openSheet = () => {
    setTipo("");
    setDataHora(nowBrtLocal());
    setDescricao("");
    setSheetOpen(true);
  };

  const handleSave = async () => {
    if (!tipo) {
      toast.error("Selecione o tipo de interação");
      return;
    }
    if (descricao.trim().length < 10) {
      toast.error("Descrição deve ter no mínimo 10 caracteres");
      return;
    }
    if (!user?.id) {
      toast.error("Usuário não autenticado");
      return;
    }
    await addInteracao.mutateAsync(
      {
        tipo,
        descricao,
        data_interacao: brtLocalToIso(dataHora),
        usuario_id: user.id,
      },
      {
        onSuccess: () => {
          toast.success("Interação registrada");
          setSheetOpen(false);
        },
        onError: () => toast.error(formatError("CLI004")),
      }
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <>
      <Card>
        <CardHeader className="py-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Histórico de Interações</CardTitle>
              {items.length > 0 && (
                <span className="text-xs text-muted-foreground font-normal">
                  ({items.length})
                </span>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={openSheet}>
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Registrar interação
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="space-y-5">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2 pt-1">
                    <Skeleton className="h-4 w-56" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <History className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Nenhuma interação registrada ainda</p>
              <Button variant="ghost" size="sm" className="text-xs" onClick={openSheet}>
                <Plus className="h-3 w-3 mr-1" /> Registrar primeira interação
              </Button>
            </div>
          ) : (
            <div className="relative">
              {/* Linha vertical da timeline */}
              <div
                className="absolute left-[15px] top-4 bottom-6 w-px bg-border"
                aria-hidden
              />

              <div className="space-y-0">
                {visibleItems.map((item) => (
                  <div key={item.id} className="relative flex gap-4 pb-6 last:pb-0">
                    {/* Ícone-dot */}
                    <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-background border-2 border-border text-sm leading-none">
                      {item.kind === "interacao"
                        ? TIPO_ICONE[item.tipo_interacao!]
                        : "📋"}
                    </div>

                    {/* Conteúdo */}
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          <span className="text-sm font-semibold text-foreground leading-snug">
                            {item.titulo}
                          </span>
                          {item.kind === "orcamento" && item.orcamento_status && (
                            <Badge
                              variant={STATUS_VARIANT[item.orcamento_status] ?? "muted"}
                              className="text-[10px] px-1.5 py-0 h-4 shrink-0"
                            >
                              {STATUS_LABEL[item.orcamento_status] ?? item.orcamento_status}
                            </Badge>
                          )}
                        </div>
                        {item.kind === "orcamento" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs shrink-0 text-muted-foreground hover:text-primary"
                            asChild
                          >
                            <Link to={`/orcamentos/${item.orcamento_id}`}>
                              <ExternalLink className="h-3 w-3 mr-1" />
                              Ver orçamento
                            </Link>
                          </Button>
                        )}
                      </div>

                      {item.descricao && (
                        <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap leading-relaxed">
                          {item.descricao}
                        </p>
                      )}

                      <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground/70">
                        <span>{formatarDataHoraBrasilia(item.data)}</span>
                        {item.usuario_nome && (
                          <>
                            <span>·</span>
                            <span>{item.usuario_nome}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {hasMore && (
                <div className="mt-4 pt-4 border-t text-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                  >
                    Carregar mais ({items.length - visibleCount} restantes)
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Sheet: Registrar interação ─────────────────────────────────────── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>Registrar interação</SheetTitle>
          </SheetHeader>

          <div className="space-y-5">
            {/* Tipo */}
            <div className="space-y-2">
              <Label>
                Tipo <span className="text-destructive">*</span>
              </Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as TipoInteracao)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo..." />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(TIPO_LABEL) as TipoInteracao[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {TIPO_ICONE[k]}&nbsp;&nbsp;{TIPO_LABEL[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Data e hora */}
            <div className="space-y-2">
              <Label>Data e hora</Label>
              <input
                type="datetime-local"
                value={dataHora}
                onChange={(e) => setDataHora(e.target.value)}
                className="flex h-10 w-full rounded-[10px] border border-input bg-background px-3.5 py-2.5 text-sm transition-[border-color,box-shadow] duration-150 focus-visible:outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/10"
              />
            </div>

            {/* Descrição */}
            <div className="space-y-2">
              <Label>
                Descrição <span className="text-destructive">*</span>
              </Label>
              <Textarea
                placeholder="Descreva o que foi tratado nesta interação…"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                rows={5}
              />
              {descricao.length > 0 && descricao.trim().length < 10 && (
                <p className="text-xs text-destructive">Mínimo 10 caracteres</p>
              )}
            </div>

            <Button
              variant="default"
              className="w-full"
              onClick={handleSave}
              disabled={addInteracao.isPending || !tipo || descricao.trim().length < 10}
            >
              {addInteracao.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {addInteracao.isPending ? "Salvando…" : "Registrar interação"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
