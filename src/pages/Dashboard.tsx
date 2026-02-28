import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, DollarSign, TrendingUp, Percent } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Link } from "react-router-dom";

const metrics = [
  { title: "Orçamentos no mês", value: "47", icon: FileText, change: "+12%" },
  { title: "Valor total orçado", value: "R$ 284.500", icon: DollarSign, change: "+8%" },
  { title: "Taxa de conversão", value: "32%", icon: Percent, change: "+5%" },
  { title: "Comissão total", value: "R$ 18.320", icon: TrendingUp, change: "+15%" },
];

const chartData = [
  { name: "Rascunho", total: 12 },
  { name: "Enviado", total: 18 },
  { name: "Aprovado", total: 8 },
  { name: "Perdido", total: 5 },
  { name: "Emitido", total: 4 },
];

const recentOrcamentos = [
  { id: "1", cliente: "Maria Silva", titulo: "Lua de mel - Maldivas", valor: "R$ 32.500", status: "enviado", data: "28/02/2026" },
  { id: "2", cliente: "Carlos Souza", titulo: "Família - Orlando", valor: "R$ 18.900", status: "aprovado", data: "27/02/2026" },
  { id: "3", cliente: "Ana Costa", titulo: "Negócios - Lisboa", valor: "R$ 8.200", status: "rascunho", data: "27/02/2026" },
  { id: "4", cliente: "Pedro Lima", titulo: "Aventura - Patagônia", valor: "R$ 12.800", status: "perdido", data: "26/02/2026" },
  { id: "5", cliente: "Lucia Mendes", titulo: "Cruzeiro - Caribe", valor: "R$ 22.400", status: "emitido", data: "25/02/2026" },
];

const statusVariant: Record<string, "muted" | "default" | "success" | "destructive" | "info"> = {
  rascunho: "muted",
  enviado: "default",
  aprovado: "success",
  perdido: "destructive",
  emitido: "info",
};

export default function Dashboard() {
  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold">Dashboard</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <Card key={m.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{m.title}</CardTitle>
              <m.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{m.value}</div>
              <p className="text-xs text-success mt-1">{m.change} vs mês anterior</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Orçamentos por Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="total" fill="hsl(217, 91%, 60%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Orçamentos Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentOrcamentos.map((o) => (
                <Link
                  key={o.id}
                  to={`/orcamentos/${o.id}`}
                  className="flex items-center justify-between py-2.5 border-b last:border-0 hover:bg-muted/50 -mx-2 px-2 rounded-md transition-colors"
                >
                  <div>
                    <p className="font-medium text-sm">{o.titulo}</p>
                    <p className="text-xs text-muted-foreground">{o.cliente} • {o.data}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold">{o.valor}</span>
                    <Badge variant={statusVariant[o.status]}>{o.status}</Badge>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
