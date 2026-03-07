import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, CreditCard, Zap, FileText, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { CadastroData } from "@/pages/Cadastro";

const planos = [
  {
    value: "starter",
    label: "Starter",
    preco: "R$ 397",
    features: ["Até 3 usuários", "Orçamentos ilimitados", "Suporte por email"],
  },
  {
    value: "pro",
    label: "Pro",
    preco: "R$ 697",
    popular: true,
    features: ["Até 10 usuários", "Orçamentos ilimitados", "Suporte prioritário", "Relatórios avançados"],
  },
  {
    value: "elite",
    label: "Elite",
    preco: "R$ 1.997",
    features: ["Usuários ilimitados", "Orçamentos ilimitados", "Suporte dedicado", "Todas as funcionalidades"],
  },
];

const formasPagamento = [
  {
    value: "cartao",
    label: "Cartão de Crédito",
    icon: CreditCard,
    desc: "Aprovação imediata",
  },
  {
    value: "pix",
    label: "PIX",
    icon: Zap,
    desc: "Aprovação imediata",
  },
  {
    value: "boleto",
    label: "Boleto Bancário",
    icon: FileText,
    desc: "Compensação em 1-3 dias úteis",
    warning: true,
  },
];

const precoMap: Record<string, string> = { starter: "R$ 397,00", pro: "R$ 697,00", elite: "R$ 1.997,00" };

type Props = {
  data: CadastroData;
  updateData: (d: Partial<CadastroData>) => void;
  onBack: () => void;
  onComplete: (result: { invoiceUrl?: string; boletoUrl?: string; formaPagamento: string; email: string }) => void;
};

export default function CadastroStep2({ data, updateData, onBack, onComplete }: Props) {
  const [loading, setLoading] = useState(false);

  const handleFinish = async () => {
    if (!data.plano || !data.formaPagamento) return;
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
          forma_pagamento: data.formaPagamento,
        },
      });

      if (res.error || res.data?.error) {
        const msg = res.data?.error || res.error?.message || "Erro ao criar conta";
        toast({ title: "Erro", description: msg, variant: "destructive" });
        setLoading(false);
        return;
      }

      const result = res.data;
      onComplete({
        invoiceUrl: result?.invoiceUrl,
        boletoUrl: result?.boletoUrl,
        formaPagamento: data.formaPagamento,
        email: data.email.trim().toLowerCase(),
      });
    } catch {
      toast({ title: "Erro", description: "Erro inesperado. Tente novamente.", variant: "destructive" });
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Plan cards */}
      <div>
        <h2 className="text-xl font-bold text-[#0F172A] mb-4">Escolha seu plano</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {planos.map((p) => {
            const selected = data.plano === p.value;
            return (
              <button
                key={p.value}
                onClick={() => updateData({ plano: p.value })}
                className={`relative text-left p-5 rounded-xl border-2 transition-all hover:shadow-md ${
                  selected
                    ? "border-[#1E3A5F] bg-blue-50 shadow-md"
                    : "border-[#E2E8F0] bg-white hover:border-[#94A3B8]"
                }`}
              >
                {selected && (
                  <CheckCircle className="absolute top-3 right-3 h-5 w-5 text-[#1E3A5F]" />
                )}
                {p.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-900 text-xs font-bold px-3 py-0.5 rounded-full">
                    ⭐ Mais popular
                  </span>
                )}
                <h3 className="text-lg font-bold text-[#0F172A]">{p.label}</h3>
                <p className="text-2xl font-extrabold text-[#1E3A5F] mt-1">
                  {p.preco}<span className="text-sm font-normal text-[#64748B]">/mês</span>
                </p>
                <ul className="mt-3 space-y-1.5">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-[#475569]">
                      <CheckCircle className="h-3.5 w-3.5 text-[#2563EB] shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>
      </div>

      {/* Payment method + summary */}
      {data.plano && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          {/* Payment methods */}
          <div className="lg:col-span-2">
            <h2 className="text-xl font-bold text-[#0F172A] mb-4">Como deseja pagar?</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {formasPagamento.map((fp) => {
                const selected = data.formaPagamento === fp.value;
                const Icon = fp.icon;
                return (
                  <button
                    key={fp.value}
                    onClick={() => updateData({ formaPagamento: fp.value })}
                    className={`relative text-left p-4 rounded-xl border-2 transition-all hover:shadow-md ${
                      selected
                        ? "border-[#1E3A5F] bg-blue-50 shadow-md"
                        : "border-[#E2E8F0] bg-white hover:border-[#94A3B8]"
                    }`}
                  >
                    {selected && (
                      <CheckCircle className="absolute top-2 right-2 h-4 w-4 text-[#1E3A5F]" />
                    )}
                    <Icon className="h-6 w-6 text-[#1E3A5F] mb-2" />
                    <p className="font-semibold text-sm text-[#0F172A]">{fp.label}</p>
                    <p className="text-xs text-[#64748B] mt-0.5">{fp.desc}</p>
                    {fp.warning && (
                      <div className="flex items-center gap-1 mt-2 px-2 py-1 rounded bg-yellow-50 border border-yellow-200">
                        <AlertTriangle className="h-3 w-3 text-yellow-600 shrink-0" />
                        <span className="text-[10px] text-yellow-700">Ativação após compensação</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Order summary */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-sm h-fit">
            <h3 className="font-bold text-[#0F172A] mb-3">Resumo do pedido</h3>
            <div className="border-t border-[#E2E8F0] pt-3 space-y-2 text-sm">
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
            <div className="border-t border-[#E2E8F0] mt-3 pt-3 flex justify-between">
              <span className="font-bold text-[#0F172A]">Total</span>
              <span className="font-bold text-[#1E3A5F]">{precoMap[data.plano]}/mês</span>
            </div>

            <Button
              onClick={handleFinish}
              disabled={!data.formaPagamento || loading}
              className="w-full h-10 mt-4 rounded-xl font-semibold text-white shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #1E3A5F, #2563EB)" }}
            >
              {loading ? "Finalizando..." : "Finalizar cadastro →"}
            </Button>
          </div>
        </div>
      )}

      {/* Back button */}
      <div>
        <Button variant="outline" onClick={onBack} className="rounded-xl">
          ← Voltar
        </Button>
      </div>
    </div>
  );
}
