
-- Add missing columns to clientes
ALTER TABLE public.clientes 
  ADD COLUMN IF NOT EXISTS credito_disponivel numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS origem_lead text,
  ADD COLUMN IF NOT EXISTS temperatura text DEFAULT 'morno';

-- Create historico_credito_cliente table
CREATE TABLE IF NOT EXISTS public.historico_credito_cliente (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE CASCADE NOT NULL,
  agencia_id uuid REFERENCES public.agencias(id) ON DELETE CASCADE NOT NULL,
  usuario_id uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  tipo text NOT NULL,
  valor numeric NOT NULL DEFAULT 0,
  descricao text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.historico_credito_cliente ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view credit history of their agency"
  ON public.historico_credito_cliente FOR SELECT TO authenticated
  USING (agencia_id = public.get_user_agencia_id());

CREATE POLICY "Agency admins can insert credit history"
  ON public.historico_credito_cliente FOR INSERT TO authenticated
  WITH CHECK (agencia_id = public.get_user_agencia_id());
