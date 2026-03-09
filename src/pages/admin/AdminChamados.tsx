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
import { getTicketVisualId } from "@/lib/ticket-utils";
import TicketDetailPanel from "@/components/tickets/TicketDetailPanel";

export default function AdminChamados() {
  const [filtroStatus, setFiltroStatus] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

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

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["admin-tickets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select("*, agencias(nome_fantasia)")
        .order("criado_em", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("tickets").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["ticket-details"] });
      toast({ title: "Status atualizado!" });
    },
  });

  const ticketsFiltrados = tickets.filter((t) => {
    if (filtroStatus && t.status !== filtroStatus) return false;
    if (busca && !t.assunto.toLowerCase().includes(busca.toLowerCase()) && !(t.agencias as any)?.nome_fantasia?.toLowerCase().includes(busca.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Chamados (Help Desk)</h1>
        <p className="text-muted-foreground mt-1">Gerencie as solicitações de suporte de todas as agências.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Abertos", count: tickets.filter((t) => t.status === "Aberto").length, icon: LifeBuoy, color: "blue" },
          { label: "Críticos", count: tickets.filter((t) => t.prioridade === "Crítica").length, icon: AlertCircle, color: "red" },
          { label: "Em Andamento", count: tickets.filter((t) => t.status === "Em Andamento").length, icon: Clock, color: "amber" },
          { label: "Resolvidos", count: tickets.filter((t) => t.status === "Resolvido").length, icon: CheckCircle2, color: "emerald" },
        ].map(({ label, count, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className={`h-10 w-10 rounded-full bg-${color}-500/10 flex items-center justify-center text-${color}-500`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{label}</p>
                <h3 className="text-2xl font-bold">{count}</h3>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="w-full overflow-hidden">
        <div className="p-4 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex flex-wrap gap-2">
            {[null, "Aberto", "Em Andamento", "Resolvido"].map((s) => (
              <Button key={s || "all"} variant={filtroStatus === s ? "secondary" : "ghost"} size="sm" onClick={() => setFiltroStatus(s)}>
                {s || "Todos"}
              </Button>
            ))}
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar chamado..." className="pl-8 w-full" value={busca} onChange={(e) => setBusca(e.target.value)} />
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
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Carregando chamados...
                  </TableCell>
                </TableRow>
              ) : ticketsFiltrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhum chamado encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                ticketsFiltrados.map((ticket) => (
                  <TableRow key={ticket.id} className="hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => setSelectedTicketId(ticket.id)}>
                    <TableCell className="font-medium pl-4">{getTicketVisualId(ticket.prioridade, ticket.ticket_number)}</TableCell>
                    <TableCell>{(ticket.agencias as any)?.nome_fantasia || "Agência desconhecida"}</TableCell>
                    <TableCell>{ticket.assunto}</TableCell>
                    <TableCell>{getPriorityBadge(ticket.prioridade)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" className="h-8 p-0 px-2 flex items-center gap-2 hover:bg-muted">
                            {getStatusBadge(ticket.status)}
                            <ChevronDown className="h-3 w-3 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          {["Aberto", "Em Andamento", "Aguardando Cliente", "Resolvido"].map((s) => (
                            <DropdownMenuItem key={s} onClick={(e) => { e.stopPropagation(); updateStatus.mutate({ id: ticket.id, status: s }); }}>
                              Marcar como {s}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground pr-4">
                      {ticket.criado_em ? format(new Date(ticket.criado_em), "dd/MM/yyyy") : "-"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <TicketDetailPanel ticketId={selectedTicketId} onClose={() => setSelectedTicketId(null)} isSuperadmin={true} />
    </div>
  );
}
