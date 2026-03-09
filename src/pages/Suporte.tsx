import { useState, useRef } from "react";
import { Plus, Paperclip, Loader2, X, FileIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import useAgenciaId from "@/hooks/useAgenciaId";
import { format } from "date-fns";
import { getTicketVisualId } from "@/lib/ticket-utils";
import TicketDetailPanel from "@/components/tickets/TicketDetailPanel";

export default function Suporte() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [assunto, setAssunto] = useState("");
  const [categoria, setCategoria] = useState("");
  const [prioridade, setPrioridade] = useState("");
  const [descricao, setDescricao] = useState("");
  const [anexos, setAnexos] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();
  const agenciaId = useAgenciaId();
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

  const createTicket = useMutation({
    mutationFn: async () => {
      setUploading(true);
      const uploadedUrls: string[] = [];
      for (const file of anexos) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${agenciaId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from("ticket-anexos").upload(fileName, file);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("ticket-anexos").getPublicUrl(fileName);
        uploadedUrls.push(urlData.publicUrl);
      }
      const { error } = await supabase.from("tickets").insert({
        agencia_id: agenciaId,
        assunto,
        categoria,
        prioridade,
        descricao,
        status: "Aberto",
        anexos: uploadedUrls,
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
      toast({ title: "Chamado aberto com sucesso!", description: "Nossa equipe analisará sua solicitação em breve." });
    },
    onError: (error) => {
      setUploading(false);
      toast({ title: "Erro ao abrir chamado", description: "Ocorreu um erro ao tentar enviar sua solicitação.", variant: "destructive" });
      console.error(error);
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
    setAnexos((prev) => [...prev, ...validFiles]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleOpenTicket = (e: React.FormEvent) => {
    e.preventDefault();
    createTicket.mutate();
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      Aberto: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      "Em Andamento": "bg-purple-500/10 text-purple-500 border-purple-500/20",
      "Aguardando Cliente": "bg-amber-500/10 text-amber-500 border-amber-500/20",
      Resolvido: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    };
    return <Badge className={`${map[status] || ""} hover:opacity-80`}>{status}</Badge>;
  };

  const getPriorityBadge = (prioridade: string) => {
    const map: Record<string, string> = {
      Crítica: "bg-red-500/10 text-red-500 border-red-500/20",
      Alta: "bg-orange-500/10 text-orange-500 border-orange-500/20",
      Média: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      Baixa: "bg-slate-500/10 text-slate-500 border-slate-500/20",
    };
    return <Badge className={`${map[prioridade] || ""} hover:opacity-80`}>{prioridade}</Badge>;
  };

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
                <DialogDescription>Descreva o problema ou dúvida. Nossa equipe responderá o mais rápido possível.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="assunto">Assunto</Label>
                  <Input id="assunto" placeholder="Ex: Problema ao enviar orçamento" required value={assunto} onChange={(e) => setAssunto(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Categoria</Label>
                    <Select required value={categoria} onValueChange={setCategoria}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Dúvida">Dúvida</SelectItem>
                        <SelectItem value="Bug / Erro">Bug / Erro</SelectItem>
                        <SelectItem value="Sugestão de Melhoria">Sugestão de Melhoria</SelectItem>
                        <SelectItem value="Financeiro">Financeiro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Prioridade</Label>
                    <Select required value={prioridade} onValueChange={setPrioridade}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
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
                  <Label>Descrição do Problema</Label>
                  <Textarea placeholder="Detalhe o que aconteceu..." className="min-h-[120px]" required value={descricao} onChange={(e) => setDescricao(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label>Anexos (Opcional)</Label>
                  <input ref={fileInputRef} type="file" accept=".png,.jpg,.jpeg,.pdf" multiple onChange={handleFileSelect} className="hidden" />
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => fileInputRef.current?.click()}>
                        <Paperclip className="h-4 w-4" />
                        Anexar Arquivo
                      </Button>
                      <span className="text-xs text-muted-foreground">Máx. 5MB (PNG, JPG, PDF)</span>
                    </div>
                    {anexos.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-1">
                        {anexos.map((file, index) => (
                          <div key={index} className="flex items-center gap-1 bg-muted px-2 py-1 rounded-md text-sm">
                            <FileIcon className="h-3 w-3" />
                            <span className="max-w-[150px] truncate">{file.name}</span>
                            <button type="button" onClick={() => setAnexos((p) => p.filter((_, i) => i !== index))} className="ml-1 hover:text-destructive">
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
              ) : (
                tickets.map((ticket) => (
                  <TableRow key={ticket.id} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setSelectedTicketId(ticket.id)}>
                    <TableCell className="font-medium pl-4 sm:pl-0">{getTicketVisualId(ticket.prioridade, ticket.ticket_number)}</TableCell>
                    <TableCell>{ticket.assunto}</TableCell>
                    <TableCell>{getPriorityBadge(ticket.prioridade)}</TableCell>
                    <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                    <TableCell className="text-right text-muted-foreground pr-4 sm:pr-0">
                      {ticket.criado_em ? format(new Date(ticket.criado_em), "dd/MM/yyyy") : "-"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <TicketDetailPanel ticketId={selectedTicketId} onClose={() => setSelectedTicketId(null)} isSuperadmin={false} />
    </div>
  );
}
