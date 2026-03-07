import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, CreditCard, Zap, FileText, AlertTriangle, Copy, Check, ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { CadastroData, PaymentResult } from "@/pages/Cadastro";

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

  // Card fields
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");

  // PIX state
  const [pixData, setPixData] = useState<{ qrCode: string; payload: string; paymentId: string } | null>(null);
  const [pixLoading, setPixLoading] = useState(false);
  const [pixCopied, setPixCopied] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Boleto state
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

  // CREDIT CARD
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
      onComplete({
        formaPagamento: "cartao",
        email: data.email.trim().toLowerCase(),
        invoiceUrl: result.invoiceUrl,
      });
    }
    setLoading(false);
  };

  // PIX
  const handleGeneratePix = async () => {
    setPixLoading(true);
    const result = await handleSignupAndPay("PIX");
    if (result) {
      if (result.pixQrCode && result.pixPayload) {
        setPixData({ qrCode: result.pixQrCode, payload: result.pixPayload, paymentId: result.paymentId });
        // Start polling
        if (result.paymentId) {
          pollingRef.current = setInterval(async () => {
            try {
              const check = await supabase.functions.invoke("asaas-verificar-pagamento", {
                body: { payment_id: result.paymentId },
              });
              if (check.data?.status === "RECEIVED" || check.data?.status === "CONFIRMED") {
                if (pollingRef.current) clearInterval(pollingRef.current);
                onComplete({
                  formaPagamento: "pix",
                  email: data.email.trim().toLowerCase(),
                });
              }
            } catch { /* ignore */ }
          }, 5000);
        }
      } else {
        // Fallback: invoiceUrl
        onComplete({
          formaPagamento: "pix",
          email: data.email.trim().toLowerCase(),
          invoiceUrl: result.invoiceUrl,
        });
      }
    }
    setPixLoading(false);
    setLoading(false);
  };

  // BOLETO
  const handleGenerateBoleto = async () => {
    setBoletoLoading(true);
    const result = await handleSignupAndPay("BOLETO");
    if (result) {
      if (result.boletoUrl) {
        setBoletoData({
          url: result.boletoUrl,
          linhaDigitavel: result.boletoLinhaDigitavel || "",
          paymentId: result.paymentId,
        });
      } else {
        onComplete({
          formaPagamento: "boleto",
          email: data.email.trim().toLowerCase(),
          boletoUrl: result.boletoUrl,
          boletoLinhaDigitavel: result.boletoLinhaDigitavel,
        });
      }
    }
    setBoletoLoading(false);
    setLoading(false);
  };

  const handleFinishBoleto = () => {
    onComplete({
      formaPagamento: "boleto",
      email: data.email.trim().toLowerCase(),
      boletoUrl: boletoData?.url,
      boletoLinhaDigitavel: boletoData?.linhaDigitavel,
    });
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

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full lg:h-[calc(100vh-5rem)]">
      {/* Left panel */}
      <div className="flex-1 flex flex-col overflow-y-auto lg:overflow-hidden space-y-3">
        {/* Plans - horizontal compact */}
        <div>
          <h2 className="text-sm font-bold text-[#0F172A] mb-2">Escolha seu plano</h2>
          <div className="space-y-1.5">
            {planos.map((p) => {
              const selected = data.plano === p.value;
              return (
                <button
                  key={p.value}
                  onClick={() => updateData({ plano: p.value })}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg border transition-all text-left ${
                    selected
                      ? "border-[#1E3A5F] bg-blue-50"
                      : "border-[#E2E8F0] bg-white hover:border-[#94A3B8]"
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    selected ? "border-[#1E3A5F]" : "border-[#CBD5E1]"
                  }`}>
                    {selected && <div className="w-2 h-2 rounded-full bg-[#1E3A5F]" />}
                  </div>
                  <div className="flex-1 flex items-center gap-2 min-w-0">
                    <span className="font-semibold text-sm text-[#0F172A]">{p.label}</span>
                    {p.popular && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">⭐ Popular</span>
                    )}
                  </div>
                  <span className="text-sm font-bold text-[#1E3A5F] shrink-0">{p.preco}<span className="text-[10px] font-normal text-[#64748B]">/mês</span></span>
                  <span className="text-[11px] text-[#64748B] hidden sm:block shrink-0">{p.resumo}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Payment method */}
        <div className="flex-1 flex flex-col min-h-0">
          <h2 className="text-sm font-bold text-[#0F172A] mb-2">Forma de pagamento</h2>

          {/* Tabs */}
          <div className="flex border-b border-[#E2E8F0] mb-3">
            {tabs.map((t) => {
              const Icon = t.icon;
              const active = activeTab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium border-b-2 transition-all ${
                    active
                      ? "border-[#1E3A5F] text-[#1E3A5F]"
                      : "border-transparent text-[#64748B] hover:text-[#0F172A]"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === "cartao" && (
              <div className="space-y-2">
                <div>
                  <Label className="text-xs">Número do cartão</Label>
                  <div className="relative mt-0.5">
                    <Input
                      placeholder="0000 0000 0000 0000"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(maskCardNumber(e.target.value))}
                      className="h-8 text-sm pr-14"
                      maxLength={19}
                    />
                    {brand && (
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[#64748B]">{brand}</span>
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Nome no cartão</Label>
                  <Input
                    placeholder="NOME COMO NO CARTÃO"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value.toUpperCase())}
                    className="h-8 text-sm mt-0.5"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Validade</Label>
                    <Input
                      placeholder="MM/AA"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(maskExpiry(e.target.value))}
                      className="h-8 text-sm mt-0.5"
                      maxLength={5}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">CVV</Label>
                    <Input
                      placeholder="000"
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      className="h-8 text-sm mt-0.5"
                      maxLength={4}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === "pix" && (
              <div className="space-y-3">
                {!pixData ? (
                  <div className="text-center py-4">
                    <Zap className="h-8 w-8 text-[#1E3A5F] mx-auto mb-2" />
                    <p className="text-xs text-[#64748B] mb-3">Clique para gerar o QR Code PIX. Após o pagamento, sua conta será ativada automaticamente.</p>
                    <Button
                      onClick={handleGeneratePix}
                      disabled={pixLoading || loading}
                      className="rounded-xl font-semibold text-white h-8 text-sm px-6"
                      style={{ background: "linear-gradient(135deg, #1E3A5F, #2563EB)" }}
                    >
                      {pixLoading ? <><Loader2 className="h-4 w-4 animate-spin mr-1" />Gerando...</> : "Gerar QR Code PIX"}
                    </Button>
                  </div>
                ) : (
                  <div className="text-center space-y-2">
                    <div className="inline-block p-2 bg-white rounded-xl border border-[#E2E8F0]">
                      <img src={`data:image/png;base64,${pixData.qrCode}`} alt="QR Code PIX" className="w-36 h-36" />
                    </div>
                    <div>
                      <p className="text-xs text-[#64748B] mb-1">Copia e cola:</p>
                      <div className="flex items-center gap-1 bg-[#F1F5F9] rounded-lg px-3 py-1.5">
                        <span className="text-[10px] text-[#0F172A] font-mono truncate flex-1">{pixData.payload}</span>
                        <button onClick={() => copyToClipboard(pixData.payload, setPixCopied)} className="shrink-0 text-[#2563EB] hover:text-[#1E3A5F]">
                          {pixCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 justify-center">
                      <Loader2 className="h-3 w-3 animate-spin text-[#2563EB]" />
                      <span className="text-[10px] text-[#64748B]">Aguardando pagamento...</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "boleto" && (
              <div className="space-y-3">
                {!boletoData ? (
                  <div className="text-center py-4">
                    <FileText className="h-8 w-8 text-[#1E3A5F] mx-auto mb-2" />
                    <div className="flex items-center gap-1 justify-center mb-3 px-3 py-1.5 rounded bg-yellow-50 border border-yellow-200 mx-auto w-fit">
                      <AlertTriangle className="h-3 w-3 text-yellow-600 shrink-0" />
                      <span className="text-[10px] text-yellow-700">A ativação inicia após a compensação (1-3 dias úteis)</span>
                    </div>
                    <Button
                      onClick={handleGenerateBoleto}
                      disabled={boletoLoading || loading}
                      className="rounded-xl font-semibold text-white h-8 text-sm px-6"
                      style={{ background: "linear-gradient(135deg, #1E3A5F, #2563EB)" }}
                    >
                      {boletoLoading ? <><Loader2 className="h-4 w-4 animate-spin mr-1" />Gerando...</> : "Gerar boleto"}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-center">
                      <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-1" />
                      <p className="text-sm font-medium text-[#0F172A]">Boleto gerado!</p>
                    </div>
                    <a href={boletoData.url} target="_blank" rel="noopener noreferrer">
                      <Button className="w-full h-8 rounded-xl font-semibold text-white text-sm" style={{ background: "linear-gradient(135deg, #1E3A5F, #2563EB)" }}>
                        Baixar boleto
                      </Button>
                    </a>
                    {boletoData.linhaDigitavel && (
                      <div>
                        <p className="text-xs text-[#64748B] mb-1">Linha digitável:</p>
                        <div className="flex items-center gap-1 bg-[#F1F5F9] rounded-lg px-3 py-1.5">
                          <span className="text-[10px] text-[#0F172A] font-mono truncate flex-1">{boletoData.linhaDigitavel}</span>
                          <button onClick={() => copyToClipboard(boletoData.linhaDigitavel, setBoletoCopied)} className="shrink-0 text-[#2563EB]">
                            {boletoCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-1 px-3 py-1.5 rounded bg-yellow-50 border border-yellow-200">
                      <AlertTriangle className="h-3 w-3 text-yellow-600 shrink-0" />
                      <span className="text-[10px] text-yellow-700">Ativação após compensação (1-3 dias úteis)</span>
                    </div>
                    <Button onClick={handleFinishBoleto} variant="outline" className="w-full h-8 rounded-xl text-sm">
                      Continuar →
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Back button */}
        <button onClick={onBack} className="flex items-center gap-1 text-xs text-[#64748B] hover:text-[#0F172A] shrink-0">
          <ArrowLeft className="h-3 w-3" /> Voltar
        </button>
      </div>

      {/* Right panel - Order summary */}
      <div className="lg:w-[280px] shrink-0">
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-sm sticky top-0">
          <h3 className="font-bold text-sm text-[#0F172A] mb-3">Resumo do pedido</h3>
          <div className="border-t border-[#E2E8F0] pt-2 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-[#64748B]">Plano</span>
              <span className="font-medium text-[#0F172A] capitalize">{data.plano}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#64748B]">Cobrança</span>
              <span className="font-medium text-[#0F172A]">Mensal</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#64748B]">Vencimento</span>
              <span className="font-medium text-[#0F172A]">Dia 10</span>
            </div>
          </div>
          <div className="border-t border-[#E2E8F0] mt-2 pt-2 flex justify-between">
            <span className="font-bold text-sm text-[#0F172A]">Total</span>
            <span className="font-bold text-sm text-[#1E3A5F]">{precoMap[data.plano]}/mês</span>
          </div>

          {activeTab === "cartao" && (
            <Button
              onClick={handleCardPayment}
              disabled={loading || !cardNumber || !cardName || !cardExpiry || !cardCvv}
              className="w-full h-9 mt-3 rounded-xl font-semibold text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50 text-sm"
              style={{ background: "linear-gradient(135deg, #1E3A5F, #2563EB)" }}
            >
              {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-1" />Processando...</> : "Finalizar cadastro →"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
