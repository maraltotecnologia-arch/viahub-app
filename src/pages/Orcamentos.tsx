import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search } from "lucide-react";

const mockOrcamentos = [
  { id: "1", cliente: "Maria Silva", titulo: "Lua de mel - Maldivas", valor: "R$ 32.500,00", status: "enviado", validade: "15/03/2026", criado: "28/02/2026" },
  { id: "2", cliente: "Carlos Souza", titulo: "Família - Orlando", valor: "R$ 18.900,00", status: "aprovado", validade: "10/03/2026", criado: "27/02/2026" },
  { id: "3", cliente: "Ana Costa", titulo: "Negócios - Lisboa", valor: "R$ 8.200,00", status: "rascunho", validade: "05/03/2026", criado: "27/02/2026" },
  { id: "4", cliente: "Pedro Lima", titulo: "Aventura - Patagônia", valor: "R$ 12.800,00", status: "perdido", validade: "01/03/2026", criado: "26/02/2026" },
  { id: "5", cliente: "Lucia Mendes", titulo: "Cruzeiro - Caribe", valor: "R$ 22.400,00", status: "emitido", validade: "20/03/2026", criado: "25/02/2026" },
  { id: "6", cliente: "Roberto Alves", titulo: "Europa - 15 dias", valor: "R$ 45.000,00", status: "enviado", validade: "12/03/2026", criado: "24/02/2026" },
  { id: "7", cliente: "Fernanda Dias", titulo: "Tailândia + Bali", valor: "R$ 28.700,00", status: "rascunho", validade: "08/03/2026", criado: "23/02/2026" },
  { id: "8", cliente: "Marcos Oliveira", titulo: "Ski - Bariloche", valor: "R$ 9.500,00", status: "aprovado", validade: "18/03/2026", criado: "22/02/2026" },
];

const statusVariant: Record<string, "muted" | "default" | "success" | "destructive" | "info"> = {
  rascunho: "muted",
  enviado: "default",
  aprovado: "success",
  perdido: "destructive",
  emitido: "info",
};

export default function Orcamentos() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");

  const filtered = mockOrcamentos.filter((o) => {
    const matchSearch = o.cliente.toLowerCase().includes(search.toLowerCase()) || o.titulo.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "todos" || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Orçamentos</h2>
        <Button variant="gradient" asChild>
          <Link to="/orcamentos/novo">
            <Plus className="h-4 w-4 mr-2" />
            Novo Orçamento
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por cliente ou título..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="rascunho">Rascunho</SelectItem>
                <SelectItem value="enviado">Enviado</SelectItem>
                <SelectItem value="aprovado">Aprovado</SelectItem>
                <SelectItem value="perdido">Perdido</SelectItem>
                <SelectItem value="emitido">Emitido</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Valor Final</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Validade</TableHead>
                <TableHead>Criado em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((o) => (
                <TableRow key={o.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell>
                    <Link to={`/orcamentos/${o.id}`} className="font-medium hover:text-primary">
                      {o.cliente}
                    </Link>
                  </TableCell>
                  <TableCell>{o.titulo}</TableCell>
                  <TableCell className="font-semibold">{o.valor}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[o.status]}>{o.status}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{o.validade}</TableCell>
                  <TableCell className="text-muted-foreground">{o.criado}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
