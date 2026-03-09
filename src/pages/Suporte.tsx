import { useState } from "react";
import { LifeBuoy, Plus, Paperclip } from "lucide-react";
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

const MOCK_TICKETS = [
  { id: "TKT-1024", assunto: "Dúvida sobre configuração de markup", status: "Resolvido", prioridade: "Baixa", data: "10/10/2023" },
  { id: "TKT-1029", assunto: "Erro ao gerar PDF de orçamento", status: "Aberto", prioridade: "Alta", data: "12/10/2023" },
  { id: "TKT-1035", assunto: "Sugestão: Integração com novo fornecedor", status: "Em Análise", prioridade: "Média", data: "15/10/2023" },
];

export default function Suporte() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();

  const handleOpenTicket = (e: React.FormEvent) => {
    e.preventDefault();
    setIsModalOpen(false);
    toast({
      title: "Chamado aberto com sucesso!",
      description: "Nossa equipe analisará sua solicitação em breve.",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Aberto": return <Badge className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-blue-500/20">Aberto</Badge>;
      case "Em Análise": return <Badge className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border-amber-500/20">Em Análise</Badge>;
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
                  <Input id="assunto" placeholder="Ex: Problema ao enviar orçamento" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="categoria">Categoria</Label>
                    <Select required>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="duvida">Dúvida</SelectItem>
                        <SelectItem value="bug">Bug / Erro</SelectItem>
                        <SelectItem value="melhoria">Sugestão de Melhoria</SelectItem>
                        <SelectItem value="financeiro">Financeiro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="prioridade">Prioridade</Label>
                    <Select required>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="baixa">Baixa</SelectItem>
                        <SelectItem value="media">Média</SelectItem>
                        <SelectItem value="alta">Alta</SelectItem>
                        <SelectItem value="critica">Crítica</SelectItem>
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
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Anexos (Opcional)</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Button type="button" variant="outline" size="sm" className="gap-2">
                      <Paperclip className="h-4 w-4" />
                      Anexar Print/Arquivo
                    </Button>
                    <span className="text-xs text-muted-foreground">Máx. 5MB (PNG, JPG, PDF)</span>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                <Button type="submit">Enviar Chamado</Button>
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
              {MOCK_TICKETS.map((ticket) => (
                <TableRow key={ticket.id} className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <TableCell className="font-medium pl-4 sm:pl-0">{ticket.id}</TableCell>
                  <TableCell>{ticket.assunto}</TableCell>
                  <TableCell>{getPriorityBadge(ticket.prioridade)}</TableCell>
                  <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                  <TableCell className="text-right text-muted-foreground pr-4 sm:pr-0">{ticket.data}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}