import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import useAgenciaId from "@/hooks/useAgenciaId";

export type PlanoType = "starter" | "pro" | "elite" | null;

export default function useAgenciaPlano() {
  const agenciaId = useAgenciaId();

  const { data: plano, isLoading } = useQuery({
    queryKey: ["agencia-plano", agenciaId],
    enabled: !!agenciaId,
    queryFn: async () => {
      const { data } = await supabase
        .from("agencias")
        .select("plano")
        .eq("id", agenciaId!)
        .single();
      return (data?.plano as PlanoType) ?? "starter";
    },
  });

  const currentPlano = plano ?? "starter";
  const hasAIAccess = currentPlano === "pro" || currentPlano === "elite";

  return { plano: currentPlano, hasAIAccess, loading: isLoading };
}
