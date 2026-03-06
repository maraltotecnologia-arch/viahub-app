import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import useUserRole from "@/hooks/useUserRole";
import useAgenciaId from "@/hooks/useAgenciaId";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Mail, Copy, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const planoPreco: Record<string, number> = {
  starter: 397,
  pro: 697,
  elite: 1997,
};

export default function PagamentoPendente() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isSuperadmin, loading: roleLoading } = useUserRole();
  const agenciaId = useAgenciaId();
  const [copied, setCopied] = useState(false);

  const { data: agencia } = useQuery({
    queryKey: ["agencia-bloqueio", agenciaId],
    enabled: !!agenciaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agencias")
        .select("nome_fantasia, plano, status_pagamento, data_bloqueio, data_proximo_vencimento")
        .eq("id", agenciaId!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: ultimoPagamento } = useQuery({
    queryKey: ["ultimo-pagamento", agenciaId],
    enabled: !!agenciaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("asaas_pagamentos")
        .select("*")
        .eq("agencia_id", agenciaId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!roleLoading && isSuperadmin) {
      navigate("/dashboard", { replace: true });
    }
  }, [roleLoading, isSuperadmin, navigate]);

  useEffect(() => {
    if (agencia && agencia.status_pagamento !== "bloqueado") {
      navigate("/dashboard", { replace: true });
    }
  }, [agencia, navigate]);

  const handleCopyPix = () => {
    if (ultimoPagamento?.pix_copia_cola) {
      navigator.clipboard.writeText(ultimoPagamento.pix_copia_cola);
      setCopied(true);
      toast.success("Código PIX copiado!");
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const mensalidade = planoPreco[agencia?.plano || "starter"] || 397;

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4" data-theme="light">
      <div className="max-w-lg w-full space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Acesso suspenso</h1>
          <p className="text-gray-500 mt-2">
            Sua mensalidade está em atraso e o acesso ao sistema foi temporariamente suspenso.
          </p>
        </div>

        {/* Payment details */}
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-lg text-gray-900">Detalhes do pagamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-500">Plano</span>
              <span className="font-medium text-gray-900 capitalize">{agencia?.plano || "Starter"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Valor em aberto</span>
              <span className="font-bold text-red-600">{fmt(mensalidade)}</span>
            </div>
            {agencia?.data_proximo_vencimento && (
              <div className="flex justify-between">
                <span className="text-gray-500">Vencimento</span>
                <span className="text-gray-900">{new Date(agencia.data_proximo_vencimento).toLocaleDateString("pt-BR")}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* PIX */}
        {ultimoPagamento?.pix_copia_cola && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-gray-900">Pagar com PIX</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {ultimoPagamento.pix_qr_code && (
                <div className="flex justify-center">
                  <img
                    src={`data:image/png;base64,${ultimoPagamento.pix_qr_code}`}
                    alt="QR Code PIX"
                    className="w-48 h-48"
                  />
                </div>
              )}
              <div className="space-y-2">
                <p className="text-sm text-gray-500">Copia e cola:</p>
                <div className="flex gap-2">
                  <code className="flex-1 bg-gray-100 p-2 rounded text-xs break-all text-gray-700">
                    {ultimoPagamento.pix_copia_cola}
                  </code>
                  <Button size="sm" variant="outline" onClick={handleCopyPix}>
                    {copied ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Boleto */}
        {ultimoPagamento?.boleto_url && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-gray-900">Pagar com Boleto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full" asChild>
                <a href={ultimoPagamento.boleto_url} target="_blank" rel="noopener noreferrer">
                  Abrir boleto
                </a>
              </Button>
              {ultimoPagamento.boleto_linha_digitavel && (
                <p className="text-xs text-gray-500 text-center break-all">
                  {ultimoPagamento.boleto_linha_digitavel}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <p className="text-sm text-blue-800">
            Após o pagamento, o acesso é liberado automaticamente em até 1 hora.
          </p>
        </div>

        {/* Contact */}
        <div className="text-center">
          <a
            href="mailto:suporte@viahub.app"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
          >
            <Mail className="h-4 w-4" />
            suporte@viahub.app
          </a>
        </div>
      </div>
    </div>
  );
}
