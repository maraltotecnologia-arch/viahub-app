import { FileText, Send, CheckCircle, XCircle, Award, CheckCheck, DollarSign } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const statusConfig: Record<string, { label: string; className: string; icon: LucideIcon }> = {
  rascunho: {
    label: "Rascunho",
    className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    icon: FileText,
  },
  enviado: {
    label: "Enviado",
    className: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    icon: Send,
  },
  aprovado: {
    label: "Aprovado",
    className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
    icon: CheckCircle,
  },
  perdido: {
    label: "Perdido",
    className: "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400",
    icon: XCircle,
  },
  emitido: {
    label: "Emitido",
    className: "bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-400",
    icon: Award,
  },
  pago: {
    label: "Pago",
    className: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400",
    icon: DollarSign,
  },
  pendente: {
    label: "Pendente",
    className: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
    icon: CheckCheck,
  },
  bloqueado: {
    label: "Bloqueado",
    className: "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400",
    icon: XCircle,
  },
  ativo: {
    label: "Ativo",
    className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
    icon: CheckCircle,
  },
  expirado: {
    label: "Expirado",
    className: "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-400",
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
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className} ${className}`}
    >
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

export { statusConfig };
