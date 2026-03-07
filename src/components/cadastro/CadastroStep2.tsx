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

  const [boletoData, setBoletoData] = useState<{ url: string; linhaDigitavel: string; paymentId: string } | null>(null);
  const [boletoLoading, setBoletoLoading] = useState(false);
  const [boletoCopied, setBoletoCopied] = useState(false);

  useEffect(() => {
    updateData({ formaPagamento: activeTab });
  }, [activeTab]);

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

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
        body: {
          email: data.email.trim(),
          password: data.senha,
          nome_agencia: data.nomeAgencia.trim(),
          nome_admin: data.nomeAdmin.trim(),
          telefone: data.telefone.trim(),
          cnpj: data.cnpj.trim(),
          cep: data.cep.replace(/\D/g, ""),
          plano: data.plano,
          forma_pagamento: activeTab,
          ...extra,
        },
      });

      if (res.error || res.data?.error) {
        const msg = res.data?.code
          ? formatError(res.data.code)
          : res.data?.error || formatError("SYS001");
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
    if (!cardNumber || !cardName || !cardExpiry || !cardCvv) {
      toast({ title: "Preencha todos os dados do cartão", variant: "destructive" });
      return;
    }
    const [expiryMonth, expiryYear] = cardExpiry.split("/");
    if (!expiryMonth || !expiryYear || expiryYear.length < 2) {
      toast({ title: "Validade inválida", variant: "destructive" });
      return;
    }

    const result = await handleSignupAndPay("CREDIT_CARD", {
      creditCard: {
        holderName: cardName,
        number: cardNumber.replace(/\s/g, ""),
        expiryMonth,
        expiryYear: expiryYear.length === 2 ? "20" + expiryYear : expiryYear,
        ccv: cardCvv,
      },
    });

    if (result) {
      onComplete({ formaPagamento: "cartao", email: data.email.trim().toLowerCase(), invoiceUrl: result.invoiceUrl });
    }
    setLoading(false);
  };

  const handleGeneratePix = async () => {
    setPixLoading(true);
    const result = await handleSignupAndPay("PIX");
    if (result) {
      if (result.pixQrCode && result.pixPayload) {
        setPixData({ qrCode: result.pixQrCode, payload: result.pixPayload, paymentId: result.paymentId });
        if (result.paymentId) {
          pollingRef.current = setInterval(async () => {
            try {
              const check = await supabase.functions.invoke("asaas-verificar-pagamento", {
                body: { payment_id: result.paymentId },
              });
              if (check.data?.status === "RECEIVED" || check.data?.status === "CONFIRMED") {
                if (pollingRef.current) clearInterval(pollingRef.current);
                onComplete({ formaPagamento: "pix", email: data.email.trim().toLowerCase() });
              }
            } catch { /* ignore */ }
          }, 5000);
        }
      } else {
        onComplete({ formaPagamento: "pix", email: data.email.trim().toLowerCase(), invoiceUrl: result.invoiceUrl });
      }
    }
    setPixLoading(false);
    setLoading(false);
  };

  const handleGenerateBoleto = async () => {
    setBoletoLoading(true);
    const result = await handleSignupAndPay("BOLETO");
    if (result) {
      if (result.boletoUrl) {
        setBoletoData({ url: result.boletoUrl, linhaDigitavel: result.boletoLinhaDigitavel || "", paymentId: result.paymentId });
      } else {
        onComplete({ formaPagamento: "boleto", email: data.email.trim().toLowerCase(), boletoUrl: result.boletoUrl, boletoLinhaDigitavel: result.boletoLinhaDigitavel });
      }
    }
    setBoletoLoading(false);
    setLoading(false);
  };

  const handleFinishBoleto = () => {
    onComplete({ formaPagamento: "boleto", email: data.email.trim().toLowerCase(), boletoUrl: boletoData?.url, boletoLinhaDigitavel: boletoData?.linhaDigitavel });
  };

  const copyToClipboard = (text: string, setCopied: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const brand = detectCardBrand(cardNumber);

  const tabs = [
    { key: "cartao" as const, label: "Cartão", icon: CreditCard },
    { key: "pix" as const, label: "PIX", icon: Zap },
    { key: "boleto" as const, label: "Boleto", icon: FileText },
  ];

  const selectedPlan = planos.find((p) => p.value === data.plano);

  return (
    <div className="min-h-screen flex">
      {/* Left panel — summary (desktop only) */}
      <div
        className="hidden md:flex md:w-[45%] relative overflow-hidden items-center justify-center"
        style={{ background: "linear-gradient(135deg, #0F172A 0%, #1E3A8A 40%, #2563EB 70%, #06B6D4 100%)" }}
      >
        <div className="absolute -top-[100px] -right-[100px] w-[400px] h-[400px] rounded-full" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }} />
        <div className="absolute top-[30%] -left-[80px] w-[250px] h-[250px] rounded-full" style={{ background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.15)" }} />

        <div className="relative z-10 max-w-sm px-6 w-full">
          <h1 className="text-[28px] font-bold text-white tracking-tight">
            Via<span className="font-extrabold">Hub</span>
          </h1>
          <p className="text-white/70 text-sm mt-1">O ecossistema da sua agência</p>
          <p className="text-white/40 text-[10px] mt-1">powered by <span className="font-semibold">Maralto</span></p>

          {/* Order summary */}
          <div className="mt-8 bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 p-4">
            <h3 className="font-bold text-white text-xs mb-3">Resumo do pedido</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-white/60">Plano</span>
                <span className="text-white font-medium capitalize">{selectedPlan?.label}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Cobrança</span>
                <span className="text-white font-medium">Mensal</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Vencimento</span>
                <span className="text-white font-medium">Hoje</span>
              </div>
              <div className="border-t border-white/10 pt-2 flex justify-between">
                <span className="text-white font-bold text-sm">Total</span>
                <span className="text-white font-bold text-base">{precoMap[data.plano]}<span className="text-[10px] font-normal text-white/60">/mês</span></span>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-white/40 text-[10px]">
              <Lock className="h-3 w-3" />
              <span>Ambiente seguro SSL • Visa • Master • PIX • Boleto</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div
        className="w-full md:w-[55%] flex items-start md:items-center justify-center p-4 md:p-6 min-h-screen overflow-y-auto md:overflow-hidden"
        style={{ background: "rgba(255,255,255,0.95)" }}
      >
        <div className="md:hidden fixed inset-0 -z-10" style={{ background: "linear-gradient(135deg, #0F172A 0%, #1E3A8A 50%, #2563EB 100%)" }} />
        <div className="w-full max-w-lg md:bg-transparent md:shadow-none md:rounded-none md:p-0 bg-white/95 rounded-3xl p-5 shadow-[0_20px_60px_rgba(0,0,0,0.15)]">
          <div className="animate-fade-in">
            {/* Mobile logo */}
            <div className="md:hidden text-center mb-3">
              <h1 className="text-2xl font-bold text-[#0F172A]">Via<span className="font-extrabold">Hub</span></h1>
            </div>

            {/* Progress */}
            <div className="flex items-center gap-2 mb-3">
              {["Dados", "Plano", "Confirmação"].map((label, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold ${
                      i <= 1 ? "bg-[#1E3A5F] text-white" : "bg-[#E2E8F0] text-[#94A3B8]"
                    }`}>
                      {i < 1 ? <Check className="h-2.5 w-2.5" /> : i + 1}
                    </div>
                    <span className={`text-[10px] ${i <= 1 ? "text-[#1E3A5F] font-medium" : "text-[#94A3B8]"}`}>{label}</span>
                  </div>
                  {i < 2 && <div className={`w-6 h-px ${i < 1 ? "bg-[#1E3A5F]" : "bg-[#E2E8F0]"}`} />}
                </div>
              ))}
            </div>

            <div className="mb-3">
              <h2 className="text-xl font-bold text-[#0F172A]">Escolha seu plano</h2>
            </div>

            {/* Plans — compact */}
            <div className="space-y-1.5 mb-3">
              {planos.map((p) => {
                const selected = data.plano === p.value;
                return (
                  <button
                    key={p.value}
                    onClick={() => updateData({ plano: p.value })}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border-2 transition-all text-left ${
                      selected
                        ? "border-[#2563EB] bg-blue-50/50"
                        : "border-[#E2E8F0] bg-white hover:border-[#94A3B8]"
                    }`}
                  >
                    <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      selected ? "border-[#2563EB]" : "border-[#CBD5E1]"
                    }`}>
                      {selected && <div className="w-1.5 h-1.5 rounded-full bg-[#2563EB]" />}
                    </div>
                    <div className="flex-1 flex items-center gap-1.5 min-w-0">
                      <span className="font-semibold text-sm text-[#0F172A]">{p.label}</span>
                      {p.popular && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">Popular</span>
                      )}
                      <span className="text-[11px] text-[#94A3B8]">• {p.resumo}</span>
                    </div>
                    <span className="text-sm font-bold text-[#1E3A5F] shrink-0">{p.preco}<span className="text-[9px] font-normal text-[#94A3B8]">/mês</span></span>
                  </button>
                );
              })}
            </div>

            {/* Mobile order summary */}
            <div className="md:hidden bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] px-3 py-2 mb-3">
              <div className="flex justify-between text-sm">
                <span className="text-[#64748B]">Total mensal</span>
                <span className="font-bold text-[#1E3A5F]">{precoMap[data.plano]}</span>
              </div>
            </div>

            {/* Payment tabs */}
            <h3 className="text-xs font-semibold text-[#0F172A] mb-2">Forma de pagamento</h3>
            <div className="flex border-b border-[#E2E8F0] mb-3">
              {tabs.map((t) => {
                const Icon = t.icon;
                const active = activeTab === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => setActiveTab(t.key)}
                    className={`flex items-center gap-1 px-3 py-2 text-xs font-medium border-b-2 transition-all ${
                      active ? "border-[#2563EB] text-[#2563EB]" : "border-transparent text-[#94A3B8] hover:text-[#64748B]"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {t.label}
                  </button>
                );
              })}
            </div>

            {/* Tab content */}
            {activeTab === "cartao" && (
              <div className="space-y-2">
                <div className="bg-[#F8FAFC] rounded-lg p-3 space-y-2 border border-[#E2E8F0]">
                  <div className="space-y-0.5">
                    <Label className="text-[10px] font-medium text-[#64748B]">Número do cartão</Label>
                    <div className="relative">
                      <Input
                        placeholder="0000 0000 0000 0000"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(maskCardNumber(e.target.value))}
                        className="h-9 text-sm pr-16 bg-white"
                        maxLength={19}
                      />
                      {brand && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[#2563EB] bg-blue-50 px-1.5 py-0.5 rounded">{brand}</span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <Label className="text-[10px] font-medium text-[#64748B]">Nome no cartão</Label>
                    <Input placeholder="NOME COMO NO CARTÃO" value={cardName} onChange={(e) => setCardName(e.target.value.toUpperCase())} className="h-9 text-sm bg-white" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-0.5">
                      <Label className="text-[10px] font-medium text-[#64748B]">Validade</Label>
                      <Input placeholder="MM/AA" value={cardExpiry} onChange={(e) => setCardExpiry(maskCardExpiry(e.target.value))} className="h-9 text-sm bg-white" maxLength={5} />
                    </div>
                    <div className="space-y-0.5">
                      <Label className="text-[10px] font-medium text-[#64748B]">CVV</Label>
                      <Input placeholder="000" value={cardCvv} onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4))} className="h-9 text-sm bg-white" maxLength={4} />
                    </div>
                  </div>
                </div>
                <Button
                  onClick={handleCardPayment}
                  disabled={loading || !cardNumber || !cardName || !cardExpiry || !cardCvv}
                  className="w-full h-10 rounded-xl font-semibold text-sm text-white shadow-md disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #2563EB, #06B6D4)" }}
                >
                  {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Processando...</> : <><Lock className="h-3.5 w-3.5 mr-1.5" />Finalizar cadastro</>}
                </Button>
              </div>
            )}

            {activeTab === "pix" && (
              <div>
                {!pixData ? (
                  <div className="text-center py-3">
                    <div className="w-10 h-10 rounded-xl bg-[#F0FDF4] flex items-center justify-center mx-auto mb-2">
                      <Zap className="h-5 w-5 text-green-600" />
                    </div>
                    <p className="text-xs text-[#64748B] mb-3">Gere o QR Code e pague pelo app do banco.</p>
                    <Button
                      onClick={handleGeneratePix}
                      disabled={pixLoading || loading}
                      className="w-full h-10 rounded-xl font-semibold text-sm text-white shadow-md"
                      style={{ background: "linear-gradient(135deg, #2563EB, #06B6D4)" }}
                    >
                      {pixLoading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Gerando...</> : "Gerar QR Code PIX"}
                    </Button>
                  </div>
                ) : (
                  <div className="text-center space-y-2">
                    <div className="inline-block p-2 bg-white rounded-xl border border-[#E2E8F0] shadow-sm">
                      <img src={`data:image/png;base64,${pixData.qrCode}`} alt="QR Code PIX" className="w-[140px] h-[140px]" />
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-[#64748B] mb-1">Copia e cola:</p>
                      <div className="flex items-center gap-1.5 bg-[#F8FAFC] rounded-lg px-3 py-2 border border-[#E2E8F0]">
                        <span className="text-[10px] text-[#0F172A] font-mono truncate flex-1">{pixData.payload}</span>
                        <button onClick={() => copyToClipboard(pixData.payload, setPixCopied)} className="shrink-0 px-2 py-0.5 rounded bg-[#2563EB] text-white text-[10px] font-medium hover:bg-[#1D4ED8]">
                          {pixCopied ? <Check className="h-3 w-3" /> : "Copiar"}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 justify-center py-1">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-[#2563EB]" />
                      <span className="text-xs text-[#64748B]">Aguardando pagamento...</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "boleto" && (
              <div>
                {!boletoData ? (
                  <div className="text-center py-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mx-auto mb-2">
                      <FileText className="h-5 w-5 text-[#1E3A5F]" />
                    </div>
                    <div className="flex items-center gap-1.5 justify-center mb-3 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 mx-auto w-fit">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                      <span className="text-[10px] text-amber-700">Ativação após compensação (1-3 dias úteis)</span>
                    </div>
                    <Button
                      onClick={handleGenerateBoleto}
                      disabled={boletoLoading || loading}
                      className="w-full h-10 rounded-xl font-semibold text-sm text-white shadow-md"
                      style={{ background: "linear-gradient(135deg, #2563EB, #06B6D4)" }}
                    >
                      {boletoLoading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Gerando...</> : "Gerar boleto"}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-center">
                      <div className="w-9 h-9 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-1">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      </div>
                      <p className="text-sm font-semibold text-[#0F172A]">Boleto gerado!</p>
                    </div>
                    <a href={boletoData.url} target="_blank" rel="noopener noreferrer">
                      <Button className="w-full h-9 rounded-lg font-semibold text-white text-xs shadow-md" style={{ background: "linear-gradient(135deg, #2563EB, #06B6D4)" }}>
                        <Download className="h-3.5 w-3.5 mr-1.5" />
                        Baixar boleto PDF
                      </Button>
                    </a>
                    {boletoData.linhaDigitavel && (
                      <div className="flex items-center gap-1.5 bg-[#F8FAFC] rounded-lg px-3 py-2 border border-[#E2E8F0]">
                        <span className="text-[10px] text-[#0F172A] font-mono truncate flex-1">{boletoData.linhaDigitavel}</span>
                        <button onClick={() => copyToClipboard(boletoData.linhaDigitavel, setBoletoCopied)} className="shrink-0 px-2 py-0.5 rounded bg-[#2563EB] text-white text-[10px] font-medium hover:bg-[#1D4ED8]">
                          {boletoCopied ? <Check className="h-3 w-3" /> : "Copiar"}
                        </button>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                      <span className="text-[10px] text-amber-700">Ativação após compensação (1-3 dias úteis)</span>
                    </div>
                    <Button onClick={handleFinishBoleto} variant="outline" className="w-full h-9 rounded-lg text-xs font-medium">
                      Continuar →
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Back */}
            <button onClick={onBack} className="flex items-center gap-1 text-xs text-[#64748B] hover:text-[#0F172A] mt-3 transition-colors">
              <ArrowLeft className="h-3.5 w-3.5" /> Voltar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
