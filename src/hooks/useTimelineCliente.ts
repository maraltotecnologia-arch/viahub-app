import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ── Types ──────────────────────────────────────────────────────────────────

export type TipoInteracao = "ligacao" | "reuniao" | "email" | "whatsapp" | "visita" | "outros";

export interface TimelineItem {
  id: string;
  kind: "interacao" | "orcamento";
  data: string; // ISO string
  titulo: string;
  descricao?: string;
  usuario_nome?: string;
  // interacao-specific
  tipo_interacao?: TipoInteracao;
  // orcamento-specific
  orcamento_id?: string;
  orcamento_status?: string;
  orcamento_valor?: number;
}

export interface NovaInteracaoPayload {
  tipo: TipoInteracao;
  descricao: string;
  data_interacao: string; // ISO string (UTC)
  usuario_id: string;
}

// ── Constants ──────────────────────────────────────────────────────────────

export const TIPO_LABEL: Record<TipoInteracao, string> = {
  ligacao:  "Ligação",
  reuniao:  "Reunião",
  email:    "Email",
  whatsapp: "WhatsApp",
  visita:   "Visita",
  outros:   "Outros",
};

export const TIPO_ICONE: Record<TipoInteracao, string> = {
  ligacao:  "📞",
  reuniao:  "🤝",
  email:    "✉️",
  whatsapp: "💬",
  visita:   "🏢",
  outros:   "📝",
};

const fmtValor = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// ── Hook ───────────────────────────────────────────────────────────────────

export function useTimelineCliente(clienteId: string, agenciaId: string) {
  const queryClient = useQueryClient();
  const qKey = ["timeline-cliente", clienteId] as const;

  const { data: items = [], isLoading } = useQuery({
    queryKey: qKey,
    enabled: !!clienteId && !!agenciaId,
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      // Busca as duas fontes em paralelo
      const [interacoesRes, orcamentosRes] = await Promise.all([
        supabase
          .from("interacoes_cliente" as any)
          .select("id, tipo, descricao, data_interacao, usuarios(nome)")
          .eq("cliente_id", clienteId)
          .order("data_interacao", { ascending: false }),
        supabase
          .from("orcamentos")
          .select("id, titulo, valor_final, status, criado_em")
          .eq("cliente_id", clienteId)
          .order("criado_em", { ascending: false }),
      ]);

      if (interacoesRes.error) throw interacoesRes.error;
      if (orcamentosRes.error) throw orcamentosRes.error;

      const interacoes: TimelineItem[] = (interacoesRes.data ?? []).map((i: any) => ({
        id: i.id,
        kind: "interacao" as const,
        data: i.data_interacao,
        titulo: TIPO_LABEL[i.tipo as TipoInteracao] ?? i.tipo,
        descricao: i.descricao,
        usuario_nome: (i.usuarios as any)?.nome ?? undefined,
        tipo_interacao: i.tipo as TipoInteracao,
      }));

      const orcamentos: TimelineItem[] = (orcamentosRes.data ?? []).map((o: any) => {
        const valor = Number(o.valor_final) || 0;
        const titulo = o.titulo
          ? `Orçamento — ${o.titulo} — ${fmtValor(valor)}`
          : `Orçamento #${String(o.id).slice(0, 6).toUpperCase()} — ${fmtValor(valor)}`;
        return {
          id: o.id,
          kind: "orcamento" as const,
          data: o.criado_em,
          titulo,
          orcamento_id: o.id,
          orcamento_status: o.status,
          orcamento_valor: valor,
        };
      });

      // Mescla e ordena cronologicamente (mais recente primeiro)
      return [...interacoes, ...orcamentos].sort(
        (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()
      );
    },
  });

  const addInteracao = useMutation({
    mutationFn: async (payload: NovaInteracaoPayload) => {
      const { error } = await supabase
        .from("interacoes_cliente" as any)
        .insert({
          cliente_id:     clienteId,
          agencia_id:     agenciaId,
          usuario_id:     payload.usuario_id,
          tipo:           payload.tipo,
          descricao:      payload.descricao.trim(),
          data_interacao: payload.data_interacao,
        } as any);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qKey }),
  });

  return { items, isLoading, addInteracao };
}
