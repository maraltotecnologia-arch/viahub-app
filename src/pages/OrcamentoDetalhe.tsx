import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Edit, Copy, RefreshCw } from "lucide-react";

const statusVariant: Record<string, "muted" | "default" | "success" | "destructive" | "info"> = {
  rascunho: "muted", enviado: "default", aprovado: "success", perdido: "destructive", emitido: "info",
};

const statusTimeline = [
  { status: "rascunho", data: "25/02/2026 10:30", label: "Criado como rascunho" },
  { status: "enviado", data: "26/02/2026 14:15", label: "Enviado ao cliente" },
  { status: "aprovado", data: "28/02/2026 09:00", label: "Aprovado pelo cliente" },
];

const itens = [
  { tipo: "Aéreo", descricao: "Voo GRU → MLE (ida e volta)", custo: 8500, markup: 12, taxa: 150, final: 9670 },
  { tipo: "Hotel", descricao: "Resort All-Inclusive - 7 noites", custo: 15000, markup: 15, taxa: 0, final: 17250 },
  { tipo: "Seguro", descricao: "Seguro viagem internacional", custo: 800, markup: 20, taxa: 0, final: 960 },
  { tipo: "Transfer", descricao: "Transfers aeroporto + passeios", custo: 2000, markup: 10, taxa: 100, final: 2300 },
];

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function OrcamentoDetalhe() {
  const { id } = useParams();
  const custoTotal = itens.reduce((s, i) => s + i.custo, 0);
  const valorFinal = itens.reduce((s, i) => s + i.final, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild><Link to="/orcamentos"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <h2 className="text-2xl font-bold flex-1">Lua de mel - Maldivas</h2>
        <Badge variant={statusVariant["aprovado"]} className="text-sm px-3 py-1">aprovado</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Informações Gerais</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Cliente:</span> <span className="font-medium ml-1">Maria Silva</span></div>
                <div><span className="text-muted-foreground">Validade:</span> <span className="font-medium ml-1">15/03/2026</span></div>
                <div><span className="text-muted-foreground">Moeda:</span> <span className="font-medium ml-1">BRL</span></div>
                <div><span className="text-muted-foreground">ID:</span> <span className="font-medium ml-1">#{id}</span></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Itens</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {itens.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between py-3 border-b last:border-0">
                    <div>
                      <p className="font-medium text-sm">{item.descricao}</p>
                      <p className="text-xs text-muted-foreground">{item.tipo} • Markup: {item.markup}% • Taxa: {fmt(item.taxa)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{fmt(item.final)}</p>
                      <p className="text-xs text-muted-foreground">Custo: {fmt(item.custo)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/30">
            <CardContent className="pt-6">
              <div className="grid grid-cols-4 gap-4 text-center">
                <div><p className="text-xs text-muted-foreground">Custo Total</p><p className="text-lg font-bold">{fmt(custoTotal)}</p></div>
                <div><p className="text-xs text-muted-foreground">Valor Final</p><p className="text-lg font-bold text-primary">{fmt(valorFinal)}</p></div>
                <div><p className="text-xs text-muted-foreground">Lucro</p><p className="text-lg font-bold text-success">{fmt(valorFinal - custoTotal)}</p></div>
                <div><p className="text-xs text-muted-foreground">Margem</p><p className="text-lg font-bold">{((valorFinal - custoTotal) / custoTotal * 100).toFixed(1)}%</p></div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Ações</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start"><Edit className="h-4 w-4 mr-2" /> Editar</Button>
              <Button variant="outline" className="w-full justify-start"><RefreshCw className="h-4 w-4 mr-2" /> Mudar Status</Button>
              <Button variant="outline" className="w-full justify-start"><Copy className="h-4 w-4 mr-2" /> Duplicar</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Linha do Tempo</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {statusTimeline.map((s, idx) => (
                  <div key={idx} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="h-3 w-3 rounded-full bg-primary" />
                      {idx < statusTimeline.length - 1 && <div className="w-px h-full bg-border" />}
                    </div>
                    <div className="pb-4">
                      <p className="text-sm font-medium">{s.label}</p>
                      <p className="text-xs text-muted-foreground">{s.data}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
