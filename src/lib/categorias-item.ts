import { Plane, Building2, Car, Shield, MapPin, DollarSign, CreditCard, Package } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type CategoriaItem =
  | "aereo"
  | "hospedagem"
  | "transfer"
  | "seguro"
  | "passeio"
  | "taxa"
  | "credito"
  | "outros";

export const CATEGORIAS_ITEM: {
  value: CategoriaItem;
  label: string;
  icon: LucideIcon;
  emoji: string;
  color: string;
}[] = [
  { value: "aereo",      label: "Aéreo",      icon: Plane,       emoji: "✈️",  color: "#2563EB" },
  { value: "hospedagem", label: "Hospedagem",  icon: Building2,   emoji: "🏨",  color: "#7C3AED" },
  { value: "transfer",   label: "Transfer",    icon: Car,         emoji: "🚗",  color: "#0891B2" },
  { value: "seguro",     label: "Seguro",      icon: Shield,      emoji: "🛡️", color: "#059669" },
  { value: "passeio",    label: "Passeio",     icon: MapPin,      emoji: "🎭",  color: "#D97706" },
  { value: "taxa",       label: "Taxa",        icon: DollarSign,  emoji: "💰",  color: "#DC2626" },
  { value: "credito",    label: "Crédito",     icon: CreditCard,  emoji: "💳",  color: "#0D9488" },
  { value: "outros",     label: "Outros",      icon: Package,     emoji: "📦",  color: "#6B7280" },
];

export function getCategoriaInfo(categoria: string | null | undefined) {
  return (
    CATEGORIAS_ITEM.find((c) => c.value === categoria) ??
    CATEGORIAS_ITEM.find((c) => c.value === "outros")!
  );
}
