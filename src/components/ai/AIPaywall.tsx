import { Lock, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface AIPaywallProps {
  className?: string;
}

export default function AIPaywall({ className }: AIPaywallProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center px-6 py-16 animate-fade-in ${className ?? ""}`}>
      <div className="h-20 w-20 rounded-full flex items-center justify-center bg-muted/60 border border-border">
        <Lock className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mt-6">
        Recurso Exclusivo para Planos Pro e Elite
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm leading-relaxed mt-2">
        Desbloqueie o poder da Inteligência Artificial para gerar orçamentos em segundos, buscar preços em tempo real e aplicar markups automáticos. Eleve sua agência ao próximo nível.
      </p>
      <Button
        className="mt-6 gap-2"
        onClick={() => toast.info("Redirecionando para planos...")}
      >
        <ArrowUpRight className="h-4 w-4" />
        Fazer Upgrade do Plano
      </Button>
    </div>
  );
}
