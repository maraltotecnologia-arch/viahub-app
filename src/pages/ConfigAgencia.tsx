import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const usuarios = [
  { nome: "João Demo", email: "joao@agencia.com", cargo: "Admin", ativo: true },
  { nome: "Ana Souza", email: "ana@agencia.com", cargo: "Agente", ativo: true },
  { nome: "Pedro Costa", email: "pedro@agencia.com", cargo: "Agente", ativo: false },
];

export default function ConfigAgencia() {
  const { toast } = useToast();

  return (
    <div className="space-y-6 max-w-3xl animate-fade-in">
      <h2 className="text-2xl font-bold">Configurações da Agência</h2>

      <Card>
        <CardHeader><CardTitle className="text-base">Dados da Agência</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Nome Fantasia</Label><Input defaultValue="Agência Demo Viagens" /></div>
            <div className="space-y-2"><Label>CNPJ</Label><Input defaultValue="12.345.678/0001-90" /></div>
            <div className="space-y-2"><Label>Email</Label><Input defaultValue="contato@agenciademo.com" /></div>
            <div className="space-y-2"><Label>Telefone</Label><Input defaultValue="(11) 3333-4444" /></div>
          </div>
          <div className="mt-4 space-y-2">
            <Label>Logo da Agência</Label>
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center text-muted-foreground text-sm">
              Arraste uma imagem ou clique para fazer upload
            </div>
          </div>
          <Button variant="gradient" className="mt-4" onClick={() => toast({ title: "Dados salvos com sucesso!" })}>
            Salvar Alterações
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Usuários da Conta</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usuarios.map((u, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{u.nome}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{u.cargo}</TableCell>
                  <TableCell>
                    <Badge variant={u.ativo ? "success" : "muted"}>
                      {u.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
