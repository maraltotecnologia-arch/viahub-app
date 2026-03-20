import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Notificacao {
  id: string;
  titulo: string;
  mensagem: string;
  tipo: string;
  criado_em: string;
  link: string | null;
}

export default function useNotificacoes() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: notificacoes } = useQuery({
    queryKey: ["notificacoes", user?.id],
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    queryFn: async () => {
      const { data: perfil } = await supabase
        .from("usuarios")
        .select("criado_em, agencia_id")
        .eq("id", user!.id)
        .single();

      let agenciaStatus: string | null = null;
      if (perfil?.agencia_id) {
        const { data: agencia } = await supabase
          .from("agencias")
          .select("status_pagamento")
          .eq("id", perfil.agencia_id)
          .single();
        agenciaStatus = agencia?.status_pagamento || null;
      }

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

      const filtered = (todas || []).filter((n: any) => {
        if (!n.status_pagamento_alvo) return true;
        return n.status_pagamento_alvo === agenciaStatus;
      });

      const { data: lidas } = await supabase
        .from("notificacoes_lidas")
        .select("notificacao_id")
        .eq("usuario_id", user!.id);

      const lidasSet = new Set((lidas || []).map((l: any) => l.notificacao_id));
      const naoLidas = filtered.filter((n: any) => !lidasSet.has(n.id));

      return naoLidas as Notificacao[];
    },
  });

  const marcarComoLida = async (notificacaoId: string) => {
    if (!user) return;
    await supabase.from("notificacoes_lidas").insert({
      usuario_id: user.id,
      notificacao_id: notificacaoId,
    });
    queryClient.invalidateQueries({ queryKey: ["notificacoes", user.id] });
  };

  const marcarTodasComoLidas = async () => {
    if (!user || !notificacoes || notificacoes.length === 0) return;
    const rows = notificacoes.map((n) => ({
      usuario_id: user.id,
      notificacao_id: n.id,
    }));
    await supabase.from("notificacoes_lidas").insert(rows);
    queryClient.invalidateQueries({ queryKey: ["notificacoes", user.id] });
  };

  return {
    notificacoes: notificacoes || [],
    total: notificacoes?.length || 0,
    marcarComoLida,
    marcarTodasComoLidas,
  };
}
