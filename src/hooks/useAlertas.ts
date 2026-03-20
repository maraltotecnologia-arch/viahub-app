import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { calcularDiasUteis, type HorarioFuncionamento, DEFAULT_HORARIO } from "@/lib/business-days";

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
    staleTime: 2 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const in3days = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
      const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();

      // Fetch agency working hours
      const { data: agenciaData } = await supabase
        .from("agencias")
        .select("horario_funcionamento")
        .eq("id", agenciaId!)
        .maybeSingle();

      const horario: HorarioFuncionamento =
        (agenciaData?.horario_funcionamento as unknown as HorarioFuncionamento) || DEFAULT_HORARIO;

      // Fetch awaiting quotes and calculate business days client-side
      const { data: aguardandoRows } = await supabase
        .from("orcamentos")
        .select("id, enviado_whatsapp_em")
        .eq("agencia_id", agenciaId!)
        .eq("status", "enviado")
        .not("enviado_whatsapp_em", "is", null)
        .not("status", "in", '("aprovado","emitido","pago","perdido")');

      const aguardandoResposta = (aguardandoRows || []).filter((o) => {
        if (!o.enviado_whatsapp_em) return false;
        return calcularDiasUteis(new Date(o.enviado_whatsapp_em), horario) >= 1;
      }).length;

      const [hoje, breve, parado] = await Promise.all([
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
          .lt("atualizado_em", sevenDaysAgo),
      ]);

      const vencendoHoje = hoje.count ?? 0;
      const vencendoEmBreve = breve.count ?? 0;
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
