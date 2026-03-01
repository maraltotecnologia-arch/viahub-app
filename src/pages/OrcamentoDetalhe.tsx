import React from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Copy, Download, Eye, Pencil, Smartphone } from "lucide-react";
import { validarTelefone, getTransicoesPermitidas, isTransicaoPermitida } from "@/lib/validators";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import useAgenciaId from "@/hooks/useAgenciaId";
import { type OrcamentoPDFData } from "@/components/pdf/OrcamentoPreview";
import { useEffect } from "react";

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

const statusVariant: Record<string, "muted" | "default" | "success" | "destructive" | "info"> = {
  rascunho: "muted", enviado: "default", aprovado: "success", perdido: "destructive", emitido: "info",
};

const allStatuses = ["rascunho", "enviado", "aprovado", "perdido", "emitido"];
const statusLabels: Record<string, string> = {
  rascunho: "Rascunho", enviado: "Enviado", aprovado: "Aprovado", perdido: "Perdido", emitido: "Emitido",
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
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const [logoDims, setLogoDims] = useState<{width: number, height: number}>({width: 150, height: 50});

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
        .select("nome_fantasia, email, telefone, logo_url")
        .eq("id", agenciaId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
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
      toast({ title: "Erro ao gerar PDF", variant: "destructive" });
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
    if (error) { toast({ title: "Erro ao atualizar status", variant: "destructive" }); } else {
      toast({ title: `Status alterado para ${newStatus}` });
      queryClient.invalidateQueries({ queryKey: ["orcamento", id] });
      queryClient.invalidateQueries({ queryKey: ["orcamentos"] });
    }
    setChangingStatus(false);
  };

  const handleDuplicate = async () => {
    if (!orc || !agenciaId) return;
    setDuplicating(true);
    const { data: newOrc, error } = await supabase
      .from("orcamentos")
      .insert({
        agencia_id: agenciaId,
        cliente_id: orc.cliente_id,
        usuario_id: user?.id,
        titulo: `${orc.titulo} (cópia)`,
        status: "rascunho",
        valor_custo: orc.valor_custo,
        valor_final: orc.valor_final,
        lucro_bruto: orc.lucro_bruto,
        margem_percentual: orc.margem_percentual,
        moeda: orc.moeda,
        validade: orc.validade,
        observacoes: orc.observacoes,
        forma_pagamento: orc.forma_pagamento,
      })
      .select("id")
      .single();

    if (error || !newOrc) { toast({ title: "Erro ao duplicar", variant: "destructive" }); setDuplicating(false); return; }

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
    toast({ title: "Orçamento duplicado!" });
    setDuplicating(false);
    navigate(`/orcamentos/${newOrc.id}`);
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
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild><Link to="/orcamentos"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold">{orc.titulo || "Sem título"}</h2>
          {(orc as any).numero_orcamento && (
            <p className="text-xs text-muted-foreground">{(orc as any).numero_orcamento}</p>
          )}
        </div>
        <Badge variant={statusVariant[orc.status || "rascunho"]} className="text-sm px-3 py-1">{orc.status}</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Informações Gerais</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Cliente:</span> <span className="font-medium ml-1">{(orc.clientes as any)?.nome || "Sem cliente"}</span></div>
                <div><span className="text-muted-foreground">Validade:</span> <span className="font-medium ml-1">{orc.validade ? new Date(orc.validade).toLocaleDateString("pt-BR") : "-"}</span></div>
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
                {itens?.map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-3 border-b last:border-0">
                    <div>
                      <p className="font-medium text-sm">{item.descricao || item.tipo}</p>
                      <p className="text-xs text-muted-foreground">{item.tipo} • Markup: {item.markup_percentual}% • Taxa: {fmt(Number(item.taxa_fixa) || 0)} • Qtd: {item.quantidade}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{fmt(Number(item.valor_final) || 0)}</p>
                      <p className="text-xs text-muted-foreground">Custo: {fmt(Number(item.valor_custo) || 0)}</p>
                    </div>
                  </div>
                ))}
                {(!itens || itens.length === 0) && <p className="text-sm text-muted-foreground text-center py-4">Nenhum item</p>}
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/30">
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div><p className="text-xs text-muted-foreground">Custo Total</p><p className="text-lg font-bold">{fmt(custoTotal)}</p></div>
                <div><p className="text-xs text-muted-foreground">Valor Final</p><p className="text-lg font-bold text-primary">{fmt(Number(orc.valor_final) || 0)}</p></div>
                <div><p className="text-xs text-muted-foreground">Lucro</p><p className="text-lg font-bold text-success">{fmt(Number(orc.lucro_bruto) || 0)}</p></div>
                <div><p className="text-xs text-muted-foreground">Margem</p><p className="text-lg font-bold">{Number(orc.margem_percentual || 0).toFixed(1)}%</p></div>
              </div>
            </CardContent>
          </Card>

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
                onClick={() => setShowWhatsApp(true)}
              >
                <Smartphone className="h-4 w-4 mr-2" /> Enviar via WhatsApp
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={handleDuplicate} disabled={duplicating}>
                <Copy className="h-4 w-4 mr-2" /> {duplicating ? "Duplicando..." : "Duplicar"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Histórico</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Criado em</span><span>{orc.criado_em ? new Date(orc.criado_em).toLocaleDateString("pt-BR") : "-"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Atualizado em</span><span>{orc.atualizado_em ? new Date(orc.atualizado_em).toLocaleDateString("pt-BR") : "-"}</span></div>
                {(orc as any).enviado_whatsapp && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">📱 Enviado via WhatsApp</span>
                    <span>{(orc as any).enviado_whatsapp_em ? new Date((orc as any).enviado_whatsapp_em).toLocaleString("pt-BR") : "Sim"}</span>
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
      />
    </div>
  );
}
