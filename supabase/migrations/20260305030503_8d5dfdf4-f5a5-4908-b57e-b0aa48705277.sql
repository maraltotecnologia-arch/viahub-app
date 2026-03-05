
ALTER TABLE public.orcamentos
ADD COLUMN IF NOT EXISTS aprovado_pelo_cliente_em TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE public.orcamentos
ADD COLUMN IF NOT EXISTS aprovado_pelo_cliente_nome TEXT DEFAULT NULL;
