import { useParams } from "react-router-dom";
import { buildServiceDateInfo } from "@/lib/service-dates";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Download,
  MessageCircle,
  CheckCircle2,
  FileX,
  CreditCard,
  FileText,
  Plane,
} from "lucide-react";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

import { formatarApenasDatabrasilia, formatarDataHoraBrasilia } from "@/lib/date-utils";

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
  const queryClient = useQueryClient();
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalName, setApprovalName] = useState("");
  const [approving, setApproving] = useState(false);
  const [approvedInfo, setApprovedInfo] = useState<{ nome: string; data: string } | null>(null);

  // Force light mode on this page
  useEffect(() => {
    const html = document.documentElement;
    const prev = html.classList.contains("dark");
    html.classList.remove("dark");
    html.style.colorScheme = "light";
    return () => {
      if (prev) html.classList.add("dark");
      html.style.colorScheme = "";
    };
  }, []);

  const { data: orc, isLoading } = useQuery({
    queryKey: ["orcamento-publico", token],
    enabled: !!token,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orcamentos")
        .select(`
          *,
          clientes(nome, email, telefone),
          itens_orcamento(*),
          agencias(nome_fantasia, telefone, email, logo_url, cnpj, plano)
        `)
        .eq("token_publico", token!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="space-y-4 w-full max-w-2xl px-6">
          <Skeleton className="h-12 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!orc && !isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 text-center">
        <FileX className="w-16 h-16 text-slate-400 mb-4" />
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Orçamento não encontrado</h1>
        <p className="text-slate-500 mb-6">
          Este link pode ter expirado ou o orçamento foi removido pela agência.
        </p>
        <p className="text-sm text-slate-400">
          Entre em contato com a agência para solicitar um novo link.
        </p>
      </div>
    );
  }

  const agencia = orc.agencias as any;
  const cliente = orc.clientes as any;
  const itens = (orc.itens_orcamento as any[]) || [];
  const total = itens.reduce((s: number, i: any) => s + (Number(i.valor_final) || 0), 0);
  const showStatus = ["aprovado", "emitido"].includes(orc.status || "");
  const canApprove = orc.status === "enviado" && !approvedInfo;

  const handleWhatsApp = () => {
    if (!agencia?.telefone) return;
    const numero = agencia.telefone.replace(/\D/g, "");
    const formatado = numero.startsWith("55") ? numero : `55${numero}`;
    const msg = `Olá! Estou visualizando o orçamento ${orc.numero_orcamento || ""} e gostaria de mais informações.`;
    window.open(`https://wa.me/${formatado}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const handlePrint = () => window.print();

  const handleApprove = async () => {
    const trimmed = approvalName.trim();
    if (!trimmed || trimmed.length < 2) return;
    setApproving(true);
    try {
      const { data, error: invokeErr } = await supabase.functions.invoke("aprovar-orcamento-publico", {
        body: { token: token!, nome: trimmed },
      });

      if (invokeErr) throw invokeErr;
      if (data?.error) throw new Error(data.error);

      setApprovedInfo({ nome: trimmed, data: formatarDataHoraBrasilia(new Date()) });
      setShowApprovalModal(false);
      setApprovalName("");
      queryClient.invalidateQueries({ queryKey: ["orcamento-publico", token] });
    } catch (e) {
      console.error("Erro ao aprovar:", e);
    } finally {
      setApproving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 print:bg-white">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 print:border-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {agencia?.logo_url && (
              <img
                src={agencia.logo_url}
                alt="Logo"
                className="h-10 object-contain"
                crossOrigin="anonymous"
              />
            )}
            <div>
              <h1 className="text-lg font-bold text-slate-900">{agencia?.nome_fantasia || "Agência"}</h1>
              {agencia?.cnpj && <p className="text-xs text-slate-400">CNPJ: {agencia.cnpj}</p>}
            </div>
          </div>
          <div className="text-sm text-slate-500 sm:text-right">
            {agencia?.telefone && <p>{agencia.telefone}</p>}
            {agencia?.email && <p>{agencia.email}</p>}
          </div>
        </div>
      </header>

      {/* Content — 2 column grid on desktop */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Hero */}
        <div className="mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
            {cliente?.nome || "Cliente"}
          </h2>
          {orc.titulo && <p className="text-slate-500 mt-1">{orc.titulo}</p>}
          <p className="text-sm text-slate-400 mt-2">
            Orçamento {orc.numero_orcamento ? `#${orc.numero_orcamento}` : ""}
            {orc.validade && <> · Válido até {fmtDate(orc.validade)}</>}
          </p>
        </div>

        {/* Approval success card */}
        {approvedInfo && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 flex items-start gap-4 mb-6">
            <CheckCircle2 className="h-7 w-7 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-lg font-bold text-emerald-800">Orçamento aprovado!</h3>
              <p className="text-sm text-emerald-700 mt-1">
                Obrigado, {approvedInfo.nome}. Sua aprovação foi registrada em {approvedInfo.data}. Em breve nossa equipe entrará em contato.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column — Services */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-900 text-white">
                      <th className="text-left py-3 px-4 font-semibold text-xs uppercase tracking-wider w-[25%]">Serviço</th>
                      <th className="text-left py-3 px-4 font-semibold text-xs uppercase tracking-wider w-[55%]">Descrição</th>
                      <th className="text-right py-3 px-4 font-semibold text-xs uppercase tracking-wider w-[20%]">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itens.map((item: any, idx: number) => {
                      const dateInfo = buildServiceDateInfo(item);
                      return (
                        <tr key={item.id || idx} className="border-b border-slate-100 last:border-0">
                          <td className="py-3 px-4 text-slate-900 font-medium">
                            {item.tipo}
                            {(item.quantidade ?? 1) > 1 ? ` (x${item.quantidade})` : ""}
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            <div>{item.descricao || "-"}</div>
                            {dateInfo && (
                              <div className="text-xs text-slate-400 mt-1">{dateInfo}</div>
                            )}
                            {item.observacao && (
                              <div className="text-xs text-slate-400 mt-1">{item.observacao}</div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right text-slate-900 font-semibold whitespace-nowrap text-base">
                            {fmt(Number(item.valor_final) || 0)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Taxes note */}
            <p className="text-[10px] text-slate-400 text-right">
              Os valores apresentados já incluem todas as taxas de embarque, turismo e serviço aplicáveis.
            </p>
          </div>

          {/* Right column — Summary & Action */}
          <div className="space-y-5">
            {/* Total card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Total</p>
              <p className="text-3xl font-bold text-blue-600">
                {fmt(Number(orc.valor_final) || total)}
              </p>

              {showStatus && (
                <div className="mt-3">
                  <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${orc.status === "aprovado" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>
                    {orc.status === "aprovado" ? "Aprovado" : "Emitido"}
                  </span>
                </div>
              )}

              {/* Approve button */}
              {canApprove && (
                <button
                  onClick={() => setShowApprovalModal(true)}
                  className="w-full mt-5 h-12 rounded-xl font-semibold text-base text-white flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] print:hidden"
                  style={{
                    background: "linear-gradient(135deg, #2563EB, #06B6D4)",
                  }}
                >
                  <CheckCircle2 className="h-5 w-5" />
                  Aprovar este orçamento
                </button>
              )}
            </div>

            {/* Payment */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="h-4 w-4 text-slate-400" />
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Forma de Pagamento</h3>
              </div>
              <p className="text-sm text-slate-700">{formatarPagamento(orc.forma_pagamento)}</p>
            </div>

            {/* Notes */}
            {orc.observacoes && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-slate-400" />
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Observações</h3>
                </div>
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{orc.observacoes}</p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col gap-3 print:hidden">
              <Button
                className="w-full h-11 text-sm border-slate-200 text-slate-700 hover:bg-slate-50"
                variant="outline"
                onClick={handlePrint}
              >
                <Download className="h-4 w-4 mr-2" />
                Baixar PDF
              </Button>
              {agencia?.telefone && (
                <Button
                  className="w-full h-11 text-sm text-white hover:opacity-90"
                  style={{ backgroundColor: "#25D366" }}
                  onClick={handleWhatsApp}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Falar com agente
                </Button>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 mt-12 print:mt-4">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 text-center">
          <p className="text-[10px] text-slate-400 mb-3">
            Os valores apresentados já incluem todas as taxas de embarque, turismo e serviço aplicáveis.
          </p>
          <p className="text-xs text-slate-400">
            {agencia?.nome_fantasia}
            {agencia?.email ? ` · ${agencia.email}` : ""}
            {agencia?.telefone ? ` · ${agencia.telefone}` : ""}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Gerado por ViaHub · viahub.app
          </p>
          <p className="text-xs text-slate-400 mt-1">
            <a href={`${window.location.origin}/termos`} target="_blank" rel="noopener noreferrer" className="hover:underline">Termos de Uso</a>
            {" · "}
            <a href={`${window.location.origin}/privacidade`} target="_blank" rel="noopener noreferrer" className="hover:underline">Privacidade</a>
          </p>
        </div>
      </footer>

      {/* Approval Modal */}
      <Dialog open={showApprovalModal} onOpenChange={setShowApprovalModal}>
        <DialogContent className="sm:max-w-md bg-white text-slate-900">
          <DialogHeader>
            <DialogTitle className="text-slate-900">Confirmar aprovação</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-500">
            Ao aprovar, você confirma que leu e concorda com os itens e valores descritos neste orçamento.
          </p>
          <div className="space-y-2 mt-2">
            <Label htmlFor="approval-name" className="text-slate-700">Seu nome completo</Label>
            <Input
              id="approval-name"
              placeholder="Digite seu nome para confirmar"
              value={approvalName}
              onChange={(e) => setApprovalName(e.target.value)}
              maxLength={100}
              className="border-slate-200 text-slate-900 placeholder:text-slate-400"
            />
          </div>
          <div className="flex gap-3 mt-4 justify-end">
            <Button variant="ghost" onClick={() => setShowApprovalModal(false)} disabled={approving} className="text-slate-600">
              Cancelar
            </Button>
            <Button
              onClick={handleApprove}
              disabled={approving || approvalName.trim().length < 2}
              style={{ background: "linear-gradient(135deg, #2563EB, #06B6D4)" }}
              className="text-white"
            >
              {approving ? "Aprovando..." : "Confirmar aprovação"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
