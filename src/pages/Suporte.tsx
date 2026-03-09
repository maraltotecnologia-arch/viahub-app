import { useState, useRef } from "react";
import { LifeBuoy, Plus, Paperclip, Loader2, X, FileIcon, Send, CheckCircle2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import useAgenciaId from "@/hooks/useAgenciaId";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { getTicketVisualId } from "@/lib/ticket-utils";

export default function Suporte() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [assunto, setAssunto] = useState("");
  const [categoria, setCategoria] = useState("");
  const [prioridade, setPrioridade] = useState("");
  const [descricao, setDescricao] = useState("");
  const [anexos, setAnexos] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [novaMensagem, setNovaMensagem] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();
  const agenciaId = useAgenciaId();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["tickets", agenciaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select("*")
        .eq("agencia_id", agenciaId)
        .order("criado_em", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!agenciaId,
  });

  const { data: ticketDetails } = useQuery({
    queryKey: ["ticket-details", selectedTicketId],
    enabled: !!selectedTicketId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select("*")
        .eq("id", selectedTicketId!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: mensagens = [], refetch: refetchMensagens } = useQuery({
    queryKey: ["ticket-mensagens", selectedTicketId],
    enabled: !!selectedTicketId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ticket_mensagens")
        .select(`
          *,
          usuarios(nome, cargo)
        `)
        .eq("ticket_id", selectedTicketId!)
        .order("criado_em", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const createTicket = useMutation({
    mutationFn: async () => {
      setUploading(true);
      
      // Upload files first
      const uploadedUrls: string[] = [];
      for (const file of anexos) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${agenciaId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('ticket-anexos')
          .upload(fileName, file);
        
        if (uploadError) throw uploadError;
        
        const { data: urlData } = supabase.storage
          .from('ticket-anexos')
          .getPublicUrl(fileName);
        
        uploadedUrls.push(urlData.publicUrl);
      }
      
      const { error } = await supabase
        .from("tickets")
        .insert({
          agencia_id: agenciaId,
          assunto,
          categoria,
          prioridade,
          descricao,
          status: "Aberto",
          anexos: uploadedUrls
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      setIsModalOpen(false);
      setAssunto("");
      setCategoria("");
      setPrioridade("");
      setDescricao("");
      setAnexos([]);
      setUploading(false);
      toast({
        title: "Chamado aberto com sucesso!",
        description: "Nossa equipe analisará sua solicitação em breve.",
      });
    },
    onError: (error) => {
      setUploading(false);
      toast({
        title: "Erro ao abrir chamado",
        description: "Ocorreu um erro ao tentar enviar sua solicitação.",
        variant: "destructive",
      });
      console.error(error);
    }
  });

  const enviarMensagem = useMutation({
    mutationFn: async () => {
      if (!novaMensagem.trim() || !user) return;
      
      const { error } = await supabase
        .from("ticket_mensagens")
        .insert({
          ticket_id: selectedTicketId!,
          usuario_id: user.id,
          mensagem: novaMensagem.trim(),
          is_superadmin: false
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      setNovaMensagem("");
      refetchMensagens();
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      toast({ title: "Mensagem enviada!" });
    },
  });

  const marcarResolvido = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("tickets")
        .update({ status: "Resolvido" })
        .eq("id", selectedTicketId!);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["ticket-details"] });
      toast({ title: "Chamado marcado como resolvido!" });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const validFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // Check file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Arquivo muito grande",
          description: `O arquivo ${file.name} excede o limite de 5MB.`,
          variant: "destructive",
        });
        continue;
      }
      // Check file type
      const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        toast({
          title: "Tipo inválido",
          description: `O arquivo ${file.name} não é um tipo permitido (PNG, JPG, PDF).`,
          variant: "destructive",
        });
        continue;
      }
      validFiles.push(file);
    }
    
    setAnexos(prev => [...prev, ...validFiles]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAnexo = (index: number) => {
    setAnexos(prev => prev.filter((_, i) => i !== index));
  };

  const handleOpenTicket = (e: React.FormEvent) => {
    e.preventDefault();
    createTicket.mutate();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Aberto": return <Badge className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-blue-500/20">Aberto</Badge>;
      case "Em Andamento": return <Badge className="bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 border-purple-500/20">Em Andamento</Badge>;
      case "Aguardando Cliente": return <Badge className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border-amber-500/20">Aguardando Cliente</Badge>;
      case "Resolvido": return <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/20">Resolvido</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBadge = (prioridade: string) => {
    switch (prioridade) {
      case "Crítica": return <Badge variant="destructive" className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20">Crítica</Badge>;
      case "Alta": return <Badge className="bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 border-orange-500/20">Alta</Badge>;
      case "Média": return <Badge className="bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 border-yellow-500/20">Média</Badge>;
      case "Baixa": return <Badge className="bg-slate-500/10 text-slate-500 hover:bg-slate-500/20 border-slate-500/20">Baixa</Badge>;
      default: return <Badge variant="outline">{prioridade}</Badge>;
    }
  };

  const isTicketResolved = ticketDetails?.status === "Resolvido";

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Central de Ajuda - Maralto Tecnologia</h1>
          <p className="text-muted-foreground mt-1">Gerencie seus chamados e tire dúvidas com nosso suporte.</p>
        </div>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Chamado
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <form onSubmit={handleOpenTicket}>
              <DialogHeader>
                <DialogTitle>Abrir Novo Chamado</DialogTitle>
                <DialogDescription>
                  Descreva o problema ou dúvida. Nossa equipe responderá o mais rápido possível.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="assunto">Assunto</Label>
                  <Input id="assunto" placeholder="Ex: Problema ao enviar orçamento" required value={assunto} onChange={e => setAssunto(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="categoria">Categoria</Label>
                    <Select required value={categoria} onValueChange={setCategoria}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Dúvida">Dúvida</SelectItem>
                        <SelectItem value="Bug / Erro">Bug / Erro</SelectItem>
                        <SelectItem value="Sugestão de Melhoria">Sugestão de Melhoria</SelectItem>
                        <SelectItem value="Financeiro">Financeiro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="prioridade">Prioridade</Label>
                    <Select required value={prioridade} onValueChange={setPrioridade}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Baixa">Baixa</SelectItem>
                        <SelectItem value="Média">Média</SelectItem>
                        <SelectItem value="Alta">Alta</SelectItem>
                        <SelectItem value="Crítica">Crítica</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="descricao">Descrição do Problema</Label>
                  <Textarea 
                    id="descricao" 
                    placeholder="Detalhe o que aconteceu, onde e como podemos reproduzir..." 
                    className="min-h-[120px]" 
                    required 
                    value={descricao}
                    onChange={e => setDescricao(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Anexos (Opcional)</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".png,.jpg,.jpeg,.pdf"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        className="gap-2"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Paperclip className="h-4 w-4" />
                        Anexar Print/Arquivo
                      </Button>
                      <span className="text-xs text-muted-foreground">Máx. 5MB (PNG, JPG, PDF)</span>
                    </div>
                    {anexos.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {anexos.map((file, index) => (
                          <div 
                            key={index} 
                            className="flex items-center gap-1 bg-muted px-2 py-1 rounded-md text-sm"
                          >
                            <FileIcon className="h-3 w-3" />
                            <span className="max-w-[150px] truncate">{file.name}</span>
                            <button
                              type="button"
                              onClick={() => removeAnexo(index)}
                              className="ml-1 hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={createTicket.isPending || uploading}>
                  {(createTicket.isPending || uploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {uploading ? "Enviando arquivos..." : "Enviar Chamado"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>Histórico de Chamados</CardTitle>
          <CardDescription>Acompanhe o andamento das suas solicitações.</CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px] pl-4 sm:pl-0">ID</TableHead>
                <TableHead>Assunto</TableHead>
                <TableHead className="w-[120px]">Prioridade</TableHead>
                <TableHead className="w-[120px]">Status</TableHead>
                <TableHead className="w-[120px] text-right pr-4 sm:pr-0">Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Carregando chamados...
                  </TableCell>
                </TableRow>
              ) : tickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Nenhum chamado aberto ainda.
                  </TableCell>
                </TableRow>
              ) : tickets.map((ticket) => (
                <TableRow 
                  key={ticket.id} 
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setSelectedTicketId(ticket.id)}
                >
                  <TableCell className="font-medium pl-4 sm:pl-0">
                    {getTicketVisualId(ticket.prioridade, ticket.ticket_number)}
                  </TableCell>
                  <TableCell>{ticket.assunto}</TableCell>
                  <TableCell>{getPriorityBadge(ticket.prioridade)}</TableCell>
                  <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                  <TableCell className="text-right text-muted-foreground pr-4 sm:pr-0">
                    {ticket.criado_em ? format(new Date(ticket.criado_em), "dd/MM/yyyy") : "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Sheet open={!!selectedTicketId} onOpenChange={() => setSelectedTicketId(null)}>
        <SheetContent side="right" className="sm:max-w-[600px] w-full p-0 flex flex-col">
          {ticketDetails && (
            <>
              <SheetHeader className="px-6 py-4 border-b">
                <div className="flex items-center justify-between">
                  <SheetTitle className="text-xl">
                    {getTicketVisualId(ticketDetails.prioridade, ticketDetails.ticket_number)} - {ticketDetails.assunto}
                  </SheetTitle>
                  {getStatusBadge(ticketDetails.status)}
                </div>
                <SheetDescription className="text-left">
                  {ticketDetails.descricao}
                </SheetDescription>
                <div className="flex gap-2 pt-2">
                  {getPriorityBadge(ticketDetails.prioridade)}
                  <Badge variant="outline">{ticketDetails.categoria}</Badge>
                </div>
              </SheetHeader>

              <ScrollArea className="flex-1 px-6 py-4">
                <div className="space-y-4">
                  {mensagens.map((msg: any) => (
                    <div 
                      key={msg.id} 
                      className={`flex ${msg.is_superadmin ? 'justify-start' : 'justify-end'}`}
                    >
                      <div className={`max-w-[80%] rounded-lg p-3 ${
                        msg.is_superadmin 
                          ? 'bg-slate-100 dark:bg-slate-800' 
                          : 'bg-primary/10'
                      }`}>
                        {msg.is_superadmin && (
                          <Badge variant="secondary" className="mb-2 text-xs">Suporte Técnico</Badge>
                        )}
                        <p className="text-sm whitespace-pre-wrap">{msg.mensagem}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {format(new Date(msg.criado_em), "dd/MM/yyyy 'às' HH:mm")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="border-t px-6 py-4">
                {isTicketResolved ? (
                  <div className="flex items-center gap-2 text-muted-foreground justify-center py-2">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-sm">Este chamado foi encerrado.</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Textarea
                        placeholder="Digite sua mensagem..."
                        value={novaMensagem}
                        onChange={(e) => setNovaMensagem(e.target.value)}
                        className="flex-1 min-h-[80px]"
                      />
                    </div>
                    <div className="flex gap-2 justify-between">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => marcarResolvido.mutate()}
                        disabled={marcarResolvido.isPending}
                      >
                        {marcarResolvido.isPending && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                        Marcar como Resolvido
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => enviarMensagem.mutate()}
                        disabled={!novaMensagem.trim() || enviarMensagem.isPending}
                      >
                        {enviarMensagem.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="mr-2 h-4 w-4" />
                        )}
                        Enviar Resposta
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
