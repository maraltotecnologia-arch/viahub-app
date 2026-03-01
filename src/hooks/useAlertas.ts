import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AlertasData {
  vencendoHoje: number;
  vencendoEmBreve: number;
  aguardandoResposta: number;
  pipelineParado: number;
  total: number;
}

export default function useAlertas(agenciaId: string | null) {
  return useQuery<AlertasData>({
    queryKey: ["alertas", agenciaId],
    enabled: !!agenciaId,
    refetchInterval: 5 * 60 * 1000,
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const in3days = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
      const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
      const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();

      const [hoje, breve, aguardando, parado] = await Promise.all([
        supabase
          .from("orcamentos")
          .select("id", { count: "exact", head: true })
          .eq("agencia_id", agenciaId!)
          .in("status", ["rascunho", "enviado"])
          .eq("validade", today),
        supabase
          .from("orcamentos")
          .select("id", { count: "exact", head: true })
          .eq("agencia_id", agenciaId!)
          .in("status", ["rascunho", "enviado"])
          .gte("validade", tomorrow)
          .lte("validade", in3days),
        supabase
          .from("orcamentos")
          .select("id", { count: "exact", head: true })
          .eq("agencia_id", agenciaId!)
          .eq("status", "enviado")
          .not("enviado_whatsapp_em", "is", null)
          .lt("enviado_whatsapp_em", threeDaysAgo),
        supabase
          .from("orcamentos")
          .select("id", { count: "exact", head: true })
          .eq("agencia_id", agenciaId!)
          .eq("status", "enviado")
          .lt("atualizado_em", sevenDaysAgo),
      ]);

      const vencendoHoje = hoje.count ?? 0;
      const vencendoEmBreve = breve.count ?? 0;
      const aguardandoResposta = aguardando.count ?? 0;
      const pipelineParado = parado.count ?? 0;

      return {
        vencendoHoje,
        vencendoEmBreve,
        aguardandoResposta,
        pipelineParado,
        total: vencendoHoje + vencendoEmBreve + aguardandoResposta + pipelineParado,
      };
    },
  });
}
