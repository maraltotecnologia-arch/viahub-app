
CREATE TABLE public.whatsapp_instancias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agencia_id UUID REFERENCES public.agencias(id) ON DELETE CASCADE UNIQUE NOT NULL,
  instance_name TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'disconnected',
  numero TEXT,
  ultima_verificacao TIMESTAMPTZ,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.agencias
ADD COLUMN IF NOT EXISTS whatsapp_mensagem_orcamento TEXT DEFAULT 'Olá {nome_cliente}! 😊 Segue em anexo o orçamento *{numero_orcamento}* referente à sua solicitação. Qualquer dúvida estamos à disposição! — {nome_agencia}';

ALTER TABLE public.whatsapp_instancias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agencia ve sua instancia"
  ON public.whatsapp_instancias FOR ALL TO authenticated
  USING (agencia_id = get_user_agencia_id())
  WITH CHECK (agencia_id = get_user_agencia_id());
