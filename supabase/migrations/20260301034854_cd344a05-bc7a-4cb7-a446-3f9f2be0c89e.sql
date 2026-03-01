CREATE POLICY "Superadmin can delete agencias"
ON public.agencias
FOR DELETE
USING (is_superadmin());