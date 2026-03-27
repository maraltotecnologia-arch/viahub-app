import { TEMPERATURA_CONFIG } from "./TemperaturaBadge";

const OPTIONS = (Object.keys(TEMPERATURA_CONFIG) as Array<keyof typeof TEMPERATURA_CONFIG>).map(
  (k) => ({ value: k, ...TEMPERATURA_CONFIG[k] })
);

interface TemperaturaControlProps {
  value: string;
  onChange: (v: string) => void;
}

export default function TemperaturaControl({ value, onChange }: TemperaturaControlProps) {
  return (
    <div className="flex gap-1.5">
      {OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all border"
            style={
              active
                ? { backgroundColor: opt.bg, color: opt.color, borderColor: opt.color }
                : { backgroundColor: "transparent", borderColor: "var(--border)", color: "var(--muted-foreground)" }
            }
          >
            <span>{opt.dot}</span>
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
