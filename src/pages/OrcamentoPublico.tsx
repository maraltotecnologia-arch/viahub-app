import { useParams } from "react-router-dom";
import { buildServiceDateInfo } from "@/lib/service-dates";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, MessageCircle, CheckCircle2, FileX, CreditCard, FileText } from "lucide-react";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
import { formatarApenasDatabrasilia, formatarDataHoraBrasilia } from "@/lib/date-utils";
const fmtDate = (d: string | null | undefined) => d ? formatarApenasDatabrasilia(d + "T12:00:00") : "-";
const formatarPagamento = (forma: string | null | undefined) => {
  if (!forma) return "Não informada";
  const m: Record<string, string> = { pix: "PIX", credito: "Crédito", debito: "Débito", avista: "À Vista", a_vista: "À Vista" };
  return m[forma.toLowerCase()] ?? forma;
};

export default function OrcamentoPublico() {
  const { token } = useParams();
  const queryClient = useQueryClient();
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalName, setApprovalName] = useState("");
  const [approving, setApproving] = useState(false);
  const [approvedInfo, setApprovedInfo] = useState<{ nome: string; data: string } | null>(null);

  useEffect(() => {
    const html = document.documentElement;
    const prev = html.classList.contains("dark");
    html.classList.remove("dark");
    html.style.colorScheme = "light";
    return () => { if (prev) html.classList.add("dark"); html.style.colorScheme = ""; };
  }, []);

  const { data: orc, isLoading } = useQuery({
    queryKey: ["orcamento-publico", token], enabled: !!token,
    queryFn: async () => { const { data, error } = await supabase.from("orcamentos").select(`*, clientes(nome, email, telefone), itens_orcamento(*), agencias(nome_fantasia, telefone, email, logo_url, cnpj, plano)`).eq("token_publico", token!).maybeSingle(); if (error) throw error; return data; },
  });

  if (isLoading) return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <div className="space-y-4 w-full max-w-2xl px-6"><Skeleton className="h-12 w-48" /><Skeleton className="h-64 w-full rounded-2xl" /></div>
    </div>
  );

  if (!orc && !isLoading) return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-8 text-center">
      <div className="w-14 h-14 rounded-2xl bg-surface-container-high flex items-center justify-center mb-5"><FileX className="w-7 h-7 text-on-surface-variant/40" /></div>
      <h1 className="text-2xl font-bold font-display tracking-tight text-on-surface mb-2">Orçamento não encontrado</h1>
      <p className="text-sm text-on-surface-variant font-body mb-6 max-w-xs">Este link pode ter expirado ou o orçamento foi removido pela agência.</p>
      <p className="text-xs text-on-surface-variant/60 font-label">Entre em contato com a agência para solicitar um novo link.</p>
    </div>
  );

  if ((orc as any).expirado && orc.status !== "aprovado") {
    const ag = (orc.agencias as any);
    const handleWhatsAppExpirado = () => {
      if (!ag?.telefone) return;
      const phone = ag.telefone.replace(/\D/g, "");
      const msg = encodeURIComponent(`Olá! Gostaria de solicitar um novo orçamento para ${orc.titulo || "viagem"}.`);
      window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
    };
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mb-5">
          <FileX className="w-7 h-7 text-destructive/60" />
        </div>
        <h1 className="text-2xl font-bold font-display tracking-tight text-on-surface mb-2">Orçamento expirado</h1>
        <p className="text-sm text-on-surface-variant font-body mb-6 max-w-xs">
          O prazo de aprovação deste orçamento se encerrou. Entre em contato com a agência para solicitar uma atualização.
        </p>
        {ag?.telefone && (
          <Button onClick={handleWhatsAppExpirado} className="gap-2" style={{ backgroundColor: "#25D366", color: "#fff" }}>
            <MessageCircle className="h-4 w-4" /> Solicitar novo orçamento
          </Button>
        )}
      </div>
    );
  }

  const agencia = orc.agencias as any;
  const cliente = orc.clientes as any;
  const itens = (orc.itens_orcamento as any[]) || [];
  const total = itens.reduce((s: number, i: any) => s + (Number(i.valor_final) || 0), 0);
  const showStatus = ["aprovado", "emitido"].includes(orc.status || "");
  const isExpirado = !!(orc as any).expirado;
  const canApprove = orc.status === "enviado" && !approvedInfo && !isExpirado;

  const handleWhatsApp = () => {
    if (!agencia?.telefone) return;
    const numero = agencia.telefone.replace(/\D/g, "");
    const formatado = numero.startsWith("55") ? numero : `55${numero}`;
    const msg = `Olá! Estou visualizando o orçamento ${orc.numero_orcamento || ""} e gostaria de mais informações.`;
    window.open(`https://wa.me/${formatado}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const handlePrint = () => window.print();

  const handleApprove = async () => {
    const trimmed = approvalName.trim(); if (!trimmed || trimmed.length < 2) return;
    setApproving(true);
    try {
      const { data, error: invokeErr } = await supabase.functions.invoke("aprovar-orcamento-publico", { body: { token: token!, nome: trimmed } });
      if (invokeErr) throw invokeErr; if (data?.error) throw new Error(data.error);
      setApprovedInfo({ nome: trimmed, data: formatarDataHoraBrasilia(new Date()) }); setShowApprovalModal(false); setApprovalName(""); queryClient.invalidateQueries({ queryKey: ["orcamento-publico", token] });
    } catch (e) { console.error("Erro ao aprovar:", e); } finally { setApproving(false); }
  };

  return (
    <div className="min-h-screen bg-surface print:bg-white">
      {/* Header */}
      <header className="bg-surface-container-lowest border-b border-outline-variant/15 print:border-0">
        <div className="max-w-2xl mx-auto px-4 py-5 flex items-center justify-center gap-4">
          {agencia?.logo_url && <img src={agencia.logo_url} alt="Logo" className="h-10 object-contain" crossOrigin="anonymous" />}
          <h1 className="text-lg font-bold font-display text-on-surface">{agencia?.nome_fantasia || "Agência"}</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10">
        {/* Approval success */}
        {approvedInfo && (
          <div className="bg-secondary-container/30 border border-secondary/20 rounded-xl p-5 flex items-start gap-4 mb-6">
            <CheckCircle2 className="h-7 w-7 text-secondary shrink-0 mt-0.5" />
            <div>
              <h3 className="text-lg font-bold font-headline text-secondary">Orçamento aprovado!</h3>
              <p className="text-sm text-secondary/80 font-body mt-1">Obrigado, {approvedInfo.nome}. Sua aprovação foi registrada em {approvedInfo.data}.</p>
            </div>
          </div>
        )}

        {/* Card principal */}
        <div className="bg-surface-container-lowest rounded-2xl p-8 shadow-[0_8px_24px_0_rgba(13,28,45,0.08)]">
          <h2 className="text-2xl font-bold font-display text-on-surface mb-1">{cliente?.nome || "Cliente"}</h2>
          {orc.titulo && <p className="text-on-surface-variant font-body">{orc.titulo}</p>}
          <p className="text-xs text-on-surface-variant/60 font-label mt-2">
            Orçamento {orc.numero_orcamento ? `#${orc.numero_orcamento}` : ""}{orc.validade && <> · Válido até {fmtDate(orc.validade)}</>}
          </p>

          {/* Services table */}
          <div className="mt-6 rounded-xl overflow-hidden border border-outline-variant/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-container-low">
                  <th className="text-left py-3 px-4 text-[11px] font-semibold font-label text-on-surface-variant uppercase tracking-wider">Serviço</th>
                  <th className="text-left py-3 px-4 text-[11px] font-semibold font-label text-on-surface-variant uppercase tracking-wider">Descrição</th>
                  <th className="text-right py-3 px-4 text-[11px] font-semibold font-label text-on-surface-variant uppercase tracking-wider">Valor</th>
                </tr>
              </thead>
              <tbody>
                {itens.map((item: any, idx: number) => {
                  const dateInfo = buildServiceDateInfo(item);
                  return (
                    <tr key={item.id || idx} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="py-3.5 px-4 text-on-surface font-medium">{item.tipo}{(item.quantidade ?? 1) > 1 ? ` (x${item.quantidade})` : ""}</td>
                      <td className="py-3.5 px-4 text-on-surface-variant">
                        <div>{item.descricao || "-"}</div>
                        {dateInfo && <div className="text-xs text-on-surface-variant/60 mt-1">{dateInfo}</div>}
                        {item.observacao && <div className="text-xs text-on-surface-variant/60 mt-1">{item.observacao}</div>}
                      </td>
                      <td className="py-3.5 px-4 text-right text-on-surface font-semibold whitespace-nowrap text-base">{fmt(Number(item.valor_final) || 0)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Total */}
          <div className="bg-surface-container-low rounded-xl py-5 text-center mt-6 mb-6">
            <p className="text-xs font-semibold font-label text-on-surface-variant uppercase tracking-wider mb-1">Total</p>
            <p className="text-4xl font-extrabold font-display text-on-surface">{fmt(Number(orc.valor_final) || total)}</p>
            {showStatus && (
              <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full mt-2 ${orc.status === "aprovado" ? "bg-secondary-container/50 text-secondary" : "bg-primary/10 text-primary"}`}>
                {orc.status === "aprovado" ? "Aprovado" : "Emitido"}
              </span>
            )}
          </div>

          {/* Payment info */}
          <div className="flex items-center gap-2 text-on-surface-variant mb-4">
            <CreditCard className="h-4 w-4" />
            <span className="text-xs font-semibold font-label uppercase tracking-wider">Forma de Pagamento:</span>
            <span className="text-sm font-body text-on-surface">{formatarPagamento(orc.forma_pagamento)}</span>
          </div>

          {orc.observacoes && (
            <div className="mb-6">
              <div className="flex items-center gap-2 text-on-surface-variant mb-2"><FileText className="h-4 w-4" /><span className="text-xs font-semibold font-label uppercase tracking-wider">Observações</span></div>
              <p className="text-sm text-on-surface-variant font-body whitespace-pre-wrap">{orc.observacoes}</p>
            </div>
          )}

          {/* Approve button */}
          {canApprove && (
            <Button onClick={() => setShowApprovalModal(true)} className="w-full py-4 text-base rounded-xl mt-8">
              <CheckCircle2 className="h-5 w-5 mr-2" />
              Aprovar este orçamento
            </Button>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-3 mt-6 print:hidden">
            <Button variant="outline" onClick={handlePrint} className="w-full"><Download className="h-4 w-4 mr-2" />Baixar PDF</Button>
            {agencia?.telefone && (
              <Button onClick={handleWhatsApp} className="w-full text-white" style={{ backgroundColor: "#25D366" }}>
                <MessageCircle className="h-4 w-4 mr-2" />Falar com agente
              </Button>
            )}
          </div>
        </div>

        <p className="text-[10px] text-on-surface-variant/40 text-center mt-6 font-label">
          Os valores apresentados já incluem todas as taxas aplicáveis.
        </p>
      </main>

      {/* Footer */}
      <footer className="border-t border-outline-variant/10 mt-12 print:mt-4">
        <div className="max-w-2xl mx-auto px-4 py-6 text-center">
          <p className="text-xs text-on-surface-variant/60 font-label">{agencia?.nome_fantasia}{agencia?.email ? ` · ${agencia.email}` : ""}{agencia?.telefone ? ` · ${agencia.telefone}` : ""}</p>
          <p className="text-xs text-on-surface-variant/40 font-label mt-1">Gerado por ViaHub · viahub.app</p>
        </div>
      </footer>

      {/* Approval Modal */}
      <Dialog open={showApprovalModal} onOpenChange={setShowApprovalModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="font-headline text-on-surface">Confirmar aprovação</DialogTitle></DialogHeader>
          <p className="text-sm text-on-surface-variant font-body">Ao aprovar, você confirma que leu e concorda com os itens e valores descritos neste orçamento.</p>
          <div className="space-y-1.5 mt-2">
            <Label htmlFor="approval-name" className="text-xs font-medium font-label text-on-surface-variant uppercase tracking-wide">Seu nome completo</Label>
            <Input id="approval-name" placeholder="Digite seu nome para confirmar" value={approvalName} onChange={(e) => setApprovalName(e.target.value)} maxLength={100} />
          </div>
          <div className="flex gap-3 mt-4 justify-end">
            <Button variant="ghost" onClick={() => setShowApprovalModal(false)} disabled={approving}>Cancelar</Button>
            <Button onClick={handleApprove} disabled={approving || approvalName.trim().length < 2}>{approving ? "Aprovando..." : "Confirmar aprovação"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
