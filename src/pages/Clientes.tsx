import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const mockClientes = [
  { id: "1", nome: "Maria Silva", email: "maria@email.com", telefone: "(11) 99999-1111", orcamentos: 3, criado: "10/01/2026" },
  { id: "2", nome: "Carlos Souza", email: "carlos@email.com", telefone: "(21) 99888-2222", orcamentos: 2, criado: "15/01/2026" },
  { id: "3", nome: "Ana Costa", email: "ana@email.com", telefone: "(31) 97777-3333", orcamentos: 1, criado: "20/01/2026" },
  { id: "4", nome: "Pedro Lima", email: "pedro@email.com", telefone: "(41) 96666-4444", orcamentos: 4, criado: "05/02/2026" },
  { id: "5", nome: "Lucia Mendes", email: "lucia@email.com", telefone: "(51) 95555-5555", orcamentos: 2, criado: "12/02/2026" },
  { id: "6", nome: "Roberto Alves", email: "roberto@email.com", telefone: "(61) 94444-6666", orcamentos: 1, criado: "18/02/2026" },
  { id: "7", nome: "Fernanda Dias", email: "fernanda@email.com", telefone: "(71) 93333-7777", orcamentos: 1, criado: "22/02/2026" },
  { id: "8", nome: "Marcos Oliveira", email: "marcos@email.com", telefone: "(81) 92222-8888", orcamentos: 1, criado: "25/02/2026" },
];

export default function Clientes() {
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  const filtered = mockClientes.filter(
    (c) => c.nome.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Clientes</h2>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="gradient"><Plus className="h-4 w-4 mr-2" /> Novo Cliente</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo Cliente</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2"><Label>Nome</Label><Input placeholder="Nome completo" /></div>
              <div className="space-y-2"><Label>Email</Label><Input type="email" placeholder="email@exemplo.com" /></div>
              <div className="space-y-2"><Label>Telefone</Label><Input placeholder="(00) 00000-0000" /></div>
              <div className="space-y-2"><Label>CPF</Label><Input placeholder="000.000.000-00" /></div>
              <Button variant="gradient" className="w-full" onClick={() => toast({ title: "Cliente criado com sucesso!" })}>
                Salvar Cliente
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por nome ou email..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Orçamentos</TableHead>
                <TableHead>Cadastro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell>
                    <Link to={`/clientes/${c.id}`} className="font-medium hover:text-primary">{c.nome}</Link>
                  </TableCell>
                  <TableCell>{c.email}</TableCell>
                  <TableCell>{c.telefone}</TableCell>
                  <TableCell className="font-semibold">{c.orcamentos}</TableCell>
                  <TableCell className="text-muted-foreground">{c.criado}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
