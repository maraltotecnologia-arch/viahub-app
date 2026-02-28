import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft } from "lucide-react";

const statusVariant: Record<string, "muted" | "default" | "success" | "destructive" | "info"> = {
  rascunho: "muted", enviado: "default", aprovado: "success", perdido: "destructive", emitido: "info",
};

const orcamentosCliente = [
  { id: "1", titulo: "Lua de mel - Maldivas", valor: "R$ 32.500", status: "enviado", data: "28/02/2026" },
  { id: "9", titulo: "Fim de ano - Dubai", valor: "R$ 41.200", status: "aprovado", data: "15/01/2026" },
  { id: "10", titulo: "Feriado - Buenos Aires", valor: "R$ 5.800", status: "emitido", data: "10/11/2025" },
];

export default function ClienteDetalhe() {
  const { id } = useParams();

  return (
    <div className="space-y-6 max-w-3xl animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild><Link to="/clientes"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <h2 className="text-2xl font-bold">Maria Silva</h2>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Dados Pessoais</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Nome</Label><Input defaultValue="Maria Silva" /></div>
            <div className="space-y-2"><Label>Email</Label><Input defaultValue="maria@email.com" /></div>
            <div className="space-y-2"><Label>Telefone</Label><Input defaultValue="(11) 99999-1111" /></div>
            <div className="space-y-2"><Label>CPF</Label><Input defaultValue="123.456.789-00" /></div>
            <div className="space-y-2"><Label>Passaporte</Label><Input defaultValue="FX123456" /></div>
            <div className="space-y-2"><Label>Data de Nascimento</Label><Input type="date" defaultValue="1990-05-15" /></div>
          </div>
          <div className="mt-4 space-y-2"><Label>Observações</Label><Textarea defaultValue="Prefere viagens de luxo. Alérgica a frutos do mar." /></div>
          <Button variant="gradient" className="mt-4">Salvar Alterações</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Histórico de Orçamentos</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {orcamentosCliente.map((o) => (
              <Link key={o.id} to={`/orcamentos/${o.id}`} className="flex items-center justify-between py-3 border-b last:border-0 hover:bg-muted/50 -mx-2 px-2 rounded-md transition-colors">
                <div>
                  <p className="font-medium text-sm">{o.titulo}</p>
                  <p className="text-xs text-muted-foreground">{o.data}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-sm">{o.valor}</span>
                  <Badge variant={statusVariant[o.status]}>{o.status}</Badge>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
