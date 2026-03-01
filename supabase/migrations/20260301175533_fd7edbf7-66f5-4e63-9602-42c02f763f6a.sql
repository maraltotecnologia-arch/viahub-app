
CREATE TABLE IF NOT EXISTS public.templates_orcamento (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agencia_id UUID NOT NULL REFERENCES public.agencias(id),
  nome TEXT NOT NULL,
  descricao TEXT,
  forma_pagamento TEXT,
  observacoes TEXT,
  criado_em TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.itens_template (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.templates_orcamento(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  descricao TEXT,
  valor_custo NUMERIC DEFAULT 0,
  markup_percentual NUMERIC DEFAULT 0,
  taxa_fixa NUMERIC DEFAULT 0,
  valor_final NUMERIC DEFAULT 0,
  quantidade INTEGER DEFAULT 1
);

ALTER TABLE public.templates_orcamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_template ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency can manage own templates"
ON public.templates_orcamento FOR ALL TO authenticated
USING (agencia_id = public.get_user_agencia_id())
WITH CHECK (agencia_id = public.get_user_agencia_id());

CREATE POLICY "Agency can view own templates"
ON public.templates_orcamento FOR SELECT TO authenticated
USING (agencia_id = public.get_user_agencia_id());

CREATE POLICY "Agency can manage own template items"
ON public.itens_template FOR ALL TO authenticated
USING (
  template_id IN (
    SELECT id FROM public.templates_orcamento
    WHERE agencia_id = public.get_user_agencia_id()
  )
)
WITH CHECK (
  template_id IN (
    SELECT id FROM public.templates_orcamento
    WHERE agencia_id = public.get_user_agencia_id()
  )
);

CREATE POLICY "Agency can view own template items"
ON public.itens_template FOR SELECT TO authenticated
USING (
  template_id IN (
    SELECT id FROM public.templates_orcamento
    WHERE agencia_id = public.get_user_agencia_id()
  )
);
