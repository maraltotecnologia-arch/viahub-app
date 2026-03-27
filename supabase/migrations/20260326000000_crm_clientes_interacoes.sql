-- =============================================================
-- CRM Enhancement: clientes, contatos_cliente, interacoes_cliente
-- =============================================================

-- -------------------------------------------------------------
-- 1. New columns on clientes
-- -------------------------------------------------------------
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS origem_lead       TEXT,
  ADD COLUMN IF NOT EXISTS temperatura       TEXT DEFAULT 'frio',
  ADD COLUMN IF NOT EXISTS tags              TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS data_nascimento   DATE,
  ADD COLUMN IF NOT EXISTS preferencias      JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS credito_disponivel NUMERIC(10,2) DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_clientes_origem_lead'
      AND conrelid = 'public.clientes'::regclass
  ) THEN
    ALTER TABLE public.clientes
      ADD CONSTRAINT chk_clientes_origem_lead CHECK (
        origem_lead IS NULL OR origem_lead IN (
          'instagram','facebook','indicacao','google','site','whatsapp','email','outros'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_clientes_temperatura'
      AND conrelid = 'public.clientes'::regclass
  ) THEN
    ALTER TABLE public.clientes
      ADD CONSTRAINT chk_clientes_temperatura CHECK (
        temperatura IS NULL OR temperatura IN ('frio','morno','quente')
      );
  END IF;
END $$;

-- -------------------------------------------------------------
-- 2. contatos_cliente — add missing column created_at
-- (table already exists; criado_em column covers the original spec)
-- -------------------------------------------------------------
ALTER TABLE public.contatos_cliente
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- -------------------------------------------------------------
-- 3. New table: interacoes_cliente
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.interacoes_cliente (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id     UUID        NOT NULL REFERENCES public.clientes(id)  ON DELETE CASCADE,
  agencia_id     UUID        NOT NULL REFERENCES public.agencias(id)  ON DELETE CASCADE,
  usuario_id     UUID        REFERENCES public.usuarios(id),
  tipo           TEXT        NOT NULL,
  descricao      TEXT        NOT NULL,
  data_interacao TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at     TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT chk_interacoes_tipo CHECK (
    tipo IN ('ligacao','reuniao','email','whatsapp','visita','outros')
  )
);

ALTER TABLE public.interacoes_cliente ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------------
-- 4. Indexes
-- -------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_clientes_origem_lead
  ON public.clientes(agencia_id, origem_lead);

CREATE INDEX IF NOT EXISTS idx_clientes_temperatura
  ON public.clientes(agencia_id, temperatura);

CREATE INDEX IF NOT EXISTS idx_interacoes_cliente
  ON public.interacoes_cliente(cliente_id, data_interacao DESC);

CREATE INDEX IF NOT EXISTS idx_interacoes_agencia
  ON public.interacoes_cliente(agencia_id, data_interacao DESC);

-- -------------------------------------------------------------
-- 5. RLS policies — interacoes_cliente
-- -------------------------------------------------------------
DROP POLICY IF EXISTS "Agencia acessa suas interacoes"          ON public.interacoes_cliente;
DROP POLICY IF EXISTS "Superadmin acessa todas as interacoes"   ON public.interacoes_cliente;

CREATE POLICY "Agencia acessa suas interacoes"
  ON public.interacoes_cliente FOR ALL TO authenticated
  USING     (agencia_id = public.get_user_agencia_id())
  WITH CHECK (agencia_id = public.get_user_agencia_id());

CREATE POLICY "Superadmin acessa todas as interacoes"
  ON public.interacoes_cliente FOR SELECT TO authenticated
  USING (public.is_superadmin());
