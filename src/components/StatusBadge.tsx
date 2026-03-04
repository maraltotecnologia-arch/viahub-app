import { FileText, Send, CheckCircle, XCircle, Award, CheckCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

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
  pago: {
    label: "Pago",
    className: "border",
    icon: CheckCheck,
  },
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export default function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const { isDark } = useTheme();
  const config = statusConfig[status] || statusConfig.rascunho;
  const Icon = config.icon;

  const darkStyleByStatus: Record<string, React.CSSProperties> = {
    rascunho: { background: "rgba(100,116,139,0.3)", color: "#CBD5E1", border: "1px solid rgba(100,116,139,0.4)" },
    enviado: { background: "rgba(37,99,235,0.3)", color: "#93C5FD", border: "1px solid rgba(37,99,235,0.4)" },
    aprovado: { background: "rgba(16,185,129,0.3)", color: "#6EE7B7", border: "1px solid rgba(16,185,129,0.4)" },
    perdido: { background: "rgba(239,68,68,0.3)", color: "#FCA5A5", border: "1px solid rgba(239,68,68,0.4)" },
    emitido: { background: "rgba(139,92,246,0.3)", color: "#C4B5FD", border: "1px solid rgba(139,92,246,0.4)" },
    pago: { background: "rgba(16,185,129,0.3)", color: "#6EE7B7", border: "1px solid rgba(16,185,129,0.4)" },
  };
  const style = isDark ? (darkStyleByStatus[status] ?? darkStyleByStatus.rascunho) : undefined;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${!isDark ? config.className : ""} ${className}`}
      style={style || (status === "pago" && !isDark ? { background: "#D1FAE5", color: "#065F46", border: "1px solid #6EE7B7" } : style)}
    >
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

export { statusConfig };
