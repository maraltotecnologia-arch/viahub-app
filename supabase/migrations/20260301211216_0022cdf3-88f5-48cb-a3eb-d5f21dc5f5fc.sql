
-- Comentários internos
CREATE TABLE IF NOT EXISTS public.comentarios_orcamento (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  orcamento_id UUID NOT NULL REFERENCES public.orcamentos(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id),
  agencia_id UUID NOT NULL REFERENCES public.agencias(id),
  texto TEXT NOT NULL,
  criado_em TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.comentarios_orcamento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agencia acessa seus comentarios"
ON public.comentarios_orcamento FOR ALL TO authenticated
USING (agencia_id = get_user_agencia_id())
WITH CHECK (agencia_id = get_user_agencia_id());

-- Histórico de alterações
CREATE TABLE IF NOT EXISTS public.historico_orcamento (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  orcamento_id UUID NOT NULL REFERENCES public.orcamentos(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES public.usuarios(id),
  agencia_id UUID NOT NULL REFERENCES public.agencias(id),
  tipo TEXT NOT NULL,
  status_anterior TEXT,
  status_novo TEXT,
  descricao TEXT,
  criado_em TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.historico_orcamento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agencia acessa seu historico"
ON public.historico_orcamento FOR ALL TO authenticated
USING (agencia_id = get_user_agencia_id())
WITH CHECK (agencia_id = get_user_agencia_id());
