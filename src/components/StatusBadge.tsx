import { FileText, Send, CheckCircle, XCircle, Award, CheckCheck, DollarSign } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const statusConfig: Record<string, { label: string; className: string; icon: LucideIcon }> = {
  rascunho: {
    label: "Rascunho",
    className: "bg-outline/10 text-on-surface-variant border border-outline/20",
    icon: FileText,
  },
  enviado: {
    label: "Enviado",
    className: "bg-primary/10 text-primary border border-primary/20",
    icon: Send,
  },
  aprovado: {
    label: "Aprovado",
    className: "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 dark:text-emerald-400",
    icon: CheckCircle,
  },
  perdido: {
    label: "Perdido",
    className: "bg-destructive/10 text-destructive border border-destructive/20",
    icon: XCircle,
  },
  emitido: {
    label: "Emitido",
    className: "bg-violet-500/10 text-violet-600 border border-violet-500/20 dark:text-violet-400",
    icon: Award,
  },
  pago: {
    label: "Pago",
    className: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 dark:text-emerald-400",
    icon: DollarSign,
  },
  pendente: {
    label: "Pendente",
    className: "bg-amber-500/10 text-amber-700 border border-amber-500/20 dark:text-amber-400",
    icon: CheckCheck,
  },
  bloqueado: {
    label: "Bloqueado",
    className: "bg-destructive/10 text-destructive border border-destructive/20",
    icon: XCircle,
  },
  ativo: {
    label: "Ativo",
    className: "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 dark:text-emerald-400",
    icon: CheckCircle,
  },
  expirado: {
    label: "Expirado",
    className: "bg-orange-500/10 text-orange-700 border border-orange-500/20 dark:text-orange-400",
    icon: XCircle,
  },
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export default function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.rascunho;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${config.className} ${className}`}
    >
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

export { statusConfig };
