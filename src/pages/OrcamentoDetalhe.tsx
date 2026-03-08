import React from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, BookmarkPlus, Copy, Download, Eye, Pencil, Smartphone, Clock, MessageCircle, ChevronDown, History, Link2, CheckCheck, UserCheck } from "lucide-react";
import { validarTelefone, getTransicoesPermitidas, isTransicaoPermitida } from "@/lib/validators";
import { maskTelefone } from "@/lib/masks";
import { calcularDiasUteis, type HorarioFuncionamento, DEFAULT_HORARIO } from "@/lib/business-days";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import StatusBadge from "@/components/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import useAgenciaId from "@/hooks/useAgenciaId";
import { type OrcamentoPDFData } from "@/components/pdf/OrcamentoPreview";
import { useEffect } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";

const getImageDimensions = (url: string): Promise<{width: number, height: number}> => {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({ width: 150, height: 50 });
    img.src = url;
  });
};
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { pdf, PDFViewer } from "@react-pdf/renderer";
import OrcamentoPDFDocument from "@/components/pdf/OrcamentoPDFDocument";
import WhatsAppModal from "@/components/whatsapp/WhatsAppModal";
import HistoricoOrcamento from "@/components/orcamento/HistoricoOrcamento";
import NotasInternas from "@/components/orcamento/NotasInternas";
import { registrarHistorico } from "@/lib/historico-orcamento";
import { formatarApenasDatabrasilia, formatarDataHoraBrasilia } from "@/lib/date-utils";
import { isMargemZero, calcularLucroReal, getTaxaEmbutida } from "@/lib/profit-utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { formatError } from "@/lib/errors";

const statusVariant: Record<string, "muted" | "default" | "success" | "destructive" | "info"> = {
  rascunho: "muted", enviado: "default", aprovado: "success", perdido: "destructive", emitido: "info", pago: "success",
};

const allStatuses = ["rascunho", "enviado", "aprovado", "perdido", "emitido", "pago"];
const statusLabels: Record<string, string> = {
  rascunho: "Rascunho", enviado: "Enviado", aprovado: "Aprovado", perdido: "Perdido", emitido: "Emitido", pago: "Pago",
};
const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function OrcamentoDetalhe() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const agenciaId = useAgenciaId();
  const [changingStatus, setChangingStatus] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [showDuplicateConfirm, setShowDuplicateConfirm] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const [logoDims, setLogoDims] = useState<{width: number, height: number}>({width: 150, height: 50});
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateNome, setTemplateNome] = useState("");
  const [templateDescricao, setTemplateDescricao] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [showPagoConfirm, setShowPagoConfirm] = useState(false);
  const [markingPago, setMarkingPago] = useState(false);
  const [sendingEvolution, setSendingEvolution] = useState(false);
  const [showEvolutionModal, setShowEvolutionModal] = useState(false);
  const [evolutionPhone, setEvolutionPhone] = useState("");

  // Collapsible state with localStorage persistence
  const [historicoOpen, setHistoricoOpen] = useState(() => {
    const stored = localStorage.getItem(`orc-historico-${id}`);
    return stored !== null ? stored === "true" : true;
  });
  const [notasOpen, setNotasOpen] = useState(() => {
    const stored = localStorage.getItem(`orc-notas-${id}`);
    return stored !== null ? stored === "true" : true;
  });

  const toggleHistorico = (open: boolean) => {
    setHistoricoOpen(open);
    localStorage.setItem(`orc-historico-${id}`, String(open));
  };
  const toggleNotas = (open: boolean) => {
    setNotasOpen(open);
    localStorage.setItem(`orc-notas-${id}`, String(open));
  };

  const { data: orc, isLoading } = useQuery({
    queryKey: ["orcamento", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orcamentos")
        .select("*, clientes(nome, email, telefone)")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: itens } = useQuery({
    queryKey: ["orcamento-itens", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itens_orcamento")
        .select("*")
        .eq("orcamento_id", id!);
      if (error) throw error;
      return data;
    },
  });

  const { data: agencia } = useQuery({
    queryKey: ["agencia", agenciaId],
    enabled: !!agenciaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agencias")
        .select("nome_fantasia, email, telefone, logo_url, horario_funcionamento, plano, whatsapp_mensagem_orcamento")
        .eq("id", agenciaId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  // Auto-generate token_publico if missing
  useEffect(() => {
    if (orc && !orc.token_publico) {
      const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      supabase
        .from('orcamentos')
        .update({ token_publico: token })
        .eq('id', orc.id)
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ['orcamento', id] });
        });
    }
  }, [orc, id, queryClient]);

  useEffect(() => {
    if (agencia?.logo_url) {
      getImageDimensions(agencia.logo_url).then((dims) => {
        const maxH = 50, maxW = 150;
        const ratio = Math.min(maxW / dims.width, maxH / dims.height);
        setLogoDims({ width: Math.round(dims.width * ratio), height: Math.round(dims.height * ratio) });
      });
    }
  }, [agencia?.logo_url]);

  const buildPdfData = (): OrcamentoPDFData | null => {
    if (!orc || !agencia) return null;
    return {
      orcamento: orc,
      cliente: (orc.clientes as any) ?? null,
      itens: (itens ?? []).map((i) => ({
        tipo: i.tipo,
        descricao: i.descricao,
        valor_final: i.valor_final,
        quantidade: i.quantidade,
      })),
      agencia,
      logoDims,
    };
  };

  const handleDownloadPdf = async () => {
    const pdfData = buildPdfData();
    if (!pdfData) { toast({ title: "Dados incompletos para gerar PDF", variant: "destructive" }); return; }
    setGeneratingPdf(true);
    try {
      const blob = await pdf(<OrcamentoPDFDocument data={pdfData} />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const clienteName = (orc?.clientes as any)?.nome || "Cliente";
      const numero = (orc as any)?.numero_orcamento || "ORC";
      link.href = url;
      link.download = `${numero} ${clienteName}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      toast({ title: "PDF gerado com sucesso!" });
    } catch (e) {
      console.error("Erro ao gerar PDF:", e);
      toast({ title: formatError("ORC006"), variant: "destructive" });
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!id || !orc) return;
    const currentStatus = orc.status || "rascunho";
    if (!isTransicaoPermitida(currentStatus, newStatus)) {
      toast({ title: `Não é possível alterar o status de ${currentStatus} para ${newStatus}`, variant: "destructive" });
      return;
    }
    setChangingStatus(true);
    const { error } = await supabase.from("orcamentos").update({ status: newStatus }).eq("id", id);
    if (error) { toast({ title: formatError("ORC002"), variant: "destructive" }); } else {
      toast({ title: `Status alterado para ${newStatus}` });
      if (user && agenciaId) {
        await registrarHistorico({
          orcamento_id: id,
          usuario_id: user.id,
          agencia_id: agenciaId,
          tipo: "status_alterado",
          status_anterior: currentStatus,
          status_novo: newStatus,
          descricao: `Status alterado de ${statusLabels[currentStatus] || currentStatus} para ${statusLabels[newStatus] || newStatus}`,
        });
        queryClient.invalidateQueries({ queryKey: ["historico-orcamento", id] });
      }
      queryClient.invalidateQueries({ queryKey: ["orcamento", id] });
      queryClient.invalidateQueries({ queryKey: ["orcamentos"] });
    }
    setChangingStatus(false);
  };

  const handleMarcarPago = async () => {
    if (!id || !orc) return;
    setMarkingPago(true);
    const { error } = await supabase.from("orcamentos").update({ status: "pago", pago_em: new Date().toISOString() } as any).eq("id", id);
    if (error) {
      toast({ title: formatError("ORC002"), variant: "destructive" });
    } else {
      if (user && agenciaId) {
        await registrarHistorico({
          orcamento_id: id,
          usuario_id: user.id,
          agencia_id: agenciaId,
          tipo: "status_alterado",
          status_anterior: "emitido",
          status_novo: "pago",
          descricao: "Pagamento confirmado",
        });
        queryClient.invalidateQueries({ queryKey: ["historico-orcamento", id] });
      }
      queryClient.invalidateQueries({ queryKey: ["orcamento", id] });
      queryClient.invalidateQueries({ queryKey: ["orcamentos"] });
      queryClient.invalidateQueries({ queryKey: ["admin-comissoes-orcamentos"] });
      queryClient.invalidateQueries({ queryKey: ["superadmin-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      toast({ title: "Pagamento registrado com sucesso!" });
    }
    setMarkingPago(false);
    setShowPagoConfirm(false);
  };

  const handleDuplicate = async () => {
    if (!orc || !agenciaId) return;
    setDuplicating(true);

    // Generate sequential number
    const year = new Date().getFullYear();
    const { count } = await supabase
      .from("orcamentos")
      .select("id", { count: "exact", head: true })
      .eq("agencia_id", agenciaId!);
    const seq = String((count ?? 0) + 1).padStart(4, "0");
    const numero_orcamento = `ORC-${year}-${seq}`;

    const gerarToken = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const { data: newOrc, error } = await supabase
      .from("orcamentos")
      .insert({
        agencia_id: agenciaId,
        cliente_id: orc.cliente_id,
        usuario_id: user?.id,
        titulo: `${orc.titulo || "Orçamento"} (cópia)`,
        numero_orcamento,
        status: "rascunho",
        valor_custo: orc.valor_custo,
        valor_final: orc.valor_final,
        lucro_bruto: orc.lucro_bruto,
        margem_percentual: orc.margem_percentual,
        moeda: orc.moeda,
        validade: null,
        observacoes: orc.observacoes,
        forma_pagamento: orc.forma_pagamento,
        token_publico: gerarToken(),
      })
      .select("id")
      .single();

    if (error || !newOrc) { toast({ title: formatError("ORC007"), variant: "destructive" }); setDuplicating(false); return; }

    if (itens && itens.length > 0) {
      const newItens = itens.map((i) => ({
        orcamento_id: newOrc.id,
        tipo: i.tipo,
        descricao: i.descricao,
        valor_custo: i.valor_custo,
        markup_percentual: i.markup_percentual,
        taxa_fixa: i.taxa_fixa,
        valor_final: i.valor_final,
        quantidade: i.quantidade,
        detalhes: i.detalhes,
      }));
      await supabase.from("itens_orcamento").insert(newItens);
    }

    queryClient.invalidateQueries({ queryKey: ["orcamentos"] });

    // Register history on the NEW quote
    if (user) {
      await registrarHistorico({
        orcamento_id: newOrc.id,
        usuario_id: user.id,
        agencia_id: agenciaId,
        tipo: "duplicado",
        descricao: `Orçamento duplicado de ${(orc as any).numero_orcamento || orc.titulo || ""}`,
      });
    }

    toast({ title: "Orçamento duplicado com sucesso!" });
    setDuplicating(false);
    setShowDuplicateConfirm(false);
    navigate(`/orcamentos/${newOrc.id}/editar`);
  };

  const handleSaveTemplate = async () => {
    if (!templateNome.trim()) {
      toast({ title: "Informe o nome do template", variant: "destructive" });
      return;
    }
    if (!agenciaId || !itens || itens.length === 0) return;
    setSavingTemplate(true);

    const { data: tpl, error } = await supabase
      .from("templates_orcamento")
      .insert({
        agencia_id: agenciaId,
        nome: templateNome.trim(),
        descricao: templateDescricao.trim() || null,
        forma_pagamento: orc?.forma_pagamento || null,
        observacoes: orc?.observacoes || null,
      })
      .select("id")
      .single();

    if (error || !tpl) {
      toast({ title: "Erro ao salvar template", variant: "destructive" });
      setSavingTemplate(false);
      return;
    }

    const tplItens = itens.map((i) => ({
      template_id: tpl.id,
      tipo: i.tipo,
      descricao: i.descricao,
      valor_custo: i.valor_custo,
      markup_percentual: i.markup_percentual,
      taxa_fixa: i.taxa_fixa,
      valor_final: i.valor_final,
      quantidade: i.quantidade,
    }));
    await supabase.from("itens_template").insert(tplItens);

    queryClient.invalidateQueries({ queryKey: ["templates"] });
    toast({ title: "Template salvo com sucesso!" });
    setSavingTemplate(false);
    setShowSaveTemplate(false);
    setTemplateNome("");
    setTemplateDescricao("");
  };

  const handleWhatsAppSend = async (telefone: string, mensagem: string, gerarPdf: boolean) => {
    if (!validarTelefone(telefone)) {
      toast({ title: "Número de WhatsApp inválido. Digite DDD + número (ex: 54999999999)", variant: "destructive" });
      return;
    }
    const numero = telefone.replace(/\D/g, '');
    const numeroFormatado = numero.startsWith('55') ? numero : `55${numero}`;
    if (gerarPdf) {
      await handleDownloadPdf();
      await new Promise(r => setTimeout(r, 1000));
    }
    window.open(`https://wa.me/${numeroFormatado}?text=${encodeURIComponent(mensagem)}`, '_blank');
    const updates: Record<string, any> = { enviado_whatsapp: true, enviado_whatsapp_em: new Date().toISOString() };
    if (orc?.status === 'rascunho') updates.status = 'enviado';
    await supabase.from('orcamentos').update(updates).eq('id', id!);

    // Register history
    if (user && agenciaId) {
      await registrarHistorico({
        orcamento_id: id!,
        usuario_id: user.id,
        agencia_id: agenciaId,
        tipo: "enviado_whatsapp",
        descricao: "Orçamento enviado via WhatsApp",
      });
      if (orc?.status === 'rascunho') {
        await registrarHistorico({
          orcamento_id: id!,
          usuario_id: user.id,
          agencia_id: agenciaId,
          tipo: "status_alterado",
          status_anterior: "rascunho",
          status_novo: "enviado",
          descricao: "Status alterado de Rascunho para Enviado",
        });
      }
      queryClient.invalidateQueries({ queryKey: ["historico-orcamento", id] });
    }

    queryClient.invalidateQueries({ queryKey: ["orcamento", id] });
    queryClient.invalidateQueries({ queryKey: ["orcamentos"] });
    toast({ title: updates.status === 'enviado' ? "Enviado via WhatsApp! Status atualizado para Enviado." : "Enviado via WhatsApp!" });
    setShowWhatsApp(false);
  };

  if (isLoading) return (
    <div className="space-y-6"><Skeleton className="h-8 w-64" /><Skeleton className="h-64 w-full" /></div>
  );

  if (!orc) return (
    <div className="text-center py-12">
      <p className="text-muted-foreground">Orçamento não encontrado</p>
      <Button variant="link" asChild><Link to="/orcamentos">Voltar</Link></Button>
    </div>
  );

  const custoTotal = itens?.reduce((s, i) => s + (Number(i.valor_custo) || 0) * (i.quantidade || 1), 0) ?? 0;
  const valorFinal = itens?.reduce((s, i) => s + (Number(i.valor_final) || 0), 0) ?? 0;
  const pdfData = buildPdfData();

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Follow-up reminder */}
      {orc.status === "enviado" && orc.enviado_whatsapp_em && (() => {
        const horario: HorarioFuncionamento =
          (agencia?.horario_funcionamento as unknown as HorarioFuncionamento) || DEFAULT_HORARIO;
        const diasUteis = calcularDiasUteis(new Date(orc.enviado_whatsapp_em), horario);
        if (diasUteis < 1) return null;
        const dias = Math.ceil((new Date().getTime() - new Date(orc.enviado_whatsapp_em).getTime()) / 86400000);
        return (
          <Card className="border-l-4" style={{ borderLeftColor: "#F59E0B", backgroundColor: "#FFFBEB" }}>
            <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 py-4">
              <p className="text-sm flex items-center gap-2"><Clock className="h-4 w-4 text-warning shrink-0" /> Este orçamento foi enviado há <strong>{dias} dias</strong> sem resposta. Que tal fazer um follow-up?</p>
              <Button
                size="sm"
                className="text-white shrink-0"
                style={{ backgroundColor: "#25D366" }}
                onClick={() => setShowWhatsApp(true)}
              >
                Enviar Follow-up WhatsApp
              </Button>
            </CardContent>
          </Card>
        );
      })()}

      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild><Link to="/orcamentos"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold">{orc.titulo || "Sem título"}</h2>
          {(orc as any).numero_orcamento && (
            <p className="text-xs text-muted-foreground">{(orc as any).numero_orcamento}</p>
          )}
        </div>
        <StatusBadge status={orc.status || "rascunho"} />
      </div>

      {/* Client approval badge */}
      {(orc as any).aprovado_pelo_cliente_nome && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground -mt-4">
          <UserCheck className="h-4 w-4 text-green-600 shrink-0" />
          <span>
            ✓ Aprovado pelo cliente: <strong>{(orc as any).aprovado_pelo_cliente_nome}</strong>
            {(orc as any).aprovado_pelo_cliente_em && (
              <> em {formatarDataHoraBrasilia((orc as any).aprovado_pelo_cliente_em)}</>
            )}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Informações Gerais</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Cliente:</span> <span className="font-medium ml-1">{(orc.clientes as any)?.nome || "Sem cliente"}</span></div>
                <div><span className="text-muted-foreground">Validade:</span> <span className="font-medium ml-1">{orc.validade ? formatarApenasDatabrasilia(orc.validade + "T12:00:00") : "-"}</span></div>
                <div><span className="text-muted-foreground">Moeda:</span> <span className="font-medium ml-1">{orc.moeda}</span></div>
                <div><span className="text-muted-foreground">Pagamento:</span> <span className="font-medium ml-1">{orc.forma_pagamento}</span></div>
              </div>
              {orc.observacoes && <p className="text-sm text-muted-foreground mt-3 border-t pt-3">{orc.observacoes}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Itens</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {itens?.map((item) => {
                  const markup = Number(item.markup_percentual) || 0;
                  const taxaFixa = Number(item.taxa_fixa) || 0;
                  const detalhes: string[] = [item.tipo];
                  if (markup > 0) { detalhes.push(`Markup: ${markup}%`); } else { detalhes.push("Sem markup"); }
                  if (taxaFixa > 0) { detalhes.push(`Taxa: ${fmt(taxaFixa)}`); }
                  detalhes.push(`Qtd: ${item.quantidade}`);
                  return (
                  <div key={item.id} className="flex items-center justify-between py-3 border-b last:border-0">
                    <div>
                      <p className="font-medium text-sm">{item.descricao || item.tipo}</p>
                      <p className="text-xs text-muted-foreground">{detalhes.join(" • ")}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{fmt(Number(item.valor_final) || 0)}</p>
                      <p className="text-xs text-muted-foreground">Custo: {fmt(Number(item.valor_custo) || 0)}</p>
                    </div>
                  </div>
                  );
                })}
                {(!itens || itens.length === 0) && <p className="text-sm text-muted-foreground text-center py-4">Nenhum item</p>}
              </div>
            </CardContent>
          </Card>

          {(() => {
            const vf = Number(orc.valor_final) || 0;
            const lucroReal = Math.max(vf - custoTotal, 0);
            const margemReal = custoTotal > 0 ? (lucroReal / custoTotal) * 100 : 0;
            return (
              <>
                <Card className="border-primary/30">
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                      <div><p className="text-xs text-muted-foreground">Custo Total</p><p className="text-lg font-bold">{fmt(custoTotal)}</p></div>
                      <div><p className="text-xs text-muted-foreground">Valor Final</p><p className="text-lg font-bold text-primary">{fmt(vf)}</p></div>
                      <div><p className="text-xs text-muted-foreground">Lucro</p><p className="text-lg font-bold text-success">{fmt(lucroReal)}</p></div>
                      <div><p className="text-xs text-muted-foreground">Margem</p><p className="text-lg font-bold">{margemReal.toFixed(1)}%</p></div>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-3 text-left">
                      Os valores apresentados já incluem todas as taxas de embarque, turismo e serviço aplicáveis.
                    </p>
                  </CardContent>
                </Card>

                {/* Zero-margin warning — internal only */}
                {itens && itens.length > 0 && isMargemZero(itens) && (
                  <Alert variant="default" className="border-warning/50 bg-warning/10">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    <AlertDescription className="text-sm text-warning">
                      Este orçamento está com margem 0 de lucro. O valor será repassado integralmente ao fornecedor.
                    </AlertDescription>
                  </Alert>
                )}
              </>
            );
          })()}

          {/* PDF Preview */}
          <Collapsible open={showPreview} onOpenChange={setShowPreview}>
            <Card>
              <CardHeader className="pb-3">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-start gap-2 -ml-2">
                    <Eye className="h-4 w-4" />
                    <span className="text-base font-semibold">
                      {showPreview ? "Fechar Preview" : "Visualizar PDF"}
                    </span>
                  </Button>
                </CollapsibleTrigger>
              </CardHeader>
              <CollapsibleContent>
                <CardContent>
                  {pdfData ? (
                    <PDFViewer
                      style={{
                        width: "100%",
                        height: 600,
                        border: "1px solid #E5E7EB",
                        borderRadius: 8,
                      }}
                      showToolbar={false}
                    >
                      <OrcamentoPDFDocument data={pdfData} />
                    </PDFViewer>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">Carregando dados...</p>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Histórico */}
          <Collapsible open={historicoOpen} onOpenChange={toggleHistorico}>
            <Card>
              <CardHeader className="pb-3">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-start gap-2 -ml-2">
                    <History className="h-4 w-4" />
                    <span className="text-base font-semibold">Histórico</span>
                    <ChevronDown className={`h-4 w-4 ml-auto transition-transform ${historicoOpen ? "rotate-180" : ""}`} />
                  </Button>
                </CollapsibleTrigger>
              </CardHeader>
              <CollapsibleContent>
                <CardContent>
                  <HistoricoOrcamento orcamentoId={id!} />
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Notas Internas */}
          <Collapsible open={notasOpen} onOpenChange={toggleNotas}>
            <Card>
              <CardHeader className="pb-3">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-start gap-2 -ml-2">
                    <MessageCircle className="h-4 w-4" />
                    <span className="text-base font-semibold">Notas Internas</span>
                    <ChevronDown className={`h-4 w-4 ml-auto transition-transform ${notasOpen ? "rotate-180" : ""}`} />
                  </Button>
                </CollapsibleTrigger>
              </CardHeader>
              <CollapsibleContent>
                <CardContent>
                  <NotasInternas orcamentoId={id!} />
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Ações</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Mudar Status</p>
              {(() => {
                const currentStatus = orc.status || "rascunho";
                const permitidas = getTransicoesPermitidas(currentStatus);
                return (
                  <Select value={currentStatus} onValueChange={handleStatusChange} disabled={changingStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={currentStatus}>{statusLabels[currentStatus] || currentStatus}</SelectItem>
                      {allStatuses.filter(s => s !== currentStatus).map((s) => (
                        <SelectItem key={s} value={s} disabled={!permitidas.includes(s)} className={!permitidas.includes(s) ? "opacity-40 cursor-not-allowed" : ""}>
                          {statusLabels[s] || s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                );
              })()}
              </div>
              {["rascunho", "enviado"].includes(orc.status || "") ? (
                <Button variant="outline" className="w-full justify-start" onClick={() => navigate(`/orcamentos/${id}/editar`)}>
                  <Pencil className="h-4 w-4 mr-2" /> Editar
                </Button>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="w-full">
                      <Button variant="outline" className="w-full justify-start" disabled>
                        <Pencil className="h-4 w-4 mr-2" /> Editar
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>Não é possível editar orçamentos com status {orc.status}</TooltipContent>
                </Tooltip>
              )}
              <Button variant="outline" className="w-full justify-start" onClick={handleDownloadPdf} disabled={generatingPdf}>
                <Download className="h-4 w-4 mr-2" /> {generatingPdf ? "Gerando PDF..." : "Baixar PDF"}
              </Button>
              <Button
                className="w-full justify-start text-white"
                style={{ backgroundColor: "#25D366" }}
                onClick={async () => {
                  // Check Evolution API connection
                  try {
                    const { data } = await supabase.functions.invoke("whatsapp-status-instancia", {
                      body: { agencia_id: agenciaId },
                    });
                    if (data?.status === "connected") {
                      setEvolutionPhone((orc.clientes as any)?.telefone?.replace(/\D/g, "") || "");
                      setShowEvolutionModal(true);
                      return;
                    }
                  } catch (_) { /* fallback to wa.me */ }

                  // Fallback: wa.me
                  setShowWhatsApp(true);
                  if (!sessionStorage.getItem("viahub_wpp_tip")) {
                    sessionStorage.setItem("viahub_wpp_tip", "1");
                    toast({ title: "💡 Configure o WhatsApp automático em Configurações → WhatsApp para enviar sem abrir o celular." });
                  }
                }}
              >
                <Smartphone className="h-4 w-4 mr-2" /> Enviar via WhatsApp
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => setShowDuplicateConfirm(true)} disabled={duplicating}>
                <Copy className="h-4 w-4 mr-2" /> {duplicating ? "Duplicando..." : "Duplicar"}
              </Button>
              {orc.status === "emitido" && (
                <Button
                  variant="outline"
                  className="w-full justify-start border-success/50 text-success hover:bg-success/10"
                  onClick={() => setShowPagoConfirm(true)}
                  disabled={markingPago}
                >
                  <CheckCheck className="h-4 w-4 mr-2" /> {markingPago ? "Processando..." : "✓ Marcar como Pago"}
                </Button>
              )}
              <Button variant="outline" className="w-full justify-start" onClick={() => setShowSaveTemplate(true)}>
                <BookmarkPlus className="h-4 w-4 mr-2" /> Salvar como Template
              </Button>
              {(orc as any).token_publico && (
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    const link = `${window.location.origin}/orcamento/${(orc as any).token_publico}`;
                    navigator.clipboard.writeText(link);
                    toast({ title: "Link copiado! Compartilhe com seu cliente." });
                  }}
                >
                  <Link2 className="h-4 w-4 mr-2" /> Copiar Link Público
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Histórico</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Criado em</span><span>{orc.criado_em ? formatarApenasDatabrasilia(orc.criado_em) : "-"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Atualizado em</span><span>{orc.atualizado_em ? formatarApenasDatabrasilia(orc.atualizado_em) : "-"}</span></div>
                {(orc as any).enviado_whatsapp && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground flex items-center gap-1.5"><MessageCircle className="h-3.5 w-3.5 text-success" /> Enviado via WhatsApp</span>
                    <span>{(orc as any).enviado_whatsapp_em ? formatarDataHoraBrasilia((orc as any).enviado_whatsapp_em) : "Sim"}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <WhatsAppModal
        open={showWhatsApp}
        onOpenChange={setShowWhatsApp}
        clienteNome={(orc.clientes as any)?.nome || "Cliente"}
        clienteTelefone={(orc.clientes as any)?.telefone || ""}
        numeroOrcamento={(orc as any).numero_orcamento || ""}
        validade={orc.validade}
        valorTotal={Number(orc.valor_final) || 0}
        agenciaNome={agencia?.nome_fantasia || ""}
        onSend={handleWhatsAppSend}
        followUpMode={orc.status === "enviado" && orc.enviado_whatsapp_em ? calcularDiasUteis(new Date(orc.enviado_whatsapp_em), (agencia?.horario_funcionamento as unknown as HorarioFuncionamento) || DEFAULT_HORARIO) >= 1 : false}
      />

      {/* Evolution API WhatsApp Modal */}
      <Dialog open={showEvolutionModal} onOpenChange={setShowEvolutionModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-[#25D366]">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Enviar Orçamento por WhatsApp
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="evo-phone">Número do destinatário</Label>
              <Input
                id="evo-phone"
                placeholder="(11) 99999-9999"
                value={maskTelefone(evolutionPhone)}
                onChange={(e) => setEvolutionPhone(e.target.value.replace(/\D/g, ""))}
              />
              <p className="text-xs text-muted-foreground">DDD + número (ex: 11999999999)</p>
            </div>

            <div className="bg-muted rounded-lg p-3 text-sm text-foreground">
              <p className="text-xs font-medium text-muted-foreground mb-1">Mensagem que será enviada:</p>
              <p className="whitespace-pre-wrap">
                {((agencia as any)?.whatsapp_mensagem_orcamento || "Olá, {nome_cliente} 😀\n\nO seu orçamento referente a {titulo_orcamento} está pronto.\n\n{link_orcamento}\n\nAtenciosamente, {nome_agente}\n{nome_agencia}")
                  .replace(/\{nome_cliente\}/g, (orc.clientes as any)?.nome || "Cliente")
                  .replace(/\{numero_orcamento\}/g, (orc as any).numero_orcamento || "")
                  .replace(/\{titulo_orcamento\}/g, (orc as any).titulo || "sua viagem")
                  .replace(/\{link_orcamento\}/g, orc.token_publico ? `${window.location.origin}/orcamento/${orc.token_publico}` : "")
                  .replace(/\{nome_agente\}/g, usuarioNome || "nossa equipe")
                  .replace(/\{nome_agencia\}/g, agencia?.nome_fantasia || "")
                }
              </p>
            </div>

            <p className="text-xs text-muted-foreground flex items-center gap-1">
              📄 O PDF do orçamento será anexado automaticamente
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEvolutionModal(false)} disabled={sendingEvolution}>
              Cancelar
            </Button>
            <Button
              className="text-white"
              style={{ backgroundColor: "#25D366" }}
              disabled={sendingEvolution || evolutionPhone.replace(/\D/g, "").length < 10}
              onClick={async () => {
                setSendingEvolution(true);
                try {
                  // Generate PDF as Base64 on the client
                  let pdf_base64: string | null = null;
                  const pdfDataForSend = buildPdfData();
                  if (pdfDataForSend) {
                    try {
                      const pdfBlob = await pdf(<OrcamentoPDFDocument data={pdfDataForSend} />).toBlob();
                      const arrayBuffer = await pdfBlob.arrayBuffer();
                      const uint8 = new Uint8Array(arrayBuffer);
                      let binary = '';
                      for (let i = 0; i < uint8.byteLength; i++) {
                        binary += String.fromCharCode(uint8[i]);
                      }
                      pdf_base64 = btoa(binary);
                    } catch (pdfErr) {
                      console.warn("Erro ao gerar PDF no frontend:", pdfErr);
                    }
                  }

                  const linkOrcamento = orc.token_publico
                    ? `${window.location.origin}/orcamento/${orc.token_publico}`
                    : "";

                  const { data, error } = await supabase.functions.invoke("whatsapp-enviar-orcamento", {
                    body: {
                      orcamento_id: id,
                      agencia_id: agenciaId,
                      telefone_destino: evolutionPhone,
                      pdf_base64,
                      link_orcamento: linkOrcamento,
                      nome_agente: usuarioNome || "",
                    },
                  });

                  // supabase.functions.invoke puts non-2xx responses in error
                  const result = data || (error ? (() => { try { return JSON.parse((error as any)?.message || "{}"); } catch { return null; } })() : null);

                  if (result?.code) {
                    if (result.code === "WPP001") {
                      toast({ title: "WhatsApp desconectado. Reconecte em Configurações → WhatsApp (WPP001)", variant: "destructive" });
                    } else if (result.code === "WPP004") {
                      toast({ title: "Número de telefone inválido", variant: "destructive" });
                      setSendingEvolution(false);
                      return;
                    } else {
                      toast({ title: formatError(result.code), variant: "destructive" });
                    }
                    setShowEvolutionModal(false);
                  } else if (result?.success) {
                    toast({ title: "Orçamento enviado pelo WhatsApp! ✓" });
                    if (result.pdfFailed) {
                      toast({ title: "Mensagem enviada, mas o PDF não pôde ser anexado. (WPP003)", variant: "default" });
                    }
                    setShowEvolutionModal(false);
                    queryClient.invalidateQueries({ queryKey: ["orcamento", id] });
                    queryClient.invalidateQueries({ queryKey: ["orcamentos"] });
                    queryClient.invalidateQueries({ queryKey: ["historico-orcamento", id] });
                  } else if (error) {
                    throw error;
                  }
                } catch (e) {
                  toast({ title: formatError("WPP003"), variant: "destructive" });
                }
                setSendingEvolution(false);
              }}
            >
              {sendingEvolution ? "Enviando..." : "Enviar WhatsApp ✓"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={showPagoConfirm}
        onOpenChange={setShowPagoConfirm}
        title="Confirmar pagamento recebido?"
        description="Esta ação não pode ser desfeita. O orçamento será marcado como pago."
        confirmLabel="Confirmar Pagamento"
        variant="default"
        onConfirm={handleMarcarPago}
      />

      <ConfirmDialog
        open={showDuplicateConfirm}
        onOpenChange={setShowDuplicateConfirm}
        title="Duplicar orçamento"
        description={`Deseja duplicar o orçamento ${(orc as any).numero_orcamento || orc.titulo || ""}? Um novo orçamento será criado como rascunho com os mesmos itens e cliente.`}
        confirmLabel="Duplicar"
        variant="default"
        onConfirm={handleDuplicate}
      />

      <Dialog open={showSaveTemplate} onOpenChange={setShowSaveTemplate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Salvar como Template</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Nome do template *</Label>
              <Input
                value={templateNome}
                onChange={(e) => setTemplateNome(e.target.value)}
                placeholder="Ex: Pacote Lua de Mel, Viagem Corporativa SP-RJ"
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Textarea
                value={templateDescricao}
                onChange={(e) => setTemplateDescricao(e.target.value)}
                placeholder="Descrição do template..."
              />
            </div>
            <Button variant="gradient" className="w-full" onClick={handleSaveTemplate} disabled={savingTemplate}>
              {savingTemplate ? "Salvando..." : "Salvar Template"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
