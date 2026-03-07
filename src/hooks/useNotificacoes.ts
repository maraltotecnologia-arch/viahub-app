import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Notificacao {
  id: string;
  titulo: string;
  mensagem: string;
  tipo: string;
  criado_em: string;
}

export default function useNotificacoes() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: notificacoes } = useQuery({
    queryKey: ["notificacoes", user?.id],
    enabled: !!user,
    refetchInterval: 5 * 60 * 1000,
    queryFn: async () => {
      // Get user creation date to filter out older notifications
      const { data: perfil } = await supabase
        .from("usuarios")
        .select("criado_em")
        .eq("id", user!.id)
        .single();

      // Get all active notifications created after user signup
      let query = supabase
        .from("notificacoes_sistema")
        .select("*")
        .eq("ativo", true)
        .order("criado_em", { ascending: false });

      if (perfil?.criado_em) {
        query = query.gte("criado_em", perfil.criado_em);
      }

      const { data: todas, error } = await query;
      if (error) throw error;

      // Get read notifications for this user
      const { data: lidas } = await supabase
        .from("notificacoes_lidas")
        .select("notificacao_id")
        .eq("usuario_id", user!.id);

      const lidasSet = new Set((lidas || []).map((l: any) => l.notificacao_id));
      const naoLidas = (todas || []).filter((n: any) => !lidasSet.has(n.id));

      return naoLidas as Notificacao[];
    },
  });

  const marcarComoLida = async (notificacaoId: string) => {
    if (!user) return;
    await supabase.from("notificacoes_lidas").insert({
      usuario_id: user.id,
      notificacao_id: notificacaoId,
    });
    queryClient.invalidateQueries({ queryKey: ["notificacoes"] });
  };

  const marcarTodasComoLidas = async () => {
    if (!user || !notificacoes || notificacoes.length === 0) return;
    const rows = notificacoes.map((n) => ({
      usuario_id: user.id,
      notificacao_id: n.id,
    }));
    await supabase.from("notificacoes_lidas").insert(rows);
    queryClient.invalidateQueries({ queryKey: ["notificacoes"] });
  };

  return {
    notificacoes: notificacoes || [],
    total: notificacoes?.length || 0,
    marcarComoLida,
    marcarTodasComoLidas,
  };
}
