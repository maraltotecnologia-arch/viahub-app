import { FileText, Send, CheckCircle, XCircle, Award } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const statusConfig: Record<string, { label: string; className: string; icon: LucideIcon }> = {
  rascunho: {
    label: "Rascunho",
    className: "bg-muted text-muted-foreground border border-border",
    icon: FileText,
  },
  enviado: {
    label: "Enviado",
    className: "bg-primary/10 text-primary border border-primary/20",
    icon: Send,
  },
  aprovado: {
    label: "Aprovado",
    className: "bg-success/10 text-success border border-success/20",
    icon: CheckCircle,
  },
  perdido: {
    label: "Perdido",
    className: "bg-destructive/10 text-destructive border border-destructive/20",
    icon: XCircle,
  },
  emitido: {
    label: "Emitido",
    className: "bg-info/10 text-info border border-info/20",
    icon: Award,
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
