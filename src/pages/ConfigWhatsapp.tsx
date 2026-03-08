import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertTriangle, CheckCircle2, MessageCircle, Wifi, WifiOff, ChevronDown, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import useAgenciaId from "@/hooks/useAgenciaId";
import ConfirmDialog from "@/components/ConfirmDialog";
import { formatError } from "@/lib/errors";

const QR_POLLING_INTERVAL = 3000;
const QR_TIMEOUT = 3 * 60 * 1000; // 3 minutes

export default function ConfigWhatsapp() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const agenciaId = useAgenciaId();

  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [disconnectConfirm, setDisconnectConfirm] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [savingMsg, setSavingMsg] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

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
      setMensagem((agenciaData as any)?.whatsapp_mensagem_orcamento || "");
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
        // Cleanup instance
        await supabase.functions.invoke("whatsapp-desconectar", {
          body: { agencia_id: agenciaId },
        });
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke("whatsapp-status-instancia", {
          body: { agencia_id: agenciaId },
        });

        // supabase.functions.invoke may return data in error for non-2xx
        const result = data || (error ? (() => { try { return JSON.parse((error as any)?.message || "{}"); } catch { return null; } })() : null);
        
        console.log("[polling] status result:", result?.status, "has qrcode:", !!result?.qrcode);

        if (result?.status === "connected") {
          stopPolling();
          setQrModalOpen(false);
          setQrCode(null);
          toast({ title: "WhatsApp conectado! ✓" });
          queryClient.invalidateQueries({ queryKey: ["whatsapp-status", agenciaId] });
        } else if (result?.qrcode) {
          const qr = result.qrcode;
          // Ensure proper data URI format
          const qrSrc = qr.startsWith("data:") ? qr : `data:image/png;base64,${qr}`;
          setQrCode(qrSrc);
        }
      } catch (_) { /* ignore polling errors */ }
    }, QR_POLLING_INTERVAL);
  };

  const handleConnect = async () => {
    if (connecting) return;
    setConnecting(true);
    setQrCode(null);
    setQrModalOpen(true);
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-criar-instancia", {
        body: { agencia_id: agenciaId },
      });

      if (error) {
        let parsed: any = null;
        try { parsed = JSON.parse((error as any)?.message || "{}"); } catch {}
        if (parsed?.alreadyConnected) {
          toast({ title: "WhatsApp já está conectado!" });
          queryClient.invalidateQueries({ queryKey: ["whatsapp-status", agenciaId] });
          return;
        }
        throw error;
      }

      if (data?.alreadyConnected) {
        toast({ title: "WhatsApp já está conectado!" });
        queryClient.invalidateQueries({ queryKey: ["whatsapp-status", agenciaId] });
        return;
      }

      // Modal já aberto para feedback imediato; polling buscará o QR
      startPolling();
    } catch (e) {
      toast({ title: formatError("WPP002"), variant: "destructive" });
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
      toast({ title: "WhatsApp desconectado" });
      queryClient.invalidateQueries({ queryKey: ["whatsapp-status", agenciaId] });
    } catch (_) {
      toast({ title: formatError("WPP005"), variant: "destructive" });
    } finally {
      setDisconnecting(false);
      setDisconnectConfirm(false);
    }
  };

  const handleCancelQr = async () => {
    stopPolling();
    setQrModalOpen(false);
    await supabase.functions.invoke("whatsapp-desconectar", {
      body: { agencia_id: agenciaId },
    });
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
    if (clean.length === 13) {
      return `(${clean.slice(2, 4)}) ${clean.slice(4, 9)}-${clean.slice(9)}`;
    }
    if (clean.length === 12) {
      return `(${clean.slice(2, 4)}) ${clean.slice(4, 8)}-${clean.slice(8)}`;
    }
    return num;
  };

  const previewMsg = mensagem
    .replace(/\{nome_cliente\}/g, "João Silva")
    .replace(/\{numero_orcamento\}/g, "ORC-2026-0001")
    .replace(/\{titulo_orcamento\}/g, "Pacote Maldivas 7 dias")
    .replace(/\{link_orcamento\}/g, "https://viahub.app/orcamento/abc123")
    .replace(/\{nome_agente\}/g, "Carlos")
    .replace(/\{nome_agencia\}/g, agenciaData?.nome_fantasia || "Sua Agência");

  const isConnected = wpStatus?.status === "connected";
  const isDisconnected = !wpStatus || wpStatus.status === "not_configured" || wpStatus.status === "disconnected";

  if (statusLoading) {
    return (
      <div className="space-y-6 animate-fade-in-up">
        <h2 className="text-2xl font-bold">WhatsApp</h2>
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <h2 className="text-2xl font-bold flex items-center gap-2">
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

      {/* Zombie warning */}
      {wpStatus?.status === "disconnected" && (
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardContent className="flex items-start gap-3 py-4">
            <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">Sua conexão com o WhatsApp foi perdida</p>
              <p className="text-sm text-muted-foreground">Reconecte para continuar enviando orçamentos.</p>
              <Button size="sm" className="mt-2" onClick={handleConnect} disabled={connecting}>
                Reconectar agora
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
              rows={4}
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value.slice(0, 1000))}
              placeholder="Mensagem padrão do WhatsApp..."
              maxLength={1000}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Variáveis: {"{nome_cliente}"} {"{titulo_orcamento}"} {"{link_orcamento}"} {"{nome_agente}"} {"{nome_agencia}"}</span>
              <span>{mensagem.length}/1000</span>
            </div>
          </div>

          {/* Preview */}
          <div className="bg-muted rounded-lg p-4 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Pré-visualização</p>
            <p className="text-sm text-foreground whitespace-pre-wrap">{previewMsg}</p>
          </div>

          <Button onClick={handleSaveMessage} disabled={savingMsg}>
            {savingMsg ? "Salvando..." : "Salvar mensagem"}
          </Button>
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

            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-xs text-yellow-600 dark:text-yellow-400 text-center">
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
