-- Add ON DELETE CASCADE / SET NULL rules to all foreign keys
-- This prevents orphaned data and ensures referential integrity

-- 1. orcamentos.cliente_id → SET NULL (preserve quotes if client deleted)
ALTER TABLE public.orcamentos DROP CONSTRAINT IF EXISTS orcamentos_cliente_id_fkey;
ALTER TABLE public.orcamentos ADD CONSTRAINT orcamentos_cliente_id_fkey
  FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE SET NULL;

-- 2. itens_orcamento.orcamento_id → CASCADE (delete items when quote deleted)
ALTER TABLE public.itens_orcamento DROP CONSTRAINT IF EXISTS itens_orcamento_orcamento_id_fkey;
ALTER TABLE public.itens_orcamento ADD CONSTRAINT itens_orcamento_orcamento_id_fkey
  FOREIGN KEY (orcamento_id) REFERENCES public.orcamentos(id) ON DELETE CASCADE;

-- 3. historico_orcamento.orcamento_id → CASCADE
ALTER TABLE public.historico_orcamento DROP CONSTRAINT IF EXISTS historico_orcamento_orcamento_id_fkey;
ALTER TABLE public.historico_orcamento ADD CONSTRAINT historico_orcamento_orcamento_id_fkey
  FOREIGN KEY (orcamento_id) REFERENCES public.orcamentos(id) ON DELETE CASCADE;

-- 4. comentarios_orcamento.orcamento_id → CASCADE
ALTER TABLE public.comentarios_orcamento DROP CONSTRAINT IF EXISTS comentarios_orcamento_orcamento_id_fkey;
ALTER TABLE public.comentarios_orcamento ADD CONSTRAINT comentarios_orcamento_orcamento_id_fkey
  FOREIGN KEY (orcamento_id) REFERENCES public.orcamentos(id) ON DELETE CASCADE;

-- 5. contatos_cliente.cliente_id → CASCADE (delete contacts when client deleted)
ALTER TABLE public.contatos_cliente DROP CONSTRAINT IF EXISTS contatos_cliente_cliente_id_fkey;
ALTER TABLE public.contatos_cliente ADD CONSTRAINT contatos_cliente_cliente_id_fkey
  FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE CASCADE;

-- 6. itens_template.template_id → CASCADE
ALTER TABLE public.itens_template DROP CONSTRAINT IF EXISTS itens_template_template_id_fkey;
ALTER TABLE public.itens_template ADD CONSTRAINT itens_template_template_id_fkey
  FOREIGN KEY (template_id) REFERENCES public.templates_orcamento(id) ON DELETE CASCADE;

-- 7. metas_agentes.usuario_id → CASCADE
ALTER TABLE public.metas_agentes DROP CONSTRAINT IF EXISTS metas_agentes_usuario_id_fkey;
ALTER TABLE public.metas_agentes ADD CONSTRAINT metas_agentes_usuario_id_fkey
  FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;

-- 8. notificacoes_lidas.notificacao_id → CASCADE
ALTER TABLE public.notificacoes_lidas DROP CONSTRAINT IF EXISTS notificacoes_lidas_notificacao_id_fkey;
ALTER TABLE public.notificacoes_lidas ADD CONSTRAINT notificacoes_lidas_notificacao_id_fkey
  FOREIGN KEY (notificacao_id) REFERENCES public.notificacoes_sistema(id) ON DELETE CASCADE;

-- 9. asaas_pagamentos.agencia_id → CASCADE
ALTER TABLE public.asaas_pagamentos DROP CONSTRAINT IF EXISTS asaas_pagamentos_agencia_id_fkey;
ALTER TABLE public.asaas_pagamentos ADD CONSTRAINT asaas_pagamentos_agencia_id_fkey
  FOREIGN KEY (agencia_id) REFERENCES public.agencias(id) ON DELETE CASCADE;

-- 10. logs_acesso.agencia_id → CASCADE
ALTER TABLE public.logs_acesso DROP CONSTRAINT IF EXISTS logs_acesso_agencia_id_fkey;
ALTER TABLE public.logs_acesso ADD CONSTRAINT logs_acesso_agencia_id_fkey
  FOREIGN KEY (agencia_id) REFERENCES public.agencias(id) ON DELETE CASCADE;