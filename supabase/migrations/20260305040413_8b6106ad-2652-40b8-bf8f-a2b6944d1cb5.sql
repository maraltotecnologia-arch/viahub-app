
-- Create metas_agentes table
CREATE TABLE IF NOT EXISTS public.metas_agentes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agencia_id UUID REFERENCES public.agencias(id) ON DELETE CASCADE NOT NULL,
  usuario_id UUID REFERENCES public.usuarios(id) ON DELETE CASCADE NOT NULL,
  mes INTEGER NOT NULL,
  ano INTEGER NOT NULL,
  meta_valor NUMERIC(12,2) DEFAULT 0,
  meta_orcamentos INTEGER DEFAULT 0,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now(),
  UNIQUE(agencia_id, usuario_id, mes, ano)
);

-- Enable RLS
ALTER TABLE public.metas_agentes ENABLE ROW LEVEL SECURITY;

-- SELECT: users from same agency
CREATE POLICY "Users can view agency metas"
ON public.metas_agentes FOR SELECT TO authenticated
USING (agencia_id = get_user_agencia_id());

-- Superadmin can view all
CREATE POLICY "Superadmin can view all metas"
ON public.metas_agentes FOR SELECT TO authenticated
USING (is_superadmin());

-- Create a function to check if user is admin of their agency
CREATE OR REPLACE FUNCTION public.is_agency_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.usuarios
    WHERE id = auth.uid()
      AND cargo IN ('admin', 'superadmin')
  )
$$;

-- INSERT: only admin of same agency
CREATE POLICY "Admin can insert metas"
ON public.metas_agentes FOR INSERT TO authenticated
WITH CHECK (agencia_id = get_user_agencia_id() AND is_agency_admin());

-- UPDATE: only admin of same agency
CREATE POLICY "Admin can update metas"
ON public.metas_agentes FOR UPDATE TO authenticated
USING (agencia_id = get_user_agencia_id() AND is_agency_admin());

-- DELETE: only admin of same agency
CREATE POLICY "Admin can delete metas"
ON public.metas_agentes FOR DELETE TO authenticated
USING (agencia_id = get_user_agencia_id() AND is_agency_admin());
