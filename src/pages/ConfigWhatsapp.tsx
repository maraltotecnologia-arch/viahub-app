import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertTriangle, CheckCircle2, MessageCircle, Wifi, WifiOff, ChevronDown, Loader2, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import useAgenciaId from "@/hooks/useAgenciaId";
import ConfirmDialog from "@/components/ConfirmDialog";
import { formatError } from "@/lib/errors";

const QR_POLLING_INTERVAL = 3000;
const QR_TIMEOUT = 3 * 60 * 1000; // 3 minutes
const MENSAGEM_PADRAO = "Olá, {nome_cliente} 😀\n\nO seu orçamento referente a {titulo_orcamento} está pronto. Confira todas os valores e condições abaixo.\n\nAcessando o link, você consegue aprovar o orçamento ou falar novamente com o seu agente. ⬇️\n\n{link_orcamento}\n\nCaso não consiga acessar o link, o anexo em PDF contém todas as informações para você.\n\nQualquer dúvida ficamos à disposição. 🫱🏼‍🫲🏼\nAtenciosamente, {nome_agente}\n{nome_agencia}";

export default function ConfigWhatsapp() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const agenciaId = useAgenciaId();

  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [disconnectConfirm, setDisconnectConfirm] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [forcedDisconnected, setForcedDisconnected] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [savingMsg, setSavingMsg] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollingStartRef = useRef<number>(0);

  // Fetch WhatsApp status
  const { data: wpStatus, isLoading: statusLoading } = useQuery({
    queryKey: ["whatsapp-status", agenciaId],
    enabled: !!agenciaId,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("whatsapp-status-instancia", {
        body: { agencia_id: agenciaId },
      });
      if (error) throw error;
      return data as { status: string; numero?: string; instanceName?: string; qrcode?: string };
    },
  });

  // Fetch agency message template
  const { data: agenciaData } = useQuery({
    queryKey: ["agencia-whatsapp-msg", agenciaId],
    enabled: !!agenciaId,
    queryFn: async () => {
      const { data } = await supabase
        .from("agencias")
        .select("nome_fantasia, whatsapp_mensagem_orcamento")
        .eq("id", agenciaId!)
        .single();
      return data;
    },
  });

  useEffect(() => {
    if (agenciaData) {
      setMensagem((agenciaData as any)?.whatsapp_mensagem_orcamento || MENSAGEM_PADRAO);
    }
  }, [agenciaData]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const startPolling = () => {
    if (pollingRef.current) return;
    pollingStartRef.current = Date.now();

    pollingRef.current = setInterval(async () => {
      if (Date.now() - pollingStartRef.current > QR_TIMEOUT) {
        stopPolling();
        setQrModalOpen(false);
        toast({ title: formatError("WPP006"), variant: "destructive" });
        await supabase.functions.invoke("whatsapp-desconectar", {
          body: { agencia_id: agenciaId },
        });
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke("whatsapp-status-instancia", {
          body: { agencia_id: agenciaId },
        });

        const result = data || (error ? (() => { try { return JSON.parse((error as any)?.message || "{}"); } catch { return null; } })() : null);

        if (result?.status === "connected") {
          stopPolling();
          setQrModalOpen(false);
          setQrCode(null);
          toast({ title: "WhatsApp conectado! ✓" });
          queryClient.invalidateQueries({ queryKey: ["whatsapp-status", agenciaId] });
        } else if (result?.qrcode) {
          const qr = result.qrcode;
          const qrSrc = qr.startsWith("data:") ? qr : `data:image/png;base64,${qr}`;
          setQrCode(qrSrc);
        }
      } catch (_) { /* ignore polling errors */ }
    }, QR_POLLING_INTERVAL);
  };

  const handleConnect = async () => {
    if (!agenciaId || connecting) return;
    setForcedDisconnected(false);
    setConnecting(true);
    setQrCode(null);
    setQrModalOpen(true);
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-criar-instancia", {
        body: { agencia_id: agenciaId },
      });

      let parsed: any = data;
      if (error && !data) {
        try { parsed = JSON.parse((error as any)?.message || "{}"); } catch { parsed = null; }
      }

      if (parsed?.alreadyConnected) {
        toast({ title: "WhatsApp já está conectado!" });
        setQrModalOpen(false);
        queryClient.invalidateQueries({ queryKey: ["whatsapp-status", agenciaId] });
        return;
      }

      if (parsed?.alreadyExists) {
        startPolling();
        return;
      }

      if (error && !parsed?.success) {
        console.error("[handleConnect] Edge function error:", error);
        setQrModalOpen(false);
        toast({ title: "Erro ao conectar WhatsApp. Tente novamente.", variant: "destructive" });
        return;
      }

      startPolling();
    } catch (e) {
      console.error("[handleConnect] Unexpected error:", e);
      setQrModalOpen(false);
      toast({ title: "Erro inesperado ao conectar. Tente novamente.", variant: "destructive" });
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await supabase.functions.invoke("whatsapp-desconectar", {
        body: { agencia_id: agenciaId },
      });

      // Reset local UI immediately (estado limpo)
      stopPolling();
      setQrCode(null);
      setQrModalOpen(false);
      setDisconnectConfirm(false);
      setForcedDisconnected(true);

      // Force clean visual state and clear stale cache
      queryClient.cancelQueries({ queryKey: ["whatsapp-status", agenciaId] });
      queryClient.setQueryData(["whatsapp-status", agenciaId], { status: "disconnected" });
      queryClient.removeQueries({ queryKey: ["whatsapp-status", agenciaId], exact: true });

      toast({ title: "WhatsApp desconectado" });
      navigate(".", { replace: true });
    } catch (_) {
      toast({ title: formatError("WPP005"), variant: "destructive" });
      setDisconnectConfirm(false);
    } finally {
      setDisconnecting(false);
    }
  };

  const handleCancelQr = async () => {
    stopPolling();
    setQrModalOpen(false);
  };

  const handleSaveMessage = async () => {
    setSavingMsg(true);
    const { error } = await supabase
      .from("agencias")
      .update({ whatsapp_mensagem_orcamento: mensagem } as any)
      .eq("id", agenciaId!);

    if (error) {
      toast({ title: "Erro ao salvar mensagem", variant: "destructive" });
    } else {
      toast({ title: "Mensagem salva!" });
      queryClient.invalidateQueries({ queryKey: ["agencia-whatsapp-msg", agenciaId] });
    }
    setSavingMsg(false);
  };

  const formatNumero = (num: string) => {
    if (!num) return "";
    const clean = num.replace(/\D/g, "");
    if (clean.length === 13) return `(${clean.slice(2, 4)}) ${clean.slice(4, 9)}-${clean.slice(9)}`;
    if (clean.length === 12) return `(${clean.slice(2, 4)}) ${clean.slice(4, 8)}-${clean.slice(8)}`;
    return num;
  };

  const previewMsg = mensagem
    .replace(/\{nome_cliente\}/g, "João Silva")
    .replace(/\{numero_orcamento\}/g, "ORC-2026-0001")
    .replace(/\{titulo_orcamento\}/g, "Pacote Maldivas 7 dias")
    .replace(/\{link_orcamento\}/g, "https://viahub.app/orcamento/abc123")
    .replace(/\{nome_agente\}/g, "Carlos")
    .replace(/\{nome_agencia\}/g, agenciaData?.nome_fantasia || "Sua Agência");

  const effectiveStatus = forcedDisconnected ? "disconnected" : wpStatus?.status;
  const isConnected = effectiveStatus === "connected";

  // Block UI until agenciaId + status query resolves
  const initialLoading = !agenciaId || statusLoading;

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <h2 className="text-2xl font-bold flex items-center gap-2 text-foreground">
        <MessageCircle className="h-6 w-6" />
        WhatsApp
      </h2>

      {/* Section A — Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Status da Conexão</CardTitle>
        </CardHeader>
        <CardContent>
          {isConnected ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                  <Wifi className="h-5 w-5 text-green-500" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground flex items-center gap-2">
                    WhatsApp conectado
                    <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Ativo</Badge>
                  </p>
                  {wpStatus?.numero && (
                    <p className="text-sm text-muted-foreground">
                      Número: {formatNumero(wpStatus.numero)}
                    </p>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                className="text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => setDisconnectConfirm(true)}
                disabled={disconnecting}
              >
                <WifiOff className="h-4 w-4 mr-2" />
                {disconnecting ? "Desconectando..." : "Desconectar"}
              </Button>
            </div>
          ) : (
            <div className="text-center py-6 space-y-4">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto">
                <MessageCircle className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <p className="font-semibold text-foreground">WhatsApp não conectado</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Conecte o WhatsApp da sua agência para enviar orçamentos automaticamente para seus clientes
                </p>
              </div>
              <Button onClick={handleConnect} disabled={connecting}>
                {connecting ? "Conectando..." : "Conectar WhatsApp"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Zombie warning — graceful handling for abrupt phone disconnection */}
      {!forcedDisconnected && wpStatus?.status === "disconnected" && (
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardContent className="flex items-start gap-3 py-4">
            <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">Sua conexão com o WhatsApp foi perdida</p>
              <p className="text-sm text-muted-foreground">Isso pode acontecer se o WhatsApp foi desconectado pelo celular. Reconecte para continuar enviando orçamentos.</p>
              <Button size="sm" className="mt-2" onClick={handleConnect} disabled={connecting}>
                {connecting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Reconectando...</> : "Reconectar agora"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section B — Message Template */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mensagem enviada com o orçamento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Textarea
              rows={10}
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value.slice(0, 1000))}
              placeholder="Mensagem padrão do WhatsApp..."
              maxLength={1000}
              className="resize-none font-mono text-sm"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Variáveis: {"{nome_cliente}"} {"{titulo_orcamento}"} {"{link_orcamento}"} {"{nome_agente}"} {"{nome_agencia}"}</span>
              <span>{mensagem.length}/1000</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={handleSaveMessage} disabled={savingMsg}>
              {savingMsg ? "Salvando..." : "Salvar mensagem"}
            </Button>
            <Button variant="outline" onClick={() => setPreviewOpen(true)}>
              <Eye className="h-4 w-4 mr-2" />
              Pré-visualização
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Section C — Info */}
      <Collapsible open={infoOpen} onOpenChange={setInfoOpen}>
        <Card>
          <CardHeader className="pb-3">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-start gap-2 -ml-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <span className="text-base font-semibold">Informações importantes</span>
                <ChevronDown className={`h-4 w-4 ml-auto transition-transform ${infoOpen ? "rotate-180" : ""}`} />
              </Button>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Mantenha o celular com internet ativa</li>
                <li>• Não desconecte o WhatsApp do celular</li>
                <li>• Não use o mesmo número em outro dispositivo</li>
                <li>• O QR Code expira em 60 segundos</li>
                <li>• Em caso de desconexão, reconecte em Configurações → WhatsApp</li>
              </ul>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Preview Modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pré-visualização da Mensagem</DialogTitle>
            <DialogDescription>
              Como o cliente verá a mensagem no WhatsApp
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl p-4 overflow-y-auto max-h-[60vh]" style={{ backgroundColor: "#efeae2", backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d5cfc4' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }}>
            <div className="rounded-lg rounded-tl-none shadow-sm p-4 max-w-[90%]" style={{ backgroundColor: "#E7FFDB" }}>
              <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: "#111B21" }}>{previewMsg}</p>
              <p className="text-right mt-1" style={{ fontSize: "10px", color: "#667781" }}>agora</p>
            </div>
            <div className="rounded-lg rounded-tl-none shadow-sm p-3 mt-2 max-w-[65%] flex items-center gap-3" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E2E8F0" }}>
              <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: "#FEF2F2" }}>
                <svg className="h-5 w-5" style={{ color: "#EF4444" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium truncate" style={{ color: "#334155" }}>orcamento_ORC-2026-0001.pdf</p>
                <p style={{ fontSize: "10px", color: "#94A3B8" }}>PDF · Documento</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* QR Code Modal */}
      <Dialog open={qrModalOpen} onOpenChange={(open) => { if (!open) handleCancelQr(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Conectar WhatsApp</DialogTitle>
            <DialogDescription>
              Escaneie o QR Code com o WhatsApp do celular
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4 py-4">
            {qrCode ? (
              <div className="bg-white p-4 rounded-xl inline-block">
                <img
                  src={qrCode}
                  alt="QR Code WhatsApp"
                  className="max-w-[240px] w-full"
                />
              </div>
            ) : (
              <div className="h-[240px] w-[240px] bg-muted rounded-xl flex flex-col items-center justify-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Gerando QR Code...</p>
              </div>
            )}

            <div className="text-sm text-muted-foreground text-center space-y-1">
              <p>1. Abra o WhatsApp no celular</p>
              <p>2. Toque em ⋮ → Dispositivos conectados</p>
              <p>3. Toque em Conectar dispositivo</p>
              <p>4. Aponte a câmera para o QR Code</p>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-xs text-center" style={{ color: "hsl(var(--warning))" }}>
              O QR Code expira em 60 segundos. Se expirar, feche e tente novamente.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelQr}>Cancelar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disconnect Confirm */}
      <ConfirmDialog
        open={disconnectConfirm}
        onOpenChange={setDisconnectConfirm}
        title="Desconectar WhatsApp?"
        description="Orçamentos automáticos serão desativados até você reconectar."
        confirmLabel="Desconectar"
        variant="destructive"
        onConfirm={handleDisconnect}
      />
    </div>
  );
}
