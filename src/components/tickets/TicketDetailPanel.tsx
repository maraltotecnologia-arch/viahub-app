import { useState, useRef, useEffect } from "react";
import {
  Send, Loader2, CheckCircle2, Paperclip, X, FileIcon,
  Image as ImageIcon, FileText, Download, ChevronDown, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { getTicketVisualId } from "@/lib/ticket-utils";

interface TicketDetailPanelProps {
  ticketId: string | null;
  onClose: () => void;
  isSuperadmin: boolean;
}

export default function TicketDetailPanel({ ticketId, onClose, isSuperadmin }: TicketDetailPanelProps) {
  const [novaMensagem, setNovaMensagem] = useState("");
  const [anexosPendentes, setAnexosPendentes] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [anexosAbertos, setAnexosAbertos] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: ticketDetails } = useQuery({
    queryKey: ["ticket-details", ticketId],
    enabled: !!ticketId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select("*, agencias(nome_fantasia)")
        .eq("id", ticketId!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: mensagens = [], refetch: refetchMensagens } = useQuery({
    queryKey: ["ticket-mensagens", ticketId],
    enabled: !!ticketId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ticket_mensagens")
        .select("*, usuarios(nome, cargo)")
        .eq("ticket_id", ticketId!)
        .order("criado_em", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Realtime subscription for messages
  useEffect(() => {
    if (!ticketId) return;
    const channel = supabase
      .channel(`ticket-msgs-${ticketId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ticket_mensagens", filter: `ticket_id=eq.${ticketId}` },
        () => {
          refetchMensagens();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [ticketId, refetchMensagens]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [mensagens]);

  const updateStatus = useMutation({
    mutationFn: async (status: string) => {
      const { error } = await supabase.from("tickets").update({ status }).eq("id", ticketId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-details", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["admin-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      toast({ title: "Status atualizado!" });
    },
  });

  const enviarMensagem = useMutation({
    mutationFn: async () => {
      if (!novaMensagem.trim() && anexosPendentes.length === 0) return;
      if (!user) return;
      setUploading(true);

      // Upload pending files
      const uploadedUrls: string[] = [];
      for (const file of anexosPendentes) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${ticketId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from("ticket-anexos").upload(fileName, file);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("ticket-anexos").getPublicUrl(fileName);
        uploadedUrls.push(urlData.publicUrl);
      }

      // Build message with attachment references
      let mensagemFinal = novaMensagem.trim();
      if (uploadedUrls.length > 0) {
        const attachmentText = uploadedUrls.map((url, i) => `[Anexo ${i + 1}](${url})`).join("\n");
        mensagemFinal = mensagemFinal ? `${mensagemFinal}\n\n${attachmentText}` : attachmentText;
      }

      if (!mensagemFinal) return;

      const { error } = await supabase.from("ticket_mensagens").insert({
        ticket_id: ticketId!,
        usuario_id: user.id,
        mensagem: mensagemFinal,
        is_superadmin: isSuperadmin,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNovaMensagem("");
      setAnexosPendentes([]);
      setUploading(false);
      refetchMensagens();
      queryClient.invalidateQueries({ queryKey: ["admin-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
    onError: () => {
      setUploading(false);
      toast({ title: "Erro ao enviar mensagem", variant: "destructive" });
    },
  });

  const marcarResolvido = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("tickets").update({ status: "Resolvido" }).eq("id", ticketId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-details", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["admin-tickets"] });
      toast({ title: "Chamado marcado como resolvido!" });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const validFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "Arquivo muito grande", description: `${file.name} excede 5MB.`, variant: "destructive" });
        continue;
      }
      const validTypes = ["image/png", "image/jpeg", "image/jpg", "application/pdf"];
      if (!validTypes.includes(file.type)) {
        toast({ title: "Tipo inválido", description: `${file.name} não é PNG, JPG ou PDF.`, variant: "destructive" });
        continue;
      }
      validFiles.push(file);
    }
    setAnexosPendentes((prev) => [...prev, ...validFiles]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const isResolved = ticketDetails?.status === "Resolvido";
  const ticketAnexos = ticketDetails?.anexos?.filter(Boolean) || [];
  const isImageUrl = (url: string) => /\.(png|jpg|jpeg|gif|webp)(\?.*)?$/i.test(url);
  const getFileName = (url: string) => {
    try { return decodeURIComponent(url.split("/").pop()?.split("?")[0] || "arquivo"); } catch { return "arquivo"; }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { bg: string; text: string }> = {
      "Aberto": { bg: "bg-blue-500/10 border-blue-500/20", text: "text-blue-500" },
      "Em Andamento": { bg: "bg-purple-500/10 border-purple-500/20", text: "text-purple-500" },
      "Aguardando Cliente": { bg: "bg-amber-500/10 border-amber-500/20", text: "text-amber-500" },
      "Resolvido": { bg: "bg-emerald-500/10 border-emerald-500/20", text: "text-emerald-500" },
    };
    const s = map[status];
    return s ? <Badge className={`${s.bg} ${s.text} hover:${s.bg}`}>{status}</Badge> : <Badge variant="outline">{status}</Badge>;
  };

  const getPriorityBadge = (prioridade: string) => {
    const map: Record<string, { bg: string; text: string }> = {
      "Crítica": { bg: "bg-red-500/10 border-red-500/20", text: "text-red-500" },
      "Alta": { bg: "bg-orange-500/10 border-orange-500/20", text: "text-orange-500" },
      "Média": { bg: "bg-yellow-500/10 border-yellow-500/20", text: "text-yellow-500" },
      "Baixa": { bg: "bg-slate-500/10 border-slate-500/20", text: "text-slate-500" },
    };
    const p = map[prioridade];
    return p ? <Badge className={`${p.bg} ${p.text} hover:${p.bg}`}>{prioridade}</Badge> : <Badge variant="outline">{prioridade}</Badge>;
  };

  // Parse attachment links from message text
  const renderMessage = (text: string) => {
    const parts = text.split(/(\[Anexo \d+\]\([^)]+\))/g);
    return parts.map((part, i) => {
      const match = part.match(/\[Anexo (\d+)\]\(([^)]+)\)/);
      if (match) {
        const url = match[2];
        const isImg = isImageUrl(url);
        return (
          <button
            key={i}
            onClick={() => isImg ? setPreviewUrl(url) : window.open(url, "_blank")}
            className="inline-flex items-center gap-1 text-xs mt-1 px-2 py-1 rounded-md bg-background border border-border hover:bg-muted transition-colors"
          >
            {isImg ? <ImageIcon className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
            <span>Anexo {match[1]}</span>
            <ExternalLink className="h-3 w-3 opacity-50" />
          </button>
        );
      }
      return part ? <span key={i} className="whitespace-pre-wrap">{part}</span> : null;
    });
  };

  if (!ticketDetails) return (
    <Sheet open={!!ticketId} onOpenChange={onClose}>
      <SheetContent side="right" className="sm:max-w-[640px] w-full p-0 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </SheetContent>
    </Sheet>
  );

  const visualId = getTicketVisualId(ticketDetails.prioridade, ticketDetails.ticket_number);

  return (
    <>
      <Sheet open={!!ticketId} onOpenChange={onClose}>
        <SheetContent side="right" className="sm:max-w-[640px] w-full p-0 flex flex-col bg-background">
          {/* Premium Header */}
          <div className="px-5 py-4 border-b bg-background space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-semibold text-slate-950 dark:text-slate-50 truncate">
                  {visualId} — {ticketDetails.assunto}
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Agência: {(ticketDetails.agencias as any)?.nome_fantasia || "N/A"}
                  {" · "}
                  {ticketDetails.criado_em && format(new Date(ticketDetails.criado_em), "dd/MM/yyyy 'às' HH:mm")}
                </p>
              </div>
              {isSuperadmin ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="shrink-0 gap-1.5 h-8">
                      {getStatusBadge(ticketDetails.status)}
                      <ChevronDown className="h-3 w-3 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {["Aberto", "Em Andamento", "Aguardando Cliente", "Resolvido"].map((s) => (
                      <DropdownMenuItem key={s} onClick={() => updateStatus.mutate(s)}>
                        Marcar como {s}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                getStatusBadge(ticketDetails.status)
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {getPriorityBadge(ticketDetails.prioridade)}
              <Badge variant="outline" className="text-xs">{ticketDetails.categoria}</Badge>
            </div>
            {ticketDetails.descricao && (
              <p className="text-sm text-muted-foreground leading-relaxed border-t pt-3">
                {ticketDetails.descricao}
              </p>
            )}
          </div>

          {/* Attachments section */}
          {ticketAnexos.length > 0 && (
            <Collapsible open={anexosAbertos} onOpenChange={setAnexosAbertos}>
              <CollapsibleTrigger asChild>
                <button className="w-full flex items-center justify-between px-5 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted/50 border-b transition-colors">
                  <span className="flex items-center gap-2">
                    <Paperclip className="h-3.5 w-3.5" />
                    Arquivos e Evidências ({ticketAnexos.length})
                  </span>
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${anexosAbertos ? "rotate-180" : ""}`} />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-5 py-3 border-b bg-muted/30">
                  <div className="flex flex-wrap gap-2">
                    {ticketAnexos.map((url, i) => {
                      const isImg = isImageUrl(url);
                      return (
                        <button
                          key={i}
                          onClick={() => isImg ? setPreviewUrl(url) : window.open(url, "_blank")}
                          className="group flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm hover:bg-muted transition-colors"
                        >
                          {isImg ? (
                            <img src={url} alt="" className="h-8 w-8 object-cover rounded" />
                          ) : (
                            <FileText className="h-5 w-5 text-muted-foreground" />
                          )}
                          <span className="max-w-[120px] truncate text-xs">{getFileName(url)}</span>
                          <Download className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Chat Area */}
          <ScrollArea className="flex-1 bg-slate-50 dark:bg-slate-900/50" ref={scrollRef as any}>
            <div className="px-5 py-4 space-y-3">
              {mensagens.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-8">
                  Nenhuma mensagem ainda. Envie a primeira resposta.
                </p>
              )}
              {mensagens.map((msg: any) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.is_superadmin ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-4 ${
                      msg.is_superadmin
                        ? "bg-background border border-border shadow-sm"
                        : "bg-primary/10"
                    }`}
                  >
                    {msg.is_superadmin && (
                      <Badge className="mb-2 text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
                        Suporte Técnico
                      </Badge>
                    )}
                    <div className="text-sm leading-relaxed">{renderMessage(msg.mensagem)}</div>
                    <p className="text-[11px] text-muted-foreground mt-2 opacity-70">
                      {msg.usuarios?.nome || "Usuário"} · {format(new Date(msg.criado_em), "dd/MM 'às' HH:mm")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="border-t bg-background px-5 py-3">
            {isResolved ? (
              <div className="flex items-center gap-2 text-muted-foreground justify-center py-3">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm">Este chamado foi encerrado.</span>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Pending files */}
                {anexosPendentes.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {anexosPendentes.map((file, i) => (
                      <div key={i} className="flex items-center gap-1 bg-muted px-2 py-1 rounded-md text-xs">
                        <FileIcon className="h-3 w-3" />
                        <span className="max-w-[100px] truncate">{file.name}</span>
                        <button onClick={() => setAnexosPendentes((p) => p.filter((_, idx) => idx !== i))} className="hover:text-destructive">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-end gap-2">
                  <input ref={fileInputRef} type="file" accept=".png,.jpg,.jpeg,.pdf" multiple onChange={handleFileSelect} className="hidden" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 h-9 w-9 text-muted-foreground hover:text-foreground"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <Textarea
                    placeholder="Digite sua mensagem..."
                    value={novaMensagem}
                    onChange={(e) => setNovaMensagem(e.target.value)}
                    className="flex-1 min-h-[44px] max-h-[120px] resize-none text-sm"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        if (novaMensagem.trim() || anexosPendentes.length > 0) enviarMensagem.mutate();
                      }
                    }}
                  />
                  <Button
                    size="icon"
                    className="shrink-0 h-9 w-9"
                    onClick={() => enviarMensagem.mutate()}
                    disabled={(!novaMensagem.trim() && anexosPendentes.length === 0) || enviarMensagem.isPending || uploading}
                  >
                    {enviarMensagem.isPending || uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {!isSuperadmin && (
                  <div className="flex justify-start">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-muted-foreground h-7"
                      onClick={() => marcarResolvido.mutate()}
                      disabled={marcarResolvido.isPending}
                    >
                      {marcarResolvido.isPending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                      Marcar como Resolvido
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Fullscreen image preview */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-3xl p-2">
          {previewUrl && (
            <img src={previewUrl} alt="Anexo" className="w-full h-auto rounded-lg" />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
