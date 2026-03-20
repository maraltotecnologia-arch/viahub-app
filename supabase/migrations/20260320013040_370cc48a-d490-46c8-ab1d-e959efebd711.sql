
-- =============================================
-- VIAHUB SECURITY AUDIT - RLS CLEANUP & FIXES
-- =============================================

-- 1. Create helper function get_user_cargo()
CREATE OR REPLACE FUNCTION public.get_user_cargo()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT cargo FROM public.usuarios WHERE id = auth.uid()
$$;

-- =============================================
-- 2. DROP DUPLICATE POLICIES (subquery-based duplicates of function-based ones)
-- =============================================

-- agencias duplicates
DROP POLICY IF EXISTS "usuarios podem ler sua agencia" ON public.agencias;
DROP POLICY IF EXISTS "usuarios podem atualizar sua agencia" ON public.agencias;

-- clientes duplicates
DROP POLICY IF EXISTS "usuarios podem ler clientes da sua agencia" ON public.clientes;
DROP POLICY IF EXISTS "usuarios podem inserir clientes da sua agencia" ON public.clientes;
DROP POLICY IF EXISTS "usuarios podem atualizar clientes da sua agencia" ON public.clientes;

-- configuracoes_markup duplicates
DROP POLICY IF EXISTS "usuarios podem ler markup de sua agencia" ON public.configuracoes_markup;
DROP POLICY IF EXISTS "usuarios podem inserir markup de sua agencia" ON public.configuracoes_markup;
DROP POLICY IF EXISTS "usuarios podem atualizar markup de sua agencia" ON public.configuracoes_markup;

-- usuarios duplicate
DROP POLICY IF EXISTS "usuarios podem ler seu proprio perfil" ON public.usuarios;

-- =============================================
-- 3. ADD MISSING POLICIES
-- =============================================

-- logs_acesso: Admin can view own agency logs
CREATE POLICY "Admin can view agency logs"
ON public.logs_acesso FOR SELECT TO authenticated
USING (agencia_id = get_user_agencia_id() AND is_agency_admin());

-- usuarios: Admin can update agency users (not just own profile)
CREATE POLICY "Admin can update agency users"
ON public.usuarios FOR UPDATE TO authenticated
USING (agencia_id = get_user_agencia_id() AND is_agency_admin())
WITH CHECK (agencia_id = get_user_agencia_id());

-- superadmin views for historico/comentarios
CREATE POLICY "Superadmin can view all historico"
ON public.historico_orcamento FOR SELECT TO authenticated
USING (is_superadmin());

CREATE POLICY "Superadmin can view all comentarios"
ON public.comentarios_orcamento FOR SELECT TO authenticated
USING (is_superadmin());

-- superadmin views for templates
CREATE POLICY "Superadmin can view all templates"
ON public.templates_orcamento FOR SELECT TO authenticated
USING (is_superadmin());

CREATE POLICY "Superadmin can view all template items"
ON public.itens_template FOR SELECT TO authenticated
USING (is_superadmin());

-- superadmin views for whatsapp
CREATE POLICY "Superadmin can view all whatsapp"
ON public.whatsapp_instancias FOR SELECT TO authenticated
USING (is_superadmin());

-- superadmin views for contatos
CREATE POLICY "Superadmin can view all contatos"
ON public.contatos_cliente FOR SELECT TO authenticated
USING (is_superadmin());

-- =============================================
-- 4. SERVICE_ROLE BYPASSES (for edge functions)
-- =============================================

-- asaas_pagamentos: service_role full access (webhooks insert/update)
CREATE POLICY "Service role manages asaas_pagamentos"
ON public.asaas_pagamentos FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- logs_acesso: service_role full access (edge function inserts)
CREATE POLICY "Service role manages logs_acesso"
ON public.logs_acesso FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- whatsapp_instancias: service_role bypass
CREATE POLICY "Service role manages whatsapp"
ON public.whatsapp_instancias FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- notificacoes_sistema: service_role bypass (webhooks create notifications)
CREATE POLICY "Service role manages notificacoes"
ON public.notificacoes_sistema FOR ALL TO service_role
USING (true) WITH CHECK (true);
