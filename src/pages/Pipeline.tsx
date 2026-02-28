import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

interface PipelineCard {
  id: string;
  cliente: string;
  titulo: string;
  valor: number;
  validade: string;
  diasParaVencer: number;
}

const columns: { id: string; title: string; variant: "muted" | "default" | "success" | "destructive" | "info"; cards: PipelineCard[] }[] = [
  {
    id: "rascunho", title: "Rascunho", variant: "muted",
    cards: [
      { id: "3", cliente: "Ana Costa", titulo: "Negócios - Lisboa", valor: 8200, validade: "05/03/2026", diasParaVencer: 5 },
      { id: "7", cliente: "Fernanda Dias", titulo: "Tailândia + Bali", valor: 28700, validade: "08/03/2026", diasParaVencer: 8 },
    ],
  },
  {
    id: "enviado", title: "Enviado", variant: "default",
    cards: [
      { id: "1", cliente: "Maria Silva", titulo: "Lua de mel - Maldivas", valor: 32500, validade: "15/03/2026", diasParaVencer: 15 },
      { id: "6", cliente: "Roberto Alves", titulo: "Europa - 15 dias", valor: 45000, validade: "01/03/2026", diasParaVencer: 1 },
    ],
  },
  {
    id: "aprovado", title: "Aprovado", variant: "success",
    cards: [
      { id: "2", cliente: "Carlos Souza", titulo: "Família - Orlando", valor: 18900, validade: "10/03/2026", diasParaVencer: 10 },
      { id: "8", cliente: "Marcos Oliveira", titulo: "Ski - Bariloche", valor: 9500, validade: "18/03/2026", diasParaVencer: 18 },
    ],
  },
  {
    id: "perdido", title: "Perdido", variant: "destructive",
    cards: [
      { id: "4", cliente: "Pedro Lima", titulo: "Aventura - Patagônia", valor: 12800, validade: "01/03/2026", diasParaVencer: -2 },
    ],
  },
  {
    id: "emitido", title: "Emitido", variant: "info",
    cards: [
      { id: "5", cliente: "Lucia Mendes", titulo: "Cruzeiro - Caribe", valor: 22400, validade: "20/03/2026", diasParaVencer: 20 },
    ],
  },
];

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function Pipeline() {
  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold">Pipeline</h2>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((col) => {
          const total = col.cards.reduce((s, c) => s + c.valor, 0);
          return (
            <div key={col.id} className="min-w-[280px] flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <Badge variant={col.variant}>{col.title}</Badge>
                  <span className="text-xs text-muted-foreground">{col.cards.length}</span>
                </div>
                <span className="text-xs font-semibold text-muted-foreground">{fmt(total)}</span>
              </div>

              <div className="space-y-3 flex-1">
                {col.cards.map((card) => (
                  <Link key={card.id} to={`/orcamentos/${card.id}`}>
                    <Card
                      className={`hover:shadow-md transition-shadow cursor-pointer ${
                        card.diasParaVencer <= 3 && card.diasParaVencer >= 0 ? "border-accent border-2" : ""
                      } ${card.diasParaVencer < 0 ? "opacity-60" : ""}`}
                    >
                      <CardContent className="p-4">
                        <p className="font-semibold text-sm">{card.titulo}</p>
                        <p className="text-xs text-muted-foreground mt-1">{card.cliente}</p>
                        <div className="flex items-center justify-between mt-3">
                          <span className="font-bold text-sm">{fmt(card.valor)}</span>
                          <span className={`text-xs ${card.diasParaVencer <= 3 ? "text-accent font-semibold" : "text-muted-foreground"}`}>
                            {card.diasParaVencer < 0 ? "Vencido" : `${card.diasParaVencer}d`}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
