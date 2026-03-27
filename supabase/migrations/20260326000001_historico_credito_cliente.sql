-- =============================================================
-- Crédito futuro do cliente — histórico de movimentações
-- =============================================================

CREATE TABLE IF NOT EXISTS public.historico_credito_cliente (
  id           UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id   UUID           NOT NULL REFERENCES public.clientes(id)   ON DELETE CASCADE,
  agencia_id   UUID           NOT NULL REFERENCES public.agencias(id)   ON DELETE CASCADE,
  tipo         TEXT           NOT NULL,
  valor        NUMERIC(10, 2) NOT NULL,
  descricao    TEXT,
  orcamento_id UUID           REFERENCES public.orcamentos(id)          ON DELETE SET NULL,
  usuario_id   UUID           REFERENCES public.usuarios(id),
  created_at   TIMESTAMPTZ    DEFAULT now(),

  CONSTRAINT chk_historico_credito_tipo CHECK (tipo IN ('entrada', 'uso'))
);

ALTER TABLE public.historico_credito_cliente ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_historico_credito_cliente
  ON public.historico_credito_cliente(cliente_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_historico_credito_agencia
  ON public.historico_credito_cliente(agencia_id, created_at DESC);

-- RLS policies
DROP POLICY IF EXISTS "Agencia acessa historico credito"        ON public.historico_credito_cliente;
DROP POLICY IF EXISTS "Superadmin acessa todo historico credito" ON public.historico_credito_cliente;

CREATE POLICY "Agencia acessa historico credito"
  ON public.historico_credito_cliente FOR ALL TO authenticated
  USING     (agencia_id = public.get_user_agencia_id())
  WITH CHECK (agencia_id = public.get_user_agencia_id());

CREATE POLICY "Superadmin acessa todo historico credito"
  ON public.historico_credito_cliente FOR SELECT TO authenticated
  USING (public.is_superadmin());
