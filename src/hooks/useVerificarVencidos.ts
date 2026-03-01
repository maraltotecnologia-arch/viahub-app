import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function useVerificarVencidos(agenciaId: string | null) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const didRun = useRef(false);

  useEffect(() => {
    if (!agenciaId || didRun.current) return;
    didRun.current = true;

    const verificar = async () => {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const { data: vencidos } = await supabase
        .from("orcamentos")
        .select("id")
        .eq("agencia_id", agenciaId)
        .in("status", ["rascunho", "enviado"])
        .lt("validade", hoje.toISOString())
        .not("validade", "is", null);

      if (!vencidos || vencidos.length === 0) return;

      const ids = vencidos.map((o) => o.id);
      await supabase.from("orcamentos").update({ status: "perdido" }).in("id", ids);

      toast({
        title: `${vencidos.length} orçamento(s) movido(s) para Perdido por vencimento.`,
        variant: "destructive",
      });

      queryClient.invalidateQueries({ queryKey: ["pipeline"] });
      queryClient.invalidateQueries({ queryKey: ["orcamentos"] });
    };

    verificar();
  }, [agenciaId, toast, queryClient]);
}
