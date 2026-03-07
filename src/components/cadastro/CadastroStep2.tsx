import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, CreditCard, Zap, FileText, AlertTriangle, Copy, Check, ArrowLeft, Loader2, Lock, ShieldCheck, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { CadastroData, PaymentResult } from "@/pages/Cadastro";
import AuthLayout from "@/components/AuthLayout";

const planos = [
  { value: "starter", label: "Starter", preco: "R$ 397", resumo: "3 usuários • Suporte por email" },
  { value: "pro", label: "Pro", preco: "R$ 697", popular: true, resumo: "10 usuários • Suporte prioritário • Relatórios" },
  { value: "elite", label: "Elite", preco: "R$ 1.997", resumo: "Ilimitados • Suporte dedicado • Tudo incluso" },
];

const precoMap: Record<string, string> = { starter: "R$ 397,00", pro: "R$ 697,00", elite: "R$ 1.997,00" };

const maskCardNumber = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 16);
  return d.replace(/(\d{4})(?=\d)/g, "$1 ");
};

const maskExpiry = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 4);
  if (d.length >= 3) return d.slice(0, 2) + "/" + d.slice(2);
  return d;
};

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
          plano: data.plano,
          forma_pagamento: activeTab,
          ...extra,
        },
      });

      if (res.error || res.data?.error) {
        const msg = res.data?.error || res.error?.message || "Erro ao criar conta";
        toast({ title: "Erro", description: msg, variant: "destructive" });
        setLoading(false);
        return null;
      }
      return res.data;
    } catch {
      toast({ title: "Erro", description: "Erro inesperado. Tente novamente.", variant: "destructive" });
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
      {/* Left column — hidden on mobile */}
      <div
        className="hidden md:flex md:w-[60%] relative overflow-hidden items-center justify-center"
        style={{ background: "linear-gradient(135deg, #0F172A 0%, #1E3A8A 40%, #2563EB 70%, #06B6D4 100%)" }}
      >
        <div className="absolute -top-[100px] -right-[100px] w-[400px] h-[400px] rounded-full" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }} />
        <div className="absolute top-[30%] -left-[80px] w-[250px] h-[250px] rounded-full" style={{ background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.15)" }} />
        <div className="absolute -bottom-[40px] right-[20%] w-[180px] h-[180px] rounded-full" style={{ background: "rgba(255,255,255,0.04)" }} />

        <div className="relative z-10 max-w-lg px-8 w-full">
          <h1 className="text-[32px] font-bold text-white tracking-tight">
            Via<span className="font-extrabold">Hub</span>
          </h1>
          <p className="text-white/70 text-base mt-2">O ecossistema da sua agência</p>
          <p className="text-white/40 text-xs mt-2">powered by <span className="font-semibold">Maralto</span></p>

          {/* Order summary inside left panel on desktop */}
          <div className="mt-10 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
            <h3 className="font-bold text-white text-sm mb-4">Resumo do pedido</h3>
            <div className="space-y-3 text-sm">
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
              <div className="border-t border-white/10 pt-3 flex justify-between">
                <span className="text-white font-bold">Total</span>
                <span className="text-white font-bold text-lg">{precoMap[data.plano]}<span className="text-sm font-normal text-white/60">/mês</span></span>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-white/40 text-xs">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Ambiente seguro SSL</span>
            </div>
            <div className="mt-2 flex items-center gap-3 text-white/30 text-[10px]">
              <span>Visa</span>
              <span>Master</span>
              <span>Elo</span>
              <span>PIX</span>
              <span>Boleto</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right column */}
      <div
        className="w-full md:w-[40%] flex items-start md:items-center justify-center p-6 min-h-screen overflow-y-auto"
        style={{ background: "rgba(255,255,255,0.95)" }}
      >
        <div className="md:hidden fixed inset-0 -z-10" style={{ background: "linear-gradient(135deg, #0F172A 0%, #1E3A8A 50%, #2563EB 100%)" }} />
        <div className="w-full max-w-md md:bg-transparent md:shadow-none md:rounded-none md:p-0 bg-white/95 rounded-3xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.15)]">
          <div className="animate-fade-in">
            {/* Mobile logo */}
            <div className="md:hidden text-center mb-4">
              <h1 className="text-3xl font-bold text-[#0F172A]">Via<span className="font-extrabold">Hub</span></h1>
            </div>

            {/* Progress */}
            <div className="flex items-center gap-2 mb-5">
              {["Dados", "Plano", "Confirmação"].map((label, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                      i <= 1 ? "bg-[#1E3A5F] text-white" : "bg-[#E2E8F0] text-[#94A3B8]"
                    }`}>
                      {i < 1 ? <Check className="h-3 w-3" /> : i + 1}
                    </div>
                    <span className={`text-xs ${i <= 1 ? "text-[#1E3A5F] font-medium" : "text-[#94A3B8]"}`}>{label}</span>
                  </div>
                  {i < 2 && <div className={`w-8 h-px ${i < 1 ? "bg-[#1E3A5F]" : "bg-[#E2E8F0]"}`} />}
                </div>
              ))}
            </div>

            <div className="mb-4">
              <h2 className="text-2xl font-bold text-[#0F172A]">Escolha seu plano</h2>
              <p className="text-sm text-[#64748B] mt-1">Selecione o melhor plano para sua agência</p>
            </div>

            {/* Plans */}
            <div className="space-y-2 mb-5">
              {planos.map((p) => {
                const selected = data.plano === p.value;
                return (
                  <button
                    key={p.value}
                    onClick={() => updateData({ plano: p.value })}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left ${
                      selected
                        ? "border-[#2563EB] bg-blue-50/50 shadow-sm"
                        : "border-[#E2E8F0] bg-white hover:border-[#94A3B8]"
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      selected ? "border-[#2563EB]" : "border-[#CBD5E1]"
                    }`}>
                      {selected && <div className="w-2 h-2 rounded-full bg-[#2563EB]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-[#0F172A]">{p.label}</span>
                        {p.popular && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">Popular</span>
                        )}
                      </div>
                      <span className="text-xs text-[#64748B]">{p.resumo}</span>
                    </div>
                    <span className="text-sm font-bold text-[#1E3A5F] shrink-0">{p.preco}<span className="text-[10px] font-normal text-[#94A3B8]">/mês</span></span>
                  </button>
                );
              })}
            </div>

            {/* Mobile order summary */}
            <div className="md:hidden bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] p-4 mb-5">
              <div className="flex justify-between text-sm">
                <span className="text-[#64748B]">Total mensal</span>
                <span className="font-bold text-[#1E3A5F]">{precoMap[data.plano]}</span>
              </div>
            </div>

            {/* Payment tabs */}
            <h3 className="text-sm font-semibold text-[#0F172A] mb-3">Forma de pagamento</h3>
            <div className="flex border-b border-[#E2E8F0] mb-4">
              {tabs.map((t) => {
                const Icon = t.icon;
                const active = activeTab === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => setActiveTab(t.key)}
                    className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
                      active ? "border-[#2563EB] text-[#2563EB]" : "border-transparent text-[#94A3B8] hover:text-[#64748B]"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {t.label}
                  </button>
                );
              })}
            </div>

            {/* Tab content */}
            {activeTab === "cartao" && (
              <div className="space-y-3">
                <div className="bg-[#F8FAFC] rounded-xl p-4 space-y-3 border border-[#E2E8F0]">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-[#64748B]">Número do cartão</Label>
                    <div className="relative">
                      <Input
                        placeholder="0000 0000 0000 0000"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(maskCardNumber(e.target.value))}
                        className="h-10 text-sm pr-16 bg-white"
                        maxLength={19}
                      />
                      {brand && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-[#2563EB] bg-blue-50 px-2 py-0.5 rounded">{brand}</span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-[#64748B]">Nome no cartão</Label>
                    <Input placeholder="NOME COMO NO CARTÃO" value={cardName} onChange={(e) => setCardName(e.target.value.toUpperCase())} className="h-10 text-sm bg-white" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-[#64748B]">Validade</Label>
                      <Input placeholder="MM/AA" value={cardExpiry} onChange={(e) => setCardExpiry(maskExpiry(e.target.value))} className="h-10 text-sm bg-white" maxLength={5} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-[#64748B]">CVV</Label>
                      <Input placeholder="000" value={cardCvv} onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4))} className="h-10 text-sm bg-white" maxLength={4} />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-[#94A3B8] text-xs justify-center">
                  <Lock className="h-3 w-3" />
                  <span>Pagamento 100% seguro</span>
                </div>
                <Button
                  onClick={handleCardPayment}
                  disabled={loading || !cardNumber || !cardName || !cardExpiry || !cardCvv}
                  className="w-full h-12 rounded-xl font-semibold text-[15px] text-white shadow-[0_4px_16px_rgba(37,99,235,0.3)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.4)] hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #2563EB, #06B6D4)" }}
                >
                  {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Processando...</> : "Finalizar cadastro →"}
                </Button>
              </div>
            )}

            {activeTab === "pix" && (
              <div className="space-y-4">
                {!pixData ? (
                  <div className="text-center py-6">
                    <div className="w-14 h-14 rounded-2xl bg-[#F0FDF4] flex items-center justify-center mx-auto mb-3">
                      <Zap className="h-7 w-7 text-green-600" />
                    </div>
                    <p className="text-sm text-[#64748B] mb-4">Gere o QR Code e pague pelo app do banco.<br />Sua conta será ativada automaticamente.</p>
                    <Button
                      onClick={handleGeneratePix}
                      disabled={pixLoading || loading}
                      className="w-full h-12 rounded-xl font-semibold text-[15px] text-white shadow-[0_4px_16px_rgba(37,99,235,0.3)] transition-all duration-200"
                      style={{ background: "linear-gradient(135deg, #2563EB, #06B6D4)" }}
                    >
                      {pixLoading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Gerando...</> : "Gerar QR Code PIX"}
                    </Button>
                  </div>
                ) : (
                  <div className="text-center space-y-4">
                    <div className="inline-block p-3 bg-white rounded-2xl border border-[#E2E8F0] shadow-sm">
                      <img src={`data:image/png;base64,${pixData.qrCode}`} alt="QR Code PIX" className="w-44 h-44" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-[#64748B] mb-2">Copia e cola:</p>
                      <div className="flex items-center gap-2 bg-[#F8FAFC] rounded-xl px-4 py-2.5 border border-[#E2E8F0]">
                        <span className="text-xs text-[#0F172A] font-mono truncate flex-1">{pixData.payload}</span>
                        <button onClick={() => copyToClipboard(pixData.payload, setPixCopied)} className="shrink-0 px-3 py-1 rounded-lg bg-[#2563EB] text-white text-xs font-medium hover:bg-[#1D4ED8] transition-colors">
                          {pixCopied ? <Check className="h-3.5 w-3.5" /> : "Copiar"}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 justify-center py-2">
                      <Loader2 className="h-4 w-4 animate-spin text-[#2563EB]" />
                      <span className="text-sm text-[#64748B]">Aguardando pagamento...</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "boleto" && (
              <div className="space-y-4">
                {!boletoData ? (
                  <div className="text-center py-6">
                    <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-3">
                      <FileText className="h-7 w-7 text-[#1E3A5F]" />
                    </div>
                    <div className="flex items-center gap-2 justify-center mb-4 px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200 mx-auto w-fit">
                      <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                      <span className="text-xs text-amber-700">A ativação inicia após a compensação (1-3 dias úteis)</span>
                    </div>
                    <Button
                      onClick={handleGenerateBoleto}
                      disabled={boletoLoading || loading}
                      className="w-full h-12 rounded-xl font-semibold text-[15px] text-white shadow-[0_4px_16px_rgba(37,99,235,0.3)] transition-all duration-200"
                      style={{ background: "linear-gradient(135deg, #2563EB, #06B6D4)" }}
                    >
                      {boletoLoading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Gerando...</> : "Gerar boleto"}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-2">
                        <CheckCircle className="h-6 w-6 text-green-600" />
                      </div>
                      <p className="text-base font-semibold text-[#0F172A]">Boleto gerado!</p>
                    </div>
                    <a href={boletoData.url} target="_blank" rel="noopener noreferrer">
                      <Button className="w-full h-11 rounded-xl font-semibold text-white text-sm shadow-md" style={{ background: "linear-gradient(135deg, #2563EB, #06B6D4)" }}>
                        <Download className="h-4 w-4 mr-2" />
                        Baixar boleto PDF
                      </Button>
                    </a>
                    {boletoData.linhaDigitavel && (
                      <div>
                        <p className="text-xs font-medium text-[#64748B] mb-2">Linha digitável:</p>
                        <div className="flex items-center gap-2 bg-[#F8FAFC] rounded-xl px-4 py-2.5 border border-[#E2E8F0]">
                          <span className="text-xs text-[#0F172A] font-mono truncate flex-1">{boletoData.linhaDigitavel}</span>
                          <button onClick={() => copyToClipboard(boletoData.linhaDigitavel, setBoletoCopied)} className="shrink-0 px-3 py-1 rounded-lg bg-[#2563EB] text-white text-xs font-medium hover:bg-[#1D4ED8] transition-colors">
                            {boletoCopied ? <Check className="h-3.5 w-3.5" /> : "Copiar"}
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200">
                      <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                      <span className="text-xs text-amber-700">Ativação após compensação (1-3 dias úteis)</span>
                    </div>
                    <Button onClick={handleFinishBoleto} variant="outline" className="w-full h-11 rounded-xl text-sm font-medium">
                      Continuar →
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Back */}
            <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-[#64748B] hover:text-[#0F172A] mt-5 transition-colors">
              <ArrowLeft className="h-4 w-4" /> Voltar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
