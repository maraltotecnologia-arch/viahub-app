import { useState } from "react";
import { Search, AlertCircle, CheckCircle2, Clock, LifeBuoy, Loader2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function AdminChamados() {
  const [filtroStatus, setFiltroStatus] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

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

  const ticketsFiltrados = filtroStatus 
    ? MOCK_TICKETS.filter(t => t.status === filtroStatus)
    : MOCK_TICKETS;

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Chamados (Help Desk)</h1>
        <p className="text-muted-foreground mt-1">Gerencie as solicitações de suporte de todas as agências.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
              <LifeBuoy className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Abertos</p>
              <h3 className="text-2xl font-bold">12</h3>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Críticos</p>
              <h3 className="text-2xl font-bold">2</h3>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Em Análise</p>
              <h3 className="text-2xl font-bold">5</h3>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Resolvidos (Hoje)</p>
              <h3 className="text-2xl font-bold">8</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="w-full overflow-hidden">
        <div className="p-4 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex flex-wrap gap-2">
            <Button 
              variant={filtroStatus === null ? "secondary" : "ghost"} 
              size="sm"
              onClick={() => setFiltroStatus(null)}
            >
              Todos
            </Button>
            <Button 
              variant={filtroStatus === "Aberto" ? "secondary" : "ghost"} 
              size="sm"
              onClick={() => setFiltroStatus("Aberto")}
            >
              Abertos
            </Button>
            <Button 
              variant={filtroStatus === "Em Análise" ? "secondary" : "ghost"} 
              size="sm"
              onClick={() => setFiltroStatus("Em Análise")}
            >
              Pendentes
            </Button>
            <Button 
              variant={filtroStatus === "Resolvido" ? "secondary" : "ghost"} 
              size="sm"
              onClick={() => setFiltroStatus("Resolvido")}
            >
              Resolvidos
            </Button>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar chamado..." className="pl-8 w-full" />
          </div>
        </div>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px] pl-4">ID</TableHead>
                <TableHead>Agência</TableHead>
                <TableHead>Assunto</TableHead>
                <TableHead className="w-[120px]">Prioridade</TableHead>
                <TableHead className="w-[120px]">Status</TableHead>
                <TableHead className="w-[120px] text-right pr-4">Abertura</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ticketsFiltrados.map((ticket) => (
                <TableRow key={ticket.id} className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <TableCell className="font-medium pl-4">{ticket.id}</TableCell>
                  <TableCell>{ticket.agencia}</TableCell>
                  <TableCell>{ticket.assunto}</TableCell>
                  <TableCell>{getPriorityBadge(ticket.prioridade)}</TableCell>
                  <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                  <TableCell className="text-right text-muted-foreground pr-4">{ticket.data}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}