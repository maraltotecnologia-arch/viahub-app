-- =============================================================
-- Enhancements: itens_orcamento + orcamentos
-- =============================================================

-- -------------------------------------------------------------
-- 1. itens_orcamento — novas colunas
-- -------------------------------------------------------------
ALTER TABLE public.itens_orcamento
  ADD COLUMN IF NOT EXISTS categoria     TEXT,
  ADD COLUMN IF NOT EXISTS num_viajantes INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_itens_categoria'
      AND conrelid = 'public.itens_orcamento'::regclass
  ) THEN
    ALTER TABLE public.itens_orcamento
      ADD CONSTRAINT chk_itens_categoria CHECK (
        categoria IS NULL OR categoria IN (
          'aereo','hospedagem','transfer','seguro','passeio','taxa','credito','outros'
        )
      );
  END IF;
END $$;

-- -------------------------------------------------------------
-- 2. orcamentos — novas colunas
-- -------------------------------------------------------------
ALTER TABLE public.orcamentos
  ADD COLUMN IF NOT EXISTS validade_dias  INTEGER DEFAULT 5,
  ADD COLUMN IF NOT EXISTS data_validade  DATE,
  ADD COLUMN IF NOT EXISTS status_viagem  TEXT DEFAULT 'cotacao',
  ADD COLUMN IF NOT EXISTS expirado       BOOLEAN DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_orcamentos_status_viagem'
      AND conrelid = 'public.orcamentos'::regclass
  ) THEN
    ALTER TABLE public.orcamentos
      ADD CONSTRAINT chk_orcamentos_status_viagem CHECK (
        status_viagem IN (
          'cotacao','confirmado','em_viagem','concluido','cancelado'
        )
      );
  END IF;
END $$;

-- -------------------------------------------------------------
-- 3. Índices
-- -------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_itens_categoria
  ON public.itens_orcamento(orcamento_id, categoria);

CREATE INDEX IF NOT EXISTS idx_orcamentos_status_viagem
  ON public.orcamentos(agencia_id, status_viagem);

CREATE INDEX IF NOT EXISTS idx_orcamentos_validade
  ON public.orcamentos(data_validade)
  WHERE expirado = false;

-- -------------------------------------------------------------
-- 4. Trigger — calcular data_validade automaticamente
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.calcular_data_validade()
RETURNS TRIGGER AS $$
BEGIN
  NEW.data_validade := CURRENT_DATE + NEW.validade_dias;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calcular_validade ON public.orcamentos;

CREATE TRIGGER trg_calcular_validade
  BEFORE INSERT OR UPDATE OF validade_dias
  ON public.orcamentos
  FOR EACH ROW EXECUTE FUNCTION public.calcular_data_validade();

-- -------------------------------------------------------------
-- 5. Backfill data_validade em registros existentes
-- -------------------------------------------------------------
UPDATE public.orcamentos
SET data_validade = CURRENT_DATE + validade_dias
WHERE data_validade IS NULL AND validade_dias IS NOT NULL;
