
-- Performance indexes for multi-tenant isolation
CREATE INDEX IF NOT EXISTS idx_usuarios_agencia_id ON public.usuarios(agencia_id);
CREATE INDEX IF NOT EXISTS idx_orcamentos_agencia_id ON public.orcamentos(agencia_id);
CREATE INDEX IF NOT EXISTS idx_orcamentos_agencia_status ON public.orcamentos(agencia_id, status);
CREATE INDEX IF NOT EXISTS idx_orcamentos_agencia_criado ON public.orcamentos(agencia_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_clientes_agencia_id ON public.clientes(agencia_id);
CREATE INDEX IF NOT EXISTS idx_itens_orcamento_orcamento_id ON public.itens_orcamento(orcamento_id);
CREATE INDEX IF NOT EXISTS idx_historico_orcamento_id ON public.historico_orcamento(orcamento_id);
CREATE INDEX IF NOT EXISTS idx_comentarios_orcamento_id ON public.comentarios_orcamento(orcamento_id);
CREATE INDEX IF NOT EXISTS idx_contatos_cliente_id ON public.contatos_cliente(cliente_id);
CREATE INDEX IF NOT EXISTS idx_asaas_pagamentos_agencia ON public.asaas_pagamentos(agencia_id);
CREATE INDEX IF NOT EXISTS idx_asaas_pagamentos_status ON public.asaas_pagamentos(agencia_id, status);
CREATE INDEX IF NOT EXISTS idx_notificacoes_lidas_usuario ON public.notificacoes_lidas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_logs_acesso_agencia ON public.logs_acesso(agencia_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_instancias_agencia ON public.whatsapp_instancias(agencia_id);

-- Search indexes
CREATE INDEX IF NOT EXISTS idx_clientes_nome ON public.clientes(agencia_id, nome);
CREATE INDEX IF NOT EXISTS idx_orcamentos_numero ON public.orcamentos(agencia_id, numero_orcamento);
CREATE INDEX IF NOT EXISTS idx_orcamentos_cliente ON public.orcamentos(agencia_id, cliente_id);

-- Partial index for public token lookups
CREATE INDEX IF NOT EXISTS idx_orcamentos_token ON public.orcamentos(token_publico) WHERE token_publico IS NOT NULL;

-- Index for validade-based alert queries
CREATE INDEX IF NOT EXISTS idx_orcamentos_agencia_validade ON public.orcamentos(agencia_id, validade) WHERE status IN ('rascunho', 'enviado');

-- Index for metas queries
CREATE INDEX IF NOT EXISTS idx_metas_agentes_lookup ON public.metas_agentes(agencia_id, usuario_id, mes, ano);

-- Index for templates
CREATE INDEX IF NOT EXISTS idx_templates_orcamento_agencia ON public.templates_orcamento(agencia_id);
CREATE INDEX IF NOT EXISTS idx_itens_template_template ON public.itens_template(template_id);

-- Index for tickets
CREATE INDEX IF NOT EXISTS idx_tickets_agencia ON public.tickets(agencia_id);
CREATE INDEX IF NOT EXISTS idx_ticket_mensagens_ticket ON public.ticket_mensagens(ticket_id);

-- Index for notifications
CREATE INDEX IF NOT EXISTS idx_notificacoes_sistema_ativo ON public.notificacoes_sistema(ativo, criado_em DESC) WHERE ativo = true;
