import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, Zap, FileText, AlertTriangle, CheckCircle2, Copy, Download, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

type Metodo = "CREDIT_CARD" | "PIX" | "BOLETO";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agenciaId: string;
  metodoAtual: string | null;
}

const METODOS: { value: Metodo; label: string; icon: typeof CreditCard; desc: string }[] = [
  { value: "CREDIT_CARD", label: "Cartão de Crédito", icon: CreditCard, desc: "Aprovação imediata" },
  { value: "PIX", label: "PIX", icon: Zap, desc: "Aprovação imediata" },
  { value: "BOLETO", label: "Boleto Bancário", icon: FileText, desc: "Compensação em 1-3 dias úteis" },
];

function detectBrand(num: string): string {
  const n = num.replace(/\s/g, "");
  if (/^4/.test(n)) return "Visa";
  if (/^5[1-5]/.test(n) || /^2(2[2-9]|[3-6]|7[01]|720)/.test(n)) return "Mastercard";
  if (/^3[47]/.test(n)) return "Amex";
  if (/^(636|438935|504175|451416|636297|5067|4576|4011)/.test(n)) return "Elo";
  if (/^606282/.test(n)) return "Hipercard";
  return "";
}

function maskCard(v: string) {
  return v.replace(/\D/g, "").replace(/(.{4})/g, "$1 ").trim().slice(0, 19);
}

function maskExpiry(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 4);
  if (d.length >= 3) return d.slice(0, 2) + "/" + d.slice(2);
  return d;
}

// ─── Sub-components for post-confirmation views ───

function PixResultView({ qrCodeImage, copiaECola, paymentId, onConfirmed }: {
  qrCodeImage: string;
  copiaECola: string;
  paymentId: string;
  onConfirmed: () => void;
}) {
  const { toast } = useToast();
  const [polling, setPolling] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!paymentId) return;

    intervalRef.current = setInterval(async () => {
      try {
        const { data } = await supabase.functions.invoke("asaas-verificar-pagamento", {
          body: { payment_id: paymentId },
        });
        if (data?.status === "RECEIVED" || data?.status === "CONFIRMED") {
          setPolling(false);
          if (intervalRef.current) clearInterval(intervalRef.current);
          onConfirmed();
        }
      } catch { /* ignore */ }
    }, 5000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [paymentId, onConfirmed]);

  const handleCopy = () => {
    navigator.clipboard.writeText(copiaECola);
    toast({ title: "Código copiado!" });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-3 p-4">
        <p className="text-sm font-medium text-center">Escaneie o QR Code ou copie o código abaixo</p>
        <img
          src={`data:image/png;base64,${qrCodeImage}`}
          alt="QR Code PIX"
          className="w-48 h-48 border rounded-lg"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Copia e Cola</Label>
        <div className="flex gap-2">
          <Input value={copiaECola} readOnly className="text-xs font-mono" />
          <Button variant="outline" size="icon" onClick={handleCopy} className="shrink-0">
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {polling && (
        <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-muted/50 border border-border">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground">Aguardando confirmação do pagamento...</span>
        </div>
      )}
    </div>
  );
}

function BoletoResultView({ boletoUrl, linhaDigitavel }: {
  boletoUrl: string | null;
  linhaDigitavel: string | null;
}) {
  const { toast } = useToast();

  const handleCopyLinha = () => {
    if (linhaDigitavel) {
      navigator.clipboard.writeText(linhaDigitavel);
      toast({ title: "Linha digitável copiada!" });
    }
  };

  return (
    <div className="space-y-4">
      {linhaDigitavel && (
        <div className="space-y-2">
          <Label className="text-xs">Linha digitável</Label>
          <div className="flex gap-2">
            <Input value={linhaDigitavel} readOnly className="text-xs font-mono" />
            <Button variant="outline" size="icon" onClick={handleCopyLinha} className="shrink-0">
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {boletoUrl && (
        <Button variant="outline" className="w-full" asChild>
          <a href={boletoUrl} target="_blank" rel="noopener noreferrer">
            <Download className="h-4 w-4 mr-2" />
            Baixar boleto PDF
          </a>
        </Button>
      )}

      <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
        <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
        <p className="text-xs text-amber-800 dark:text-amber-300">
          Pague até o vencimento para manter seu acesso ativo.
        </p>
      </div>
    </div>
  );
}

// ─── Main modal ───

export default function MetodoPagamentoModal({ open, onOpenChange, agenciaId, metodoAtual }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Metodo | null>(null);
  const [loading, setLoading] = useState(false);

  // Card fields
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");

  // Post-confirmation state
  const [resultView, setResultView] = useState<"selection" | "pix" | "boleto" | null>("selection");
  const [pixData, setPixData] = useState<{ qrCodeImage: string; copiaECola: string; paymentId: string } | null>(null);
  const [boletoData, setBoletoData] = useState<{ boletoUrl: string | null; linhaDigitavel: string | null } | null>(null);

  const brand = detectBrand(cardNumber);

  const cardValid =
    selected !== "CREDIT_CARD" ||
    (cardNumber.replace(/\s/g, "").length >= 13 &&
      cardName.trim().length >= 3 &&
      cardExpiry.length === 5 &&
      cardCvv.length >= 3);

  const canConfirm = !!selected && selected !== metodoAtual && cardValid;

  const handleConfirm = async () => {
    if (!selected || !agenciaId) return;
    setLoading(true);
    try {
      const [mm, aa] = cardExpiry.split("/");
      const res = await supabase.functions.invoke("asaas-trocar-pagamento", {
        body: {
          agencia_id: agenciaId,
          novo_metodo: selected,
          ...(selected === "CREDIT_CARD" && {
            cardNumber: cardNumber.replace(/\s/g, ""),
            cardHolderName: cardName.trim(),
            cardExpiryMonth: mm,
            cardExpiryYear: `20${aa}`,
            cardCvv,
          }),
        },
      });

      if (res.error || res.data?.error) {
        toast({ title: "Erro", description: res.data?.error || res.error?.message, variant: "destructive" });
      } else {
        queryClient.invalidateQueries({ queryKey: ["ultimo-pagamento-forma"] });
        queryClient.invalidateQueries({ queryKey: ["debitos-aberto"] });

        if (res.data?.metodo === "PIX" && res.data?.pixQrCodeImage) {
          setPixData({
            qrCodeImage: res.data.pixQrCodeImage,
            copiaECola: res.data.pixCopiaECola || "",
            paymentId: res.data.pixPaymentId || "",
          });
          setResultView("pix");
        } else if (res.data?.metodo === "BOLETO") {
          setBoletoData({
            boletoUrl: res.data.boletoUrl || null,
            linhaDigitavel: res.data.boletoLinhaDigitavel || null,
          });
          setResultView("boleto");
        } else {
          // CREDIT_CARD
          toast({ title: "Método atualizado!", description: "Cartão será cobrado no próximo vencimento." });
          onOpenChange(false);
          resetForm();
        }
      }
    } catch {
      toast({ title: "Erro inesperado", variant: "destructive" });
    }
    setLoading(false);
  };

  const handlePixConfirmed = useCallback(() => {
    toast({ title: "Pagamento PIX confirmado!" });
    queryClient.invalidateQueries({ queryKey: ["debitos-aberto"] });
    queryClient.invalidateQueries({ queryKey: ["agencia-assinatura"] });
    onOpenChange(false);
    resetForm();
  }, [toast, queryClient, onOpenChange]);

  const resetForm = () => {
    setSelected(null);
    setCardNumber("");
    setCardName("");
    setCardExpiry("");
    setCardCvv("");
    setResultView("selection");
    setPixData(null);
    setBoletoData(null);
  };

  // ─── PIX result view ───
  if (resultView === "pix" && pixData) {
    return (
      <Dialog open={open} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Pagamento via PIX
            </DialogTitle>
            <DialogDescription>Realize o pagamento para confirmar a troca de método.</DialogDescription>
          </DialogHeader>
          <PixResultView
            qrCodeImage={pixData.qrCodeImage}
            copiaECola={pixData.copiaECola}
            paymentId={pixData.paymentId}
            onConfirmed={handlePixConfirmed}
          />
        </DialogContent>
      </Dialog>
    );
  }

  // ─── Boleto result view ───
  if (resultView === "boleto" && boletoData) {
    return (
      <Dialog open={open} onOpenChange={(v) => { if (!v) { onOpenChange(false); resetForm(); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Boleto Gerado
            </DialogTitle>
            <DialogDescription>Pague o boleto para confirmar a troca de método.</DialogDescription>
          </DialogHeader>
          <BoletoResultView
            boletoUrl={boletoData.boletoUrl}
            linhaDigitavel={boletoData.linhaDigitavel}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { onOpenChange(false); resetForm(); }}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // ─── Selection view ───
  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetForm(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Trocar método de pagamento</DialogTitle>
          <DialogDescription>Selecione o novo método de pagamento para sua assinatura.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {METODOS.map((m) => {
            const isSelected = selected === m.value;
            const isCurrent = metodoAtual === m.value;
            return (
              <button
                key={m.value}
                type="button"
                onClick={() => setSelected(m.value)}
                className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground/30"
                }`}
              >
                <m.icon className={`h-5 w-5 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{m.label}</span>
                    {isCurrent && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">Atual</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{m.desc}</p>
                </div>
              </button>
            );
          })}

          {selected === "BOLETO" && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-800 dark:text-amber-300">
                As próximas cobranças serão enviadas por boleto. A ativação ocorre após a compensação (1-3 dias úteis).
              </p>
            </div>
          )}

          {selected === "CREDIT_CARD" && (
            <div className="space-y-3 p-4 rounded-lg bg-muted/50 border border-border">
              <div>
                <Label className="text-xs">Número do cartão</Label>
                <div className="relative">
                  <Input
                    placeholder="0000 0000 0000 0000"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(maskCard(e.target.value))}
                    maxLength={19}
                  />
                  {brand && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                      {brand}
                    </span>
                  )}
                </div>
              </div>
              <div>
                <Label className="text-xs">Nome no cartão</Label>
                <Input
                  placeholder="Como impresso no cartão"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value.toUpperCase())}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Validade (MM/AA)</Label>
                  <Input
                    placeholder="MM/AA"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(maskExpiry(e.target.value))}
                    maxLength={5}
                  />
                </div>
                <div>
                  <Label className="text-xs">CVV</Label>
                  <Input
                    placeholder="000"
                    value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    maxLength={4}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { onOpenChange(false); resetForm(); }}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!canConfirm || loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : "Confirmar troca"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
