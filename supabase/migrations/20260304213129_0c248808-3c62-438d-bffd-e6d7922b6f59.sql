
-- Add agencia_id column to notificacoes_sistema (null = all users)
ALTER TABLE public.notificacoes_sistema 
ADD COLUMN agencia_id uuid REFERENCES public.agencias(id) ON DELETE CASCADE DEFAULT NULL;

-- Add destinatario column to track target audience
ALTER TABLE public.notificacoes_sistema
ADD COLUMN destinatario text DEFAULT 'todos';

-- Allow superadmin to INSERT notifications
CREATE POLICY "Superadmin can insert notificacoes"
ON public.notificacoes_sistema
FOR INSERT
TO authenticated
WITH CHECK (is_superadmin());

-- Allow superadmin to DELETE notifications
CREATE POLICY "Superadmin can delete notificacoes"
ON public.notificacoes_sistema
FOR DELETE
TO authenticated
USING (is_superadmin());

-- Allow superadmin to UPDATE notifications
CREATE POLICY "Superadmin can update notificacoes"
ON public.notificacoes_sistema
FOR UPDATE
TO authenticated
USING (is_superadmin());

-- Update SELECT policy to also filter by agencia_id
DROP POLICY IF EXISTS "Usuarios podem ver notificacoes ativas" ON public.notificacoes_sistema;

CREATE POLICY "Usuarios podem ver notificacoes ativas"
ON public.notificacoes_sistema
FOR SELECT
TO authenticated
USING (
  ativo = true 
  AND (
    agencia_id IS NULL 
    OR agencia_id = get_user_agencia_id()
  )
  AND (
    destinatario = 'todos'
    OR (destinatario = 'admins' AND EXISTS (
      SELECT 1 FROM public.usuarios 
      WHERE id = auth.uid() 
      AND cargo IN ('admin', 'superadmin')
    ))
    OR (destinatario = 'agencia' AND agencia_id = get_user_agencia_id())
  )
);

-- Superadmin can always see all notifications (for admin page)
CREATE POLICY "Superadmin can view all notificacoes"
ON public.notificacoes_sistema
FOR SELECT
TO authenticated
USING (is_superadmin());
