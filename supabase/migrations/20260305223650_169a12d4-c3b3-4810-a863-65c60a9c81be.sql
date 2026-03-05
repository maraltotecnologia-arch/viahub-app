
CREATE TABLE public.logs_acesso (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agencia_id uuid NOT NULL REFERENCES public.agencias(id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  usuario_nome text,
  cargo text,
  ip text,
  criado_em timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.logs_acesso ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmin can view all logs" ON public.logs_acesso
  FOR SELECT TO authenticated
  USING (is_superadmin());

CREATE POLICY "Authenticated users can insert own logs" ON public.logs_acesso
  FOR INSERT TO authenticated
  WITH CHECK (usuario_id = auth.uid());

CREATE INDEX idx_logs_acesso_agencia_criado ON public.logs_acesso (agencia_id, criado_em DESC);
