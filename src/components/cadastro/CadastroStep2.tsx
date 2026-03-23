import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, CreditCard, Zap, FileText, AlertTriangle, Copy, Check, ArrowLeft, Loader2, Lock, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { CadastroData, PaymentResult } from "@/pages/Cadastro";
import { formatError, formatEdgeFunctionError } from "@/lib/errors";
import { maskCardNumber, maskCardExpiry } from "@/lib/masks";

const planos = [
  { value: "starter", label: "Starter", preco: "R$ 397", resumo: "3 usuários" },
  { value: "pro", label: "Pro", preco: "R$ 697", popular: true, resumo: "10 usuários" },
  { value: "elite", label: "Elite", preco: "R$ 1.997", resumo: "Ilimitados" },
];

const precoMap: Record<string, string> = { starter: "R$ 397,00", pro: "R$ 697,00", elite: "R$ 1.997,00" };

const STEPS = ["Dados", "Plano", "Confirmação"];

function Stepper({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-2 mb-6 max-w-md mx-auto">
      {STEPS.map((label, i) => (
        <div key={i} className="flex items-center gap-2 flex-1">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              i < current ? "bg-secondary text-white" : i === current ? "bg-primary text-white ring-4 ring-primary/15" : "bg-surface-container-high text-on-surface-variant"
            }`}>
              {i < current ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </div>
            <span className={`text-xs font-medium font-label ${i <= current ? "text-on-surface" : "text-on-surface-variant"}`}>{label}</span>
          </div>
          {i < STEPS.length - 1 && <div className={`flex-1 h-px ${i < current ? "bg-primary" : "bg-outline-variant/20"}`} />}
        </div>
      ))}
    </div>
  );
}

type Props = {
  data: CadastroData;
  updateData: (d: Partial<CadastroData>) => void;
  onBack: () => void;
  onComplete: (result: PaymentResult) => void;
};

export default function CadastroStep2({ data, updateData, onBack, onComplete }: Props) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"cartao" | "pix" | "boleto">("cartao");
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [pixData, setPixData] = useState<{ qrCode: string; payload: string; paymentId: string } | null>(null);
  const [pixLoading, setPixLoading] = useState(false);
  const [pixCopied, setPixCopied] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollingStartRef = useRef<number>(Date.now());
  const POLLING_TIMEOUT = 30 * 60 * 1000;
  const [boletoData, setBoletoData] = useState<{ url: string; linhaDigitavel: string; paymentId: string } | null>(null);
  const [boletoLoading, setBoletoLoading] = useState(false);
  const [boletoCopied, setBoletoCopied] = useState(false);

  useEffect(() => { updateData({ formaPagamento: activeTab }); }, [activeTab]);
  useEffect(() => { return () => { if (pollingRef.current) clearInterval(pollingRef.current); }; }, []);

  const detectCardBrand = (num: string) => {
    const d = num.replace(/\D/g, "");
    if (d.startsWith("4")) return "Visa";
    if (/^5[1-5]/.test(d) || /^2[2-7]/.test(d)) return "Master";
    if (/^3[47]/.test(d)) return "Amex";
    if (/^6(?:011|5)/.test(d)) return "Discover";
    return "";
  };

  const handleSignupAndPay = async (billingType: string, extra: Record<string, unknown> = {}) => {
    setLoading(true);
    try {
      const res = await supabase.functions.invoke("signup-agencia", {
        body: { email: data.email.trim(), password: data.senha, nome_agencia: data.nomeAgencia.trim(), nome_admin: data.nomeAdmin.trim(), telefone: data.telefone.trim(), cnpj: data.cnpj.trim(), cep: data.cep.replace(/\D/g, ""), plano: data.plano, forma_pagamento: activeTab, ...extra },
      });
      if (res.error || res.data?.error) {
        const msg = res.data?.code ? formatError(res.data.code) : res.data?.error || formatError("SYS001");
        toast({ title: "Erro", description: msg, variant: "destructive" });
        setLoading(false);
        return null;
      }
      return res.data;
    } catch {
      toast({ title: "Erro", description: formatError("SYS001"), variant: "destructive" });
      setLoading(false);
      return null;
    }
  };

  const handleCardPayment = async () => {
    if (!cardNumber || !cardName || !cardExpiry || !cardCvv) { toast({ title: "Preencha todos os dados do cartão", variant: "destructive" }); return; }
    const [expiryMonth, expiryYear] = cardExpiry.split("/");
    if (!expiryMonth || !expiryYear || expiryYear.length < 2) { toast({ title: "Validade inválida", variant: "destructive" }); return; }
    const result = await handleSignupAndPay("CREDIT_CARD", { creditCard: { holderName: cardName, number: cardNumber.replace(/\s/g, ""), expiryMonth, expiryYear: expiryYear.length === 2 ? "20" + expiryYear : expiryYear, ccv: cardCvv } });
    if (result) onComplete({ formaPagamento: "cartao", email: data.email.trim().toLowerCase(), invoiceUrl: result.invoiceUrl });
    setLoading(false);
  };

  const handleGeneratePix = async () => {
    setPixLoading(true);
    const result = await handleSignupAndPay("PIX");
    if (result) {
      if (result.pixQrCode && result.pixPayload) {
        setPixData({ qrCode: result.pixQrCode, payload: result.pixPayload, paymentId: result.paymentId });
        if (result.paymentId) {
          pollingStartRef.current = Date.now();
          pollingRef.current = setInterval(async () => {
            if (Date.now() - pollingStartRef.current > POLLING_TIMEOUT) { if (pollingRef.current) clearInterval(pollingRef.current); toast({ title: "QR Code expirado", description: "Gere um novo QR Code para continuar.", variant: "destructive" }); setPixData(null); return; }
            try { const check = await supabase.functions.invoke("asaas-verificar-pagamento", { body: { payment_id: result.paymentId } }); if (check.data?.status === "RECEIVED" || check.data?.status === "CONFIRMED") { if (pollingRef.current) clearInterval(pollingRef.current); onComplete({ formaPagamento: "pix", email: data.email.trim().toLowerCase() }); } } catch {}
          }, 5000);
        }
      } else { onComplete({ formaPagamento: "pix", email: data.email.trim().toLowerCase(), invoiceUrl: result.invoiceUrl }); }
    }
    setPixLoading(false);
    setLoading(false);
  };

  const handleGenerateBoleto = async () => {
    setBoletoLoading(true);
    const result = await handleSignupAndPay("BOLETO");
    if (result) {
      if (result.boletoUrl) { setBoletoData({ url: result.boletoUrl, linhaDigitavel: result.boletoLinhaDigitavel || "", paymentId: result.paymentId }); }
      else { onComplete({ formaPagamento: "boleto", email: data.email.trim().toLowerCase(), boletoUrl: result.boletoUrl, boletoLinhaDigitavel: result.boletoLinhaDigitavel }); }
    }
    setBoletoLoading(false);
    setLoading(false);
  };

  const handleFinishBoleto = () => { onComplete({ formaPagamento: "boleto", email: data.email.trim().toLowerCase(), boletoUrl: boletoData?.url, boletoLinhaDigitavel: boletoData?.linhaDigitavel }); };

  const copyToClipboard = (text: string, setCopied: (v: boolean) => void) => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const brand = detectCardBrand(cardNumber);
  const tabs = [
    { key: "cartao" as const, label: "Cartão", icon: CreditCard },
    { key: "pix" as const, label: "PIX", icon: Zap },
    { key: "boleto" as const, label: "Boleto", icon: FileText },
  ];
  const selectedPlan = planos.find((p) => p.value === data.plano);

  return (
    <div className="min-h-screen bg-surface grid lg:grid-cols-[420px_1fr]">
      {/* Left branding */}
      <div className="hidden lg:flex flex-col bg-gradient-to-b from-[#0037b0] to-[#0a0e2e] p-12 text-white sticky top-0 h-screen justify-between">
        <div>
          <div className="flex items-center gap-2.5 mb-10">
            <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
              <span className="text-sm font-bold text-white">VH</span>
            </div>
            <span className="text-xl font-bold font-display tracking-tight">ViaHub</span>
          </div>
          <p className="text-white/60 text-sm font-body">O ecossistema da sua agência</p>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
          <h3 className="font-bold text-white text-sm mb-4">Resumo do pedido</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-white/60">Plano</span><span className="text-white font-medium capitalize">{selectedPlan?.label}</span></div>
            <div className="flex justify-between"><span className="text-white/60">Cobrança</span><span className="text-white font-medium">Mensal</span></div>
            <div className="border-t border-white/10 pt-3 flex justify-between">
              <span className="text-white font-bold">Total</span>
              <span className="text-white font-bold text-lg">{precoMap[data.plano]}<span className="text-sm font-normal text-white/60">/mês</span></span>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-white/40 text-xs">
            <Lock className="h-3.5 w-3.5" />
            <span>Ambiente seguro SSL</span>
          </div>
        </div>

        <p className="text-white/30 text-xs font-label">© {new Date().getFullYear()} ViaHub · powered by Maralto</p>
      </div>

      {/* Right form */}
      <div className="overflow-y-auto flex items-start justify-center px-6 py-12 lg:py-6">
        <div className="max-w-xl w-full mx-auto">
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary-container shadow-md shadow-primary/30 flex items-center justify-center">
              <span className="text-sm font-bold text-white">VH</span>
            </div>
            <span className="text-xl font-bold font-display tracking-tight text-on-surface">ViaHub</span>
          </div>

          <Stepper current={1} />

          <div className="bg-surface-container-lowest rounded-2xl p-7 lg:p-6 shadow-[0_8px_24px_0_rgba(13,28,45,0.08)] border border-outline-variant/15">
            <h2 className="text-2xl font-bold font-display tracking-tight text-on-surface mb-1">Escolha seu plano</h2>
            <p className="text-sm text-on-surface-variant font-body mb-6 lg:mb-4">Selecione o plano ideal para sua agência</p>

            {/* Plans */}
            <div className="space-y-2 mb-6 lg:mb-4">
              {planos.map((p) => {
                const selected = data.plano === p.value;
                return (
                  <button key={p.value} onClick={() => updateData({ plano: p.value })} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left ${selected ? "border-primary bg-primary/5" : "border-outline-variant/20 bg-surface-container-lowest hover:border-outline-variant/40"}`}>
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${selected ? "border-primary" : "border-outline-variant"}`}>
                      {selected && <div className="w-2 h-2 rounded-full bg-primary" />}
                    </div>
                    <div className="flex-1 flex items-center gap-2 min-w-0">
                      <span className="font-semibold text-sm text-on-surface">{p.label}</span>
                      {p.popular && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#ff9800]/10 text-[#e65100]">Popular</span>}
                      <span className="text-[11px] text-on-surface-variant">• {p.resumo}</span>
                    </div>
                    <span className="text-sm font-bold text-on-surface shrink-0">{p.preco}<span className="text-[9px] font-normal text-on-surface-variant">/mês</span></span>
                  </button>
                );
              })}
            </div>

            {/* Mobile summary */}
            <div className="lg:hidden bg-surface-container-low rounded-xl px-4 py-3 mb-6 border border-outline-variant/15">
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">Total mensal</span>
                <span className="font-bold text-on-surface">{precoMap[data.plano]}</span>
              </div>
            </div>

            {/* Payment tabs */}
            <h3 className="text-xs font-semibold font-label text-on-surface uppercase tracking-wide mb-3">Forma de pagamento</h3>
            <div className="flex bg-surface-container-low rounded-xl p-1 mb-6 gap-1">
              {tabs.map((t) => {
                const Icon = t.icon;
                const active = activeTab === t.key;
                return (
                  <button key={t.key} onClick={() => setActiveTab(t.key)} className={`flex items-center justify-center gap-1.5 flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${active ? "bg-surface-container-lowest shadow-sm text-primary font-semibold" : "text-on-surface-variant hover:bg-surface-container-high"}`}>
                    <Icon className="h-3.5 w-3.5" />
                    {t.label}
                  </button>
                );
              })}
            </div>

            {/* Card */}
            {activeTab === "cartao" && (
              <div className="space-y-4">
                <div className="bg-surface-container-low rounded-xl p-4 space-y-3 border border-outline-variant/10">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium font-label text-on-surface-variant">Número do cartão</Label>
                    <div className="relative">
                      <Input placeholder="0000 0000 0000 0000" value={cardNumber} onChange={(e) => setCardNumber(maskCardNumber(e.target.value))} className="pr-16" maxLength={19} />
                      {brand && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-primary bg-primary/8 px-1.5 py-0.5 rounded">{brand}</span>}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium font-label text-on-surface-variant">Nome no cartão</Label>
                    <Input placeholder="NOME COMO NO CARTÃO" value={cardName} onChange={(e) => setCardName(e.target.value.toUpperCase())} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium font-label text-on-surface-variant">Validade</Label>
                      <Input placeholder="MM/AA" value={cardExpiry} onChange={(e) => setCardExpiry(maskCardExpiry(e.target.value))} maxLength={5} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium font-label text-on-surface-variant">CVV</Label>
                      <Input placeholder="000" value={cardCvv} onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4))} maxLength={4} />
                    </div>
                  </div>
                </div>
                <Button onClick={handleCardPayment} disabled={loading || !cardNumber || !cardName || !cardExpiry || !cardCvv} className="w-full">
                  {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Processando...</> : <><Lock className="h-3.5 w-3.5 mr-1.5" />Finalizar cadastro</>}
                </Button>
              </div>
            )}

            {/* PIX */}
            {activeTab === "pix" && (
              <div>
                {!pixData ? (
                  <div className="text-center py-4">
                    <div className="w-12 h-12 rounded-xl bg-secondary-container/50 flex items-center justify-center mx-auto mb-3">
                      <Zap className="h-6 w-6 text-secondary" />
                    </div>
                    <p className="text-sm text-on-surface-variant font-body mb-4">Gere o QR Code e pague pelo app do banco.</p>
                    <Button onClick={handleGeneratePix} disabled={pixLoading || loading} className="w-full">
                      {pixLoading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Gerando...</> : "Gerar QR Code PIX"}
                    </Button>
                  </div>
                ) : (
                  <div className="text-center space-y-4">
                    <div className="inline-block bg-white p-4 rounded-xl border border-outline-variant/15">
                      <img src={`data:image/png;base64,${pixData.qrCode}`} alt="QR Code PIX" className="w-[160px] h-[160px]" />
                    </div>
                    <div>
                      <p className="text-xs font-medium font-label text-on-surface-variant mb-2">Copia e cola:</p>
                      <div className="flex items-center gap-2 bg-surface-container-low rounded-xl px-4 py-3 border-b-2 border-primary">
                        <span className="text-xs text-on-surface font-mono truncate flex-1">{pixData.payload}</span>
                        <button onClick={() => copyToClipboard(pixData.payload, setPixCopied)} className="shrink-0 px-3 py-1 rounded-lg bg-primary text-white text-xs font-medium hover:brightness-110 transition-all">
                          {pixCopied ? <Check className="h-3.5 w-3.5" /> : "Copiar"}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 justify-center py-2">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <span className="text-sm text-on-surface-variant font-body">Aguardando pagamento...</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Boleto */}
            {activeTab === "boleto" && (
              <div>
                {!boletoData ? (
                  <div className="text-center py-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/8 flex items-center justify-center mx-auto mb-3">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex items-center gap-2 justify-center mb-4 px-3 py-2 rounded-xl bg-[#ff9800]/8 border border-[#ff9800]/20 mx-auto w-fit">
                      <AlertTriangle className="h-3.5 w-3.5 text-[#e65100] shrink-0" />
                      <span className="text-xs text-[#e65100]">Ativação após compensação (1-3 dias úteis)</span>
                    </div>
                    <Button onClick={handleGenerateBoleto} disabled={boletoLoading || loading} className="w-full">
                      {boletoLoading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Gerando...</> : "Gerar boleto"}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-center">
                      <div className="w-10 h-10 rounded-full bg-secondary-container/50 flex items-center justify-center mx-auto mb-2">
                        <CheckCircle className="h-5 w-5 text-secondary" />
                      </div>
                      <p className="text-sm font-semibold text-on-surface">Boleto gerado!</p>
                    </div>
                    <a href={boletoData.url} target="_blank" rel="noopener noreferrer">
                      <Button className="w-full">
                        <Download className="h-3.5 w-3.5 mr-1.5" />
                        Baixar boleto PDF
                      </Button>
                    </a>
                    {boletoData.linhaDigitavel && (
                      <div className="flex items-center gap-2 bg-surface-container-low rounded-xl px-4 py-3 border-b-2 border-primary">
                        <span className="text-xs text-on-surface font-mono truncate flex-1">{boletoData.linhaDigitavel}</span>
                        <button onClick={() => copyToClipboard(boletoData.linhaDigitavel, setBoletoCopied)} className="shrink-0 px-3 py-1 rounded-lg bg-primary text-white text-xs font-medium hover:brightness-110 transition-all">
                          {boletoCopied ? <Check className="h-3.5 w-3.5" /> : "Copiar"}
                        </button>
                      </div>
                    )}
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#ff9800]/8 border border-[#ff9800]/20">
                      <AlertTriangle className="h-3.5 w-3.5 text-[#e65100] shrink-0" />
                      <span className="text-xs text-[#e65100]">Ativação após compensação (1-3 dias úteis)</span>
                    </div>
                    <Button onClick={handleFinishBoleto} variant="outline" className="w-full">Continuar →</Button>
                  </div>
                )}
              </div>
            )}

            <button onClick={onBack} className="flex items-center gap-1 text-xs text-on-surface-variant hover:text-on-surface mt-4 transition-colors font-medium">
              <ArrowLeft className="h-3.5 w-3.5" /> Voltar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
