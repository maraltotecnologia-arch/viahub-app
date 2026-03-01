import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, MessageCircle } from "lucide-react";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

import { formatarApenasDatabrasilia } from "@/lib/date-utils";

const fmtDate = (d: string | null | undefined) =>
  d ? formatarApenasDatabrasilia(d + "T12:00:00") : "-";

const formatarPagamento = (forma: string | null | undefined) => {
  if (!forma) return "Não informada";
  const m: Record<string, string> = {
    pix: "PIX", credito: "Crédito", debito: "Débito", avista: "À Vista", a_vista: "À Vista",
  };
  return m[forma.toLowerCase()] ?? forma;
};

export default function OrcamentoPublico() {
  const { token } = useParams();

  const { data: orc, isLoading, error } = useQuery({
    queryKey: ["orcamento-publico", token],
    enabled: !!token,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orcamentos")
        .select(`
          *,
          clientes(nome, email, telefone),
          itens_orcamento(*),
          agencias(nome_fantasia, telefone, email, logo_url, cnpj)
        `)
        .eq("token_publico", token!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="space-y-4 w-full max-w-2xl px-6">
          <Skeleton className="h-12 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!orc || error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center px-6">
          <div className="text-6xl mb-4">🔗</div>
          <h1 className="text-2xl font-bold text-[#0F172A] mb-2">Orçamento não encontrado</h1>
          <p className="text-[#64748B]">O link é inválido ou o orçamento não está mais disponível.</p>
        </div>
      </div>
    );
  }

  const agencia = orc.agencias as any;
  const cliente = orc.clientes as any;
  const itens = (orc.itens_orcamento as any[]) || [];
  const total = itens.reduce((s: number, i: any) => s + (Number(i.valor_final) || 0), 0);
  const showStatus = ["aprovado", "emitido"].includes(orc.status || "");

  const handleWhatsApp = () => {
    if (!agencia?.telefone) return;
    const numero = agencia.telefone.replace(/\D/g, "");
    const formatado = numero.startsWith("55") ? numero : `55${numero}`;
    const msg = `Olá! Estou visualizando o orçamento ${orc.numero_orcamento || ""} e gostaria de mais informações.`;
    window.open(`https://wa.me/${formatado}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const handlePrint = () => window.print();

  return (
    <div className="min-h-screen bg-[#F8FAFC] print:bg-white">
      {/* Header */}
      <header className="bg-white border-b border-[#E2E8F0] print:border-0">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {agencia?.logo_url && (
              <img
                src={agencia.logo_url}
                alt="Logo"
                className="h-12 object-contain"
                crossOrigin="anonymous"
              />
            )}
            <div>
              <h1 className="text-lg font-bold text-[#0F172A]">{agencia?.nome_fantasia || "Agência"}</h1>
              {agencia?.cnpj && <p className="text-xs text-[#64748B]">CNPJ: {agencia.cnpj}</p>}
            </div>
          </div>
          <div className="text-sm text-[#64748B] sm:text-right">
            {agencia?.telefone && <p>{agencia.telefone}</p>}
            {agencia?.email && <p>{agencia.email}</p>}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Title section */}
        <div>
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#0F172A]">
              Orçamento {orc.numero_orcamento ? `#${orc.numero_orcamento}` : ""}
            </h2>
            {showStatus && (
              <Badge variant={orc.status === "aprovado" ? "default" : "secondary"} className="text-xs">
                {orc.status === "aprovado" ? "Aprovado" : "Emitido"}
              </Badge>
            )}
          </div>
          {orc.titulo && <p className="text-[#64748B]">{orc.titulo}</p>}
          <div className="flex flex-wrap gap-x-6 gap-y-1 mt-3 text-sm text-[#64748B]">
            {orc.validade && <span>Válido até {fmtDate(orc.validade)}</span>}
            {cliente?.nome && <span>Preparado para: <strong className="text-[#0F172A]">{cliente.nome}</strong></span>}
          </div>
        </div>

        {/* Services table */}
        <div className="bg-white rounded-lg border border-[#E2E8F0] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#1E3A8A] text-white">
                  <th className="text-left py-3 px-4 font-semibold text-xs uppercase tracking-wider w-[25%]">Serviço</th>
                  <th className="text-left py-3 px-4 font-semibold text-xs uppercase tracking-wider w-[55%]">Descrição</th>
                  <th className="text-right py-3 px-4 font-semibold text-xs uppercase tracking-wider w-[20%]">Valor</th>
                </tr>
              </thead>
              <tbody>
                {itens.map((item: any, idx: number) => (
                  <tr key={item.id || idx} className="border-b border-[#E2E8F0] last:border-0">
                    <td className="py-3 px-4 text-[#0F172A] font-medium">
                      {item.tipo}
                      {(item.quantidade ?? 1) > 1 ? ` (x${item.quantidade})` : ""}
                    </td>
                    <td className="py-3 px-4 text-[#64748B]">{item.descricao || "-"}</td>
                    <td className="py-3 px-4 text-right text-[#0F172A] font-semibold whitespace-nowrap" style={{ fontSize: 16 }}>
                      {fmt(Number(item.valor_final) || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bg-[#1E3A8A] text-white flex justify-between items-center px-4 py-3">
            <span className="font-bold text-sm uppercase tracking-wider">Total</span>
            <span className="font-bold text-lg">{fmt(Number(orc.valor_final) || total)}</span>
          </div>
        </div>

        {/* Payment & notes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg border border-[#E2E8F0] p-5">
            <h3 className="text-xs font-bold text-[#1E3A8A] uppercase tracking-wider mb-2">Forma de Pagamento</h3>
            <p className="text-sm text-[#0F172A]">{formatarPagamento(orc.forma_pagamento)}</p>
          </div>
          {orc.observacoes && (
            <div className="bg-white rounded-lg border border-[#E2E8F0] p-5">
              <h3 className="text-xs font-bold text-[#1E3A8A] uppercase tracking-wider mb-2">Observações</h3>
              <p className="text-sm text-[#64748B]">{orc.observacoes}</p>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 print:hidden">
          <Button
            className="flex-1 h-12 text-base"
            variant="outline"
            onClick={handlePrint}
          >
            <Download className="h-5 w-5 mr-2" />
            Baixar PDF
          </Button>
          {agencia?.telefone && (
            <Button
              className="flex-1 h-12 text-base text-white"
              style={{ backgroundColor: "#25D366" }}
              onClick={handleWhatsApp}
            >
              <MessageCircle className="h-5 w-5 mr-2" />
              Falar com agente
            </Button>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E2E8F0] mt-12 print:mt-4">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 text-center">
          <p className="text-xs text-[#94A3B8]">
            {agencia?.nome_fantasia}
            {agencia?.email ? ` · ${agencia.email}` : ""}
            {agencia?.telefone ? ` · ${agencia.telefone}` : ""}
          </p>
          <p className="text-xs text-[#94A3B8] mt-1">
            Gerado por ViaHub · viahub.com.br
          </p>
        </div>
      </footer>
    </div>
  );
}
