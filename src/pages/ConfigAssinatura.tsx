import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { CreditCard, Zap, FileText, CheckCircle2, AlertTriangle, Crown, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import useAgenciaId from "@/hooks/useAgenciaId";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const PLANOS = [
  { value: "starter", label: "Starter", preco: 397, resumo: "3 usuários • Suporte por email" },
  { value: "pro", label: "Pro", preco: 697, popular: true, resumo: "10 usuários • Suporte prioritário • Relatórios" },
  { value: "elite", label: "Elite", preco: 1997, resumo: "Ilimitados • Suporte dedicado • Tudo incluso" },
];

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const statusConfig: Record<string, { label: string; variant: "success" | "destructive" | "warning" | "muted" }> = {
  ativo: { label: "Ativo", variant: "success" },
  inadimplente: { label: "Inadimplente", variant: "warning" },
  bloqueado: { label: "Bloqueado", variant: "destructive" },
  pendente: { label: "Pendente", variant: "muted" },
};

const formaLabel: Record<string, { icon: typeof CreditCard; text: string }> = {
  CREDIT_CARD: { icon: CreditCard, text: "Cartão de Crédito" },
  PIX: { icon: Zap, text: "PIX" },
  BOLETO: { icon: FileText, text: "Boleto Bancário" },
};

export default function ConfigAssinatura() {
  const agenciaId = useAgenciaId();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [changingPlan, setChangingPlan] = useState<string | null>(null);

  const { data: agencia, isLoading } = useQuery({
    queryKey: ["agencia-assinatura", agenciaId],
    enabled: !!agenciaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agencias")
        .select("nome_fantasia, plano, status_pagamento, data_proximo_vencimento, asaas_subscription_id")
        .eq("id", agenciaId!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: debitos } = useQuery({
    queryKey: ["debitos-aberto", agenciaId],
    enabled: !!agenciaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("asaas_pagamentos")
        .select("*")
        .eq("agencia_id", agenciaId!)
        .in("status", ["OVERDUE", "PENDING"])
        .order("vencimento", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: ultimoPagamento } = useQuery({
    queryKey: ["ultimo-pagamento-forma", agenciaId],
    enabled: !!agenciaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("asaas_pagamentos")
        .select("forma_pagamento")
        .eq("agencia_id", agenciaId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const handleChangePlan = async (newPlan: string) => {
    if (!agenciaId || !agencia?.asaas_subscription_id) return;
    setChangingPlan(newPlan);
    try {
      const res = await supabase.functions.invoke("asaas-trocar-plano", {
        body: { agencia_id: agenciaId, novo_plano: newPlan },
      });
      if (res.error || res.data?.error) {
        toast({ title: "Erro ao trocar plano", description: res.data?.error || res.error?.message, variant: "destructive" });
      } else {
        toast({ title: "Plano alterado com sucesso!" });
        queryClient.invalidateQueries({ queryKey: ["agencia-assinatura"] });
      }
    } catch {
      toast({ title: "Erro inesperado", variant: "destructive" });
    }
    setChangingPlan(null);
  };

  if (isLoading) return <div className="space-y-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>;

  const planoAtual = agencia?.plano || "starter";
  const planoInfo = PLANOS.find((p) => p.value === planoAtual);
  const status = statusConfig[agencia?.status_pagamento || "ativo"] || statusConfig.ativo;
  const forma = ultimoPagamento?.forma_pagamento ? formaLabel[ultimoPagamento.forma_pagamento] : null;

  return (
    <div className="space-y-6 max-w-3xl animate-fade-in">
      <h2 className="text-2xl font-bold">Assinatura</h2>

      {/* SEÇÃO A — Plano atual */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Crown className="h-4 w-4 text-primary" />
            Plano Atual
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Plano</p>
              <p className="text-lg font-bold capitalize">{planoInfo?.label || planoAtual}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Valor mensal</p>
              <p className="text-lg font-bold">{fmt(planoInfo?.preco || 397)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge variant={status.variant} className="mt-1">{status.label}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Próximo vencimento</p>
              <p className="font-medium">
                {agencia?.data_proximo_vencimento
                  ? new Date(agencia.data_proximo_vencimento + "T12:00:00").toLocaleDateString("pt-BR")
                  : "—"}
              </p>
            </div>
            {forma && (
              <div className="col-span-2">
                <p className="text-sm text-muted-foreground">Forma de pagamento</p>
                <div className="flex items-center gap-2 mt-1">
                  <forma.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{forma.text}</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* SEÇÃO B — Débitos em aberto */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Débitos em Aberto</CardTitle>
        </CardHeader>
        <CardContent>
          {!debitos || debitos.length === 0 ? (
            <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="text-sm text-green-800 dark:text-green-300 font-medium">
                Nenhum débito em aberto ✓
              </span>
            </div>
          ) : (
            <div className="space-y-3">
              {debitos.map((d) => (
                <div key={d.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      Vencimento: {d.vencimento ? new Date(d.vencimento + "T12:00:00").toLocaleDateString("pt-BR") : "—"}
                    </p>
                    <p className="text-sm text-muted-foreground">{fmt(d.valor || 0)}</p>
                  </div>
                  <Badge variant={d.status === "OVERDUE" ? "destructive" : "muted"}>
                    {d.status === "OVERDUE" ? "Vencido" : "Pendente"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* SEÇÃO C — Trocar plano */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Trocar Plano</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {PLANOS.map((p) => {
              const isCurrent = p.value === planoAtual;
              return (
                <div
                  key={p.value}
                  className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                    isCurrent ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{p.label}</span>
                      {p.popular && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
                          Popular
                        </span>
                      )}
                      {isCurrent && (
                        <Badge variant="success" className="text-[10px]">Plano atual</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{p.resumo}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{fmt(p.preco)}<span className="text-xs font-normal text-muted-foreground">/mês</span></p>
                    {!isCurrent && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2"
                        disabled={!!changingPlan || !agencia?.asaas_subscription_id}
                        onClick={() => handleChangePlan(p.value)}
                      >
                        {changingPlan === p.value ? "Trocando..." : "Trocar para este"}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {!agencia?.asaas_subscription_id && (
            <p className="text-xs text-muted-foreground mt-3">
              Troca de plano disponível após a primeira cobrança ser processada.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
