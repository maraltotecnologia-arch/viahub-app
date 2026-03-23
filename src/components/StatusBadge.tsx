import { FileText, Send, CheckCircle, XCircle, Award, CheckCheck, DollarSign } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const statusConfig: Record<string, { label: string; className: string; icon: LucideIcon }> = {
  rascunho: {
    label: "Rascunho",
    className: "bg-surface-container-highest text-on-surface-variant",
    icon: FileText,
  },
  enviado: {
    label: "Enviado",
    className: "bg-primary/10 text-primary",
    icon: Send,
  },
  aprovado: {
    label: "Aprovado",
    className: "bg-secondary-container/50 text-secondary",
    icon: CheckCircle,
  },
  perdido: {
    label: "Perdido",
    className: "bg-error-container/50 text-error",
    icon: XCircle,
  },
  emitido: {
    label: "Emitido",
    className: "bg-[#7c3aed]/10 text-[#7c3aed]",
    icon: Award,
  },
  pago: {
    label: "Pago",
    className: "bg-secondary-container/50 text-secondary",
    icon: DollarSign,
  },
  pendente: {
    label: "Pendente",
    className: "bg-[#ff9800]/10 text-[#e65100]",
    icon: CheckCheck,
  },
  bloqueado: {
    label: "Bloqueado",
    className: "bg-error-container/50 text-error",
    icon: XCircle,
  },
  ativo: {
    label: "Ativo",
    className: "bg-secondary-container/50 text-secondary",
    icon: CheckCircle,
  },
  expirado: {
    label: "Expirado",
    className: "bg-[#ff9800]/10 text-[#e65100]",
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
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold font-label ${config.className} ${className}`}
    >
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

export { statusConfig };
