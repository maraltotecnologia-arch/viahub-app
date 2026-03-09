import { FileText, Send, CheckCircle, XCircle, Award, CheckCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const statusConfig: Record<string, { label: string; className: string; icon: LucideIcon }> = {
  rascunho: {
    label: "Rascunho",
    className: "bg-muted text-muted-foreground border border-border",
    icon: FileText,
  },
  enviado: {
    label: "Enviado",
    className: "bg-blue-500/10 text-blue-600 border border-blue-500/20 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/30",
    icon: Send,
  },
  aprovado: {
    label: "Aprovado",
    className: "bg-green-500/10 text-green-600 border border-green-500/20 dark:bg-green-500/20 dark:text-green-400 dark:border-green-500/30",
    icon: CheckCircle,
  },
  perdido: {
    label: "Perdido",
    className: "bg-red-500/10 text-red-600 border border-red-500/20 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/30",
    icon: XCircle,
  },
  emitido: {
    label: "Emitido",
    className: "bg-violet-500/10 text-violet-600 border border-violet-500/20 dark:bg-violet-500/20 dark:text-violet-400 dark:border-violet-500/30",
    icon: Award,
  },
  pago: {
    label: "Pago",
    className: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30",
    icon: CheckCheck,
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
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.className} ${className}`}
    >
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

export { statusConfig };
