
-- Add token_publico column
ALTER TABLE orcamentos ADD COLUMN IF NOT EXISTS token_publico TEXT UNIQUE DEFAULT NULL;

-- Allow anon to read orcamentos by token
CREATE POLICY "Acesso publico por token"
ON orcamentos FOR SELECT
TO anon
USING (token_publico IS NOT NULL);

-- Allow anon to read itens via token
CREATE POLICY "Acesso publico itens por token"
ON itens_orcamento FOR SELECT
TO anon
USING (
  orcamento_id IN (
    SELECT id FROM orcamentos WHERE token_publico IS NOT NULL
  )
);

-- Allow anon to read agencia data for public quotes
CREATE POLICY "Acesso publico agencia por token"
ON agencias FOR SELECT
TO anon
USING (
  id IN (
    SELECT agencia_id FROM orcamentos WHERE token_publico IS NOT NULL
  )
);

-- Allow anon to read cliente data for public quotes
CREATE POLICY "Acesso publico cliente por token"
ON clientes FOR SELECT
TO anon
USING (
  id IN (
    SELECT cliente_id FROM orcamentos WHERE token_publico IS NOT NULL
  )
);
