import { Bell, Info, AlertTriangle, Wrench, CreditCard } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import useNotificacoes, { type Notificacao } from "@/hooks/useNotificacoes";

const tipoConfig: Record<string, { icon: typeof Info; colorClass: string }> = {
  info: { icon: Info, colorClass: "text-blue-600 dark:text-blue-400" },
  warning: { icon: AlertTriangle, colorClass: "text-yellow-600 dark:text-yellow-400" },
  manutencao: { icon: Wrench, colorClass: "text-orange-600 dark:text-orange-400" },
  cobranca: { icon: CreditCard, colorClass: "text-green-600 dark:text-green-400" },
};

function NotificacaoItem({ n, onRead }: { n: Notificacao; onRead: () => void }) {
  const cfg = tipoConfig[n.tipo] || tipoConfig.info;
  const Icon = cfg.icon;

  return (
    <button
      onClick={onRead}
      className="w-full text-left flex items-start gap-3 p-3 hover:bg-muted/50 rounded-lg transition-colors"
    >
      <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${cfg.colorClass}`} />
      <div className="min-w-0">
        <p className="text-sm font-medium leading-tight">{n.titulo}</p>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.mensagem}</p>
        <p className="text-[10px] text-muted-foreground mt-1">
          {new Date(n.criado_em).toLocaleDateString("pt-BR")}
        </p>
      </div>
    </button>
  );
}

export default function NotificacoesDropdown() {
  const { notificacoes, total, marcarComoLida, marcarTodasComoLidas } = useNotificacoes();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-[10px] bg-muted/50 hover:bg-muted transition-colors" title="Notificações">
          <Bell className="h-5 w-5 text-muted-foreground" />
          {total > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-bold px-1">
              {total > 9 ? "9+" : total}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h4 className="text-sm font-semibold">Notificações</h4>
          {total > 0 && (
            <Button variant="ghost" size="sm" className="text-xs h-auto py-1" onClick={marcarTodasComoLidas}>
              Marcar todas como lidas
            </Button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notificacoes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma notificação no momento
            </p>
          ) : (
            notificacoes.map((n) => (
              <NotificacaoItem key={n.id} n={n} onRead={() => marcarComoLida(n.id)} />
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
