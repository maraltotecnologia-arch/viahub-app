
-- Add tags column to clientes
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Create contatos_cliente table
CREATE TABLE IF NOT EXISTS public.contatos_cliente (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE NOT NULL,
  agencia_id UUID REFERENCES public.agencias(id) NOT NULL,
  nome TEXT NOT NULL,
  cargo TEXT,
  email TEXT,
  telefone TEXT,
  principal BOOLEAN DEFAULT false,
  criado_em TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.contatos_cliente ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agencia acessa seus contatos"
ON public.contatos_cliente FOR ALL TO authenticated
USING (agencia_id = get_user_agencia_id())
WITH CHECK (agencia_id = get_user_agencia_id());
