import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, Zap, FileText, AlertTriangle } from "lucide-react";
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

export default function MetodoPagamentoModal({ open, onOpenChange, agenciaId, metodoAtual }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Metodo | null>(null);
  const [loading, setLoading] = useState(false);

  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");

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
        toast({ title: "Método de pagamento atualizado!" });
        queryClient.invalidateQueries({ queryKey: ["ultimo-pagamento-forma"] });
        onOpenChange(false);
        resetForm();
      }
    } catch {
      toast({ title: "Erro inesperado", variant: "destructive" });
    }
    setLoading(false);
  };

  const resetForm = () => {
    setSelected(null);
    setCardNumber("");
    setCardName("");
    setCardExpiry("");
    setCardCvv("");
  };

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
            {loading ? "Processando..." : "Confirmar troca"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
