import * as React from "react";
import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { maskData } from "@/lib/masks";

interface DatePickerInputProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  label?: string;
  className?: string;
}

/** Convert ISO (YYYY-MM-DD) → display (DD/MM/YYYY) */
function isoToBR(iso: string): string {
  if (!iso || iso.length < 10) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return "";
  return `${d}/${m}/${y}`;
}

/**
 * Parse BR (DD/MM/YYYY) → ISO (YYYY-MM-DD).
 * Returns null for structurally or logically invalid dates (e.g. 32/13/1990).
 */
function brToISO(br: string): string | null {
  const digits = br.replace(/\D/g, "");
  if (digits.length !== 8) return null;
  const d = parseInt(digits.slice(0, 2), 10);
  const m = parseInt(digits.slice(2, 4), 10);
  const y = parseInt(digits.slice(4, 8), 10);
  if (d < 1 || d > 31 || m < 1 || m > 12 || y < 1900) return null;
  // Detect overflow (e.g., 30/02 rolls to 02/03)
  const date = new Date(y, m - 1, d);
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== m - 1 ||
    date.getDate() !== d
  )
    return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export default function DatePickerInput({
  value,
  onChange,
  placeholder = "DD/MM/AAAA",
  disabled = false,
  minDate,
  maxDate,
  label,
  className,
}: DatePickerInputProps) {
  const [open, setOpen] = React.useState(false);
  const [inputVal, setInputVal] = React.useState(() => isoToBR(value));
  const [error, setError] = React.useState<string | null>(null);

  // Sync display when parent changes value (e.g., external reset)
  React.useEffect(() => {
    setInputVal(isoToBR(value));
  }, [value]);

  const selectedDate =
    value && value.length === 10
      ? parse(value, "yyyy-MM-dd", new Date())
      : undefined;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputVal(maskData(e.target.value));
    setError(null);
  };

  const handleBlur = () => {
    if (!inputVal.trim()) {
      onChange("");
      return;
    }
    const iso = brToISO(inputVal);
    if (!iso) {
      setError("Data inválida. Use DD/MM/AAAA");
      return;
    }
    const date = new Date(iso + "T00:00:00");
    if (maxDate && date > maxDate) {
      setError("Data não pode ser futura");
      return;
    }
    if (minDate && date < minDate) {
      setError(`Data mínima: ${isoToBR(minDate.toISOString().slice(0, 10))}`);
      return;
    }
    setError(null);
    onChange(iso);
  };

  const handleCalendarSelect = (date: Date | undefined) => {
    if (date) {
      const iso = format(date, "yyyy-MM-dd");
      onChange(iso);
      setInputVal(isoToBR(iso));
      setError(null);
    } else {
      onChange("");
      setInputVal("");
    }
    setOpen(false);
  };

  return (
    <div className={cn("space-y-1", className)}>
      {label && <span className="text-sm font-medium">{label}</span>}
      <div className="relative flex items-center">
        <input
          type="text"
          inputMode="numeric"
          value={inputVal}
          onChange={handleInputChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={10}
          className={cn(
            "viahub-input flex h-10 w-full rounded-[10px] border border-input bg-background px-3.5 py-2.5 pr-10 text-sm ring-offset-background transition-[border-color,box-shadow] duration-150 focus-visible:outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-50",
            error &&
              "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/10",
          )}
        />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              disabled={disabled}
              tabIndex={-1}
              className="absolute right-2.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <CalendarDays className="h-4 w-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleCalendarSelect}
              locale={ptBR}
              disabled={(date) => {
                if (minDate && date < minDate) return true;
                if (maxDate && date > maxDate) return true;
                return false;
              }}
              initialFocus
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
