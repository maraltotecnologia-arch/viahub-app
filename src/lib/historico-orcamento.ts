import { supabase } from "@/integrations/supabase/client";

interface RegistrarHistoricoParams {
  orcamento_id: string;
  usuario_id: string;
  agencia_id: string;
  tipo: string;
  status_anterior?: string | null;
  status_novo?: string | null;
  descricao: string;
}

export async function registrarHistorico(params: RegistrarHistoricoParams) {
  const { error } = await supabase.from("historico_orcamento" as any).insert({
    orcamento_id: params.orcamento_id,
    usuario_id: params.usuario_id,
    agencia_id: params.agencia_id,
    tipo: params.tipo,
    status_anterior: params.status_anterior || null,
    status_novo: params.status_novo || null,
    descricao: params.descricao,
  });
  if (error) console.error("Erro ao registrar histórico:", error);
}
