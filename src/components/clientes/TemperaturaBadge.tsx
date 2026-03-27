export const TEMPERATURA_CONFIG = {
  frio:   { label: "Frio",   dot: "🔵", color: "#3B82F6", bg: "rgba(59,130,246,0.12)"  },
  morno:  { label: "Morno",  dot: "🟡", color: "#F59E0B", bg: "rgba(245,158,11,0.12)"  },
  quente: { label: "Quente", dot: "🔴", color: "#EF4444", bg: "rgba(239,68,68,0.12)"   },
} as const;

interface TemperaturaBadgeProps {
  temperatura: string | null | undefined;
  size?: "sm" | "md";
}

export default function TemperaturaBadge({ temperatura, size = "sm" }: TemperaturaBadgeProps) {
  if (!temperatura) return null;
  const cfg = TEMPERATURA_CONFIG[temperatura as keyof typeof TEMPERATURA_CONFIG];
  if (!cfg) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold whitespace-nowrap ${
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"
      }`}
      style={{ backgroundColor: cfg.bg, color: cfg.color }}
    >
      {cfg.dot} {cfg.label}
    </span>
  );
}
