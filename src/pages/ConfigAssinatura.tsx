import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CreditCard, Zap, FileText, CheckCircle2, AlertTriangle, Crown, Lock, RefreshCw, Copy, Download, QrCode, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import useAgenciaId from "@/hooks/useAgenciaId";
import MetodoPagamentoModal from "@/components/assinatura/MetodoPagamentoModal";
import { formatError } from "@/lib/errors";
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
  const [metodoModalOpen, setMetodoModalOpen] = useState(false);

  // PIX QR Code modal state
  const [pixModalOpen, setPixModalOpen] = useState(false);
  const [pixLoading, setPixLoading] = useState(false);
  const [pixData, setPixData] = useState<{ encodedImage: string; payload: string; value: number; dueDate: string } | null>(null);
  const pixPollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pixPollingStartRef = useRef<number>(Date.now());
  const [pixPaymentId, setPixPaymentId] = useState<string | null>(null);
  const POLLING_TIMEOUT = 30 * 60 * 1000; // 30 minutes

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
        .in("status", ["OVERDUE", "PENDING", "REFUSED"])
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

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pixPollingRef.current) clearInterval(pixPollingRef.current);
    };
  }, []);

  const handleGeneratePixQr = async (paymentId: string) => {
    setPixLoading(true);
    setPixPaymentId(paymentId);
    setPixData(null);
    setPixModalOpen(true);

    try {
      const res = await supabase.functions.invoke("asaas-gerar-qrcode-pix", {
        body: { payment_id: paymentId },
      });

      if (res.data?.alreadyPaid) {
        toast({ title: "Pagamento já confirmado!" });
        setPixModalOpen(false);
        queryClient.invalidateQueries({ queryKey: ["debitos-aberto"] });
        queryClient.invalidateQueries({ queryKey: ["agencia-assinatura"] });
        return;
      }

      if (res.error || res.data?.error) {
        toast({ title: formatError("PAG004"), variant: "destructive" });
        setPixModalOpen(false);
        return;
      }

      setPixData(res.data);

      // Start polling with timeout
      if (pixPollingRef.current) clearInterval(pixPollingRef.current);
      pixPollingStartRef.current = Date.now();
      pixPollingRef.current = setInterval(async () => {
        if (Date.now() - pixPollingStartRef.current > POLLING_TIMEOUT) {
          if (pixPollingRef.current) clearInterval(pixPollingRef.current);
          toast({ title: "QR Code expirado", description: "Gere um novo QR Code para continuar.", variant: "destructive" });
          setPixModalOpen(false);
          return;
        }
        try {
          const checkRes = await supabase.functions.invoke("asaas-verificar-pagamento", {
            body: { payment_id: paymentId },
          });
          if (checkRes.data?.status === "RECEIVED" || checkRes.data?.status === "CONFIRMED") {
            if (pixPollingRef.current) clearInterval(pixPollingRef.current);
            toast({ title: "Pagamento confirmado! ✓" });
            setPixModalOpen(false);
            queryClient.invalidateQueries({ queryKey: ["debitos-aberto"] });
            queryClient.invalidateQueries({ queryKey: ["agencia-assinatura"] });
          }
        } catch {}
      }, 5000);
    } catch {
      toast({ title: formatError("SYS001"), variant: "destructive" });
      setPixModalOpen(false);
    } finally {
      setPixLoading(false);
    }
  };

  const handleCopyPixPayload = () => {
    if (pixData?.payload) {
      navigator.clipboard.writeText(pixData.payload);
      toast({ title: "Código copiado!" });
    }
  };

  const handleCopyLinhaDigitavel = (linha: string) => {
    navigator.clipboard.writeText(linha);
    toast({ title: "Linha digitável copiada!" });
  };

  const handleChangePlan = async (newPlan: string) => {
    if (!agenciaId || !agencia?.asaas_subscription_id) return;
    setChangingPlan(newPlan);
    try {
      const res = await supabase.functions.invoke("asaas-trocar-plano", {
        body: { agencia_id: agenciaId, novo_plano: newPlan },
      });
      if (res.error || res.data?.error) {
        toast({ title: formatError("PAG007"), variant: "destructive" });
      } else {
        toast({ title: "Plano alterado com sucesso!" });
        queryClient.invalidateQueries({ queryKey: ["agencia-assinatura"] });
        queryClient.invalidateQueries({ queryKey: ["agencia"] });
      }
    } catch {
      toast({ title: formatError("SYS001"), variant: "destructive" });
    }
    setChangingPlan(null);
  };

  if (isLoading) return <div className="space-y-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>;

  const planoAtual = agencia?.plano || "starter";
  const planoInfo = PLANOS.find((p) => p.value === planoAtual);
  const status = statusConfig[agencia?.status_pagamento || "ativo"] || statusConfig.ativo;
  const forma = ultimoPagamento?.forma_pagamento ? formaLabel[ultimoPagamento.forma_pagamento] : null;

  const getDebitoStatusBadge = (d: any) => {
    if (d.status === "REFUSED") return <Badge variant="destructive">Recusado</Badge>;
    if (d.status === "OVERDUE") return <Badge variant="destructive">Vencido</Badge>;
    return <Badge variant="muted">Pendente</Badge>;
  };

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
            <div className="flex items-center gap-3 p-4 bg-green-500/10 rounded-lg border border-green-500/20">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="text-sm text-green-500 font-medium">
                Nenhum débito em aberto ✓
              </span>
            </div>
          ) : (
            <div className="space-y-3">
              {debitos.map((d) => (
                <div key={d.id} className="p-4 rounded-lg border space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        Vencimento: {d.vencimento ? new Date(d.vencimento + "T12:00:00").toLocaleDateString("pt-BR") : "—"}
                      </p>
                      <p className="text-lg font-bold">{fmt(d.valor || 0)}</p>
                      {d.forma_pagamento && (
                        <p className="text-xs text-muted-foreground">
                          {formaLabel[d.forma_pagamento]?.text || d.forma_pagamento}
                        </p>
                      )}
                    </div>
                    {getDebitoStatusBadge(d)}
                  </div>

                  {/* PIX actions */}
                  {d.forma_pagamento === "PIX" && (d.status === "PENDING" || d.status === "OVERDUE") && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={() => handleGeneratePixQr(d.asaas_payment_id!)}
                    >
                      <QrCode className="h-4 w-4 mr-2" />
                      Gerar QR Code PIX
                    </Button>
                  )}

                  {/* BOLETO actions */}
                  {d.forma_pagamento === "BOLETO" && (d.status === "PENDING" || d.status === "OVERDUE") && (
                    <div className="space-y-2">
                      {d.boleto_url && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          onClick={() => window.open(d.boleto_url!, "_blank")}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Baixar boleto
                        </Button>
                      )}
                      {d.boleto_linha_digitavel && (
                        <div className="flex items-center gap-2 p-2 bg-muted rounded text-xs">
                          <code className="flex-1 truncate">{d.boleto_linha_digitavel}</code>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 shrink-0"
                            onClick={() => handleCopyLinhaDigitavel(d.boleto_linha_digitavel!)}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* CREDIT_CARD refused */}
                  {d.forma_pagamento === "CREDIT_CARD" && (d.status === "REFUSED" || d.status === "OVERDUE") && (
                    <div className="space-y-2">
                      {d.status === "REFUSED" && (
                        <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-950/20 rounded text-xs text-red-700 dark:text-red-400">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                          Seu cartão foi recusado. Atualize os dados para regularizar.
                        </div>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => setMetodoModalOpen(true)}
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        Atualizar cartão
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* SEÇÃO — Método de Pagamento */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" />
            Método de Pagamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          {forma ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <forma.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{forma.text}</p>
                  <p className="text-xs text-muted-foreground">Método atual de cobrança</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => setMetodoModalOpen(true)}>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Trocar método
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Nenhum método de pagamento registrado</p>
              <Button variant="outline" size="sm" onClick={() => setMetodoModalOpen(true)}>
                Definir método
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <MetodoPagamentoModal
        open={metodoModalOpen}
        onOpenChange={setMetodoModalOpen}
        agenciaId={agenciaId || ""}
        metodoAtual={ultimoPagamento?.forma_pagamento || null}
      />

      {/* PIX QR Code Modal */}
      <Dialog open={pixModalOpen} onOpenChange={(open) => {
        if (!open && pixPollingRef.current) clearInterval(pixPollingRef.current);
        setPixModalOpen(open);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Pagar com PIX
            </DialogTitle>
          </DialogHeader>
          {pixLoading ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Gerando QR Code...</p>
            </div>
          ) : pixData ? (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-2xl font-bold">{fmt(pixData.value)}</p>
                <p className="text-sm text-muted-foreground">
                  Vencimento: {new Date(pixData.dueDate + "T12:00:00").toLocaleDateString("pt-BR")}
                </p>
              </div>
              <div className="flex justify-center">
                <div className="bg-white p-3 rounded-xl inline-block">
                  <img
                    src={`data:image/png;base64,${pixData.encodedImage}`}
                    alt="QR Code PIX"
                    className="w-56 h-56 rounded-lg"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Copia e cola:</p>
                <div className="flex items-center gap-2 p-2 bg-muted rounded">
                  <code className="text-xs flex-1 break-all max-h-16 overflow-y-auto">{pixData.payload}</code>
                  <Button size="sm" variant="ghost" className="shrink-0" onClick={handleCopyPixPayload}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg text-xs text-blue-700 dark:text-blue-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                Aguardando confirmação do pagamento...
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

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
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500">
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
