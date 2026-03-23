import { Bell, Info, AlertTriangle, Wrench, CreditCard } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import useNotificacoes, { type Notificacao } from "@/hooks/useNotificacoes";

const tipoConfig: Record<string, { icon: typeof Info; colorClass: string }> = {
  info: { icon: Info, colorClass: "text-primary" },
  warning: { icon: AlertTriangle, colorClass: "text-[#e65100]" },
  manutencao: { icon: Wrench, colorClass: "text-[#e65100]" },
  cobranca: { icon: CreditCard, colorClass: "text-secondary" },
};

function NotificacaoItem({ n, onRead }: { n: Notificacao; onRead: () => void }) {
  const cfg = tipoConfig[n.tipo] || tipoConfig.info;
  const Icon = cfg.icon;

  return (
    <button
      onClick={onRead}
      className="w-full text-left flex items-start gap-3 p-3 hover:bg-surface-container-high rounded-xl transition-colors"
    >
      <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${cfg.colorClass}`} />
      <div className="min-w-0">
        <p className="text-sm font-semibold font-headline leading-tight text-on-surface">{n.titulo}</p>
        <p className="text-xs text-on-surface-variant font-body mt-0.5 line-clamp-2">{n.mensagem}</p>
        <p className="text-[10px] text-on-surface-variant/60 font-label mt-1">
          {new Date(n.criado_em).toLocaleDateString("pt-BR")}
        </p>
      </div>
    </button>
  );
}

export default function NotificacoesDropdown() {
  const { notificacoes, total, marcarComoLida, marcarTodasComoLidas } = useNotificacoes();
  const navigate = useNavigate();

  const handleNotificacaoClick = async (n: Notificacao) => {
    await marcarComoLida(n.id);
    if (n.link) {
      navigate(n.link);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-xl hover:bg-surface-container-high text-on-surface-variant transition-colors" title="Notificações">
          <Bell className="h-5 w-5" />
          {total > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-gradient-to-br from-error to-error text-white text-[9px] flex items-center justify-center font-bold px-1">
              {total > 9 ? "9+" : total}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 rounded-xl shadow-ambient bg-surface-container-lowest dark:bg-surface-container" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/15">
          <h4 className="text-sm font-semibold font-headline text-on-surface">Notificações</h4>
          {total > 0 && (
            <Button variant="ghost" size="sm" className="text-xs h-auto py-1" onClick={marcarTodasComoLidas}>
              Marcar todas como lidas
            </Button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto p-1">
          {notificacoes.length === 0 ? (
            <div className="py-10 text-center">
              <Bell className="h-10 w-10 text-on-surface-variant/30 mx-auto mb-2" />
              <p className="text-sm text-on-surface-variant font-body">Nenhuma notificação</p>
              <p className="text-xs text-on-surface-variant/60 font-label mt-1">Você está em dia!</p>
            </div>
          ) : (
            notificacoes.map((n) => (
              <NotificacaoItem key={n.id} n={n} onRead={() => handleNotificacaoClick(n)} />
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
