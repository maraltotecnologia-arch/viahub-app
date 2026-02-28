import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MarkupConfig {
  id: string;
  tipo: string;
  markup: number;
  taxa: number;
  acrescimoCartao: number;
}

const initial: MarkupConfig[] = [
  { id: "1", tipo: "Aéreo", markup: 12, taxa: 150, acrescimoCartao: 3 },
  { id: "2", tipo: "Hotel", markup: 15, taxa: 0, acrescimoCartao: 3 },
  { id: "3", tipo: "Pacote", markup: 18, taxa: 200, acrescimoCartao: 3.5 },
  { id: "4", tipo: "Seguro", markup: 20, taxa: 0, acrescimoCartao: 2.5 },
  { id: "5", tipo: "Transfer", markup: 10, taxa: 50, acrescimoCartao: 3 },
];

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function ConfigMarkup() {
  const [configs, setConfigs] = useState(initial);
  const [previewCusto] = useState(1000);
  const { toast } = useToast();

  const update = (id: string, field: keyof MarkupConfig, value: number) => {
    setConfigs(configs.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
  };

  const save = (id: string) => {
    const c = configs.find((c) => c.id === id);
    toast({ title: `Markup de ${c?.tipo} salvo!` });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold">Configurações de Markup</h2>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Markup por Tipo de Serviço</CardTitle>
          <p className="text-sm text-muted-foreground">Configure o markup padrão para cada tipo de serviço. Estes valores serão aplicados automaticamente ao criar novos orçamentos.</p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo de Serviço</TableHead>
                <TableHead>Markup %</TableHead>
                <TableHead>Taxa Fixa (R$)</TableHead>
                <TableHead>Acréscimo Cartão %</TableHead>
                <TableHead>Preview (R$ 1.000)</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {configs.map((c) => {
                const preview = previewCusto * (1 + c.markup / 100) + c.taxa;
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.tipo}</TableCell>
                    <TableCell>
                      <Input type="number" min={0} className="w-20" value={c.markup} onChange={(e) => update(c.id, "markup", Number(e.target.value))} />
                    </TableCell>
                    <TableCell>
                      <Input type="number" min={0} className="w-24" value={c.taxa} onChange={(e) => update(c.id, "taxa", Number(e.target.value))} />
                    </TableCell>
                    <TableCell>
                      <Input type="number" min={0} className="w-20" value={c.acrescimoCartao} onChange={(e) => update(c.id, "acrescimoCartao", Number(e.target.value))} />
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-primary">{fmt(preview)}</span>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => save(c.id)}>
                        <Save className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
