-- Add email tracking columns to orcamentos
ALTER TABLE orcamentos
  ADD COLUMN IF NOT EXISTS enviado_email boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS enviado_email_em timestamptz,
  ADD COLUMN IF NOT EXISTS email_aberto_em timestamptz;
