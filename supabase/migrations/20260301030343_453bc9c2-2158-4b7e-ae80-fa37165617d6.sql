
-- Create is_superadmin function
CREATE OR REPLACE FUNCTION public.is_superadmin()
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
      AND cargo = 'superadmin'
  )
$$;

-- Add permissive SELECT policies for superadmin on all tables
CREATE POLICY "Superadmin can view all agencias"
ON public.agencias FOR SELECT
TO authenticated
USING (public.is_superadmin());

CREATE POLICY "Superadmin can update all agencias"
ON public.agencias FOR UPDATE
TO authenticated
USING (public.is_superadmin());

CREATE POLICY "Superadmin can view all usuarios"
ON public.usuarios FOR SELECT
TO authenticated
USING (public.is_superadmin());

CREATE POLICY "Superadmin can view all orcamentos"
ON public.orcamentos FOR SELECT
TO authenticated
USING (public.is_superadmin());

CREATE POLICY "Superadmin can view all clientes"
ON public.clientes FOR SELECT
TO authenticated
USING (public.is_superadmin());

CREATE POLICY "Superadmin can insert agencias"
ON public.agencias FOR INSERT
TO authenticated
WITH CHECK (public.is_superadmin());

CREATE POLICY "Superadmin can insert usuarios"
ON public.usuarios FOR INSERT
TO authenticated
WITH CHECK (public.is_superadmin());
