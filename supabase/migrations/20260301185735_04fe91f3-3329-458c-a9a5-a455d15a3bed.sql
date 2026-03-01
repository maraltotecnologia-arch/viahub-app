
-- Add horario_funcionamento column to agencias
ALTER TABLE agencias 
ADD COLUMN IF NOT EXISTS horario_funcionamento 
JSONB DEFAULT '{
  "segunda": {"ativo": true, "inicio": "08:00", "fim": "18:00"},
  "terca": {"ativo": true, "inicio": "08:00", "fim": "18:00"},
  "quarta": {"ativo": true, "inicio": "08:00", "fim": "18:00"},
  "quinta": {"ativo": true, "inicio": "08:00", "fim": "18:00"},
  "sexta": {"ativo": true, "inicio": "08:00", "fim": "18:00"},
  "sabado": {"ativo": true, "inicio": "08:00", "fim": "12:00"},
  "domingo": {"ativo": false, "inicio": "", "fim": ""}
}';

-- Create notificacoes_sistema table
CREATE TABLE IF NOT EXISTS notificacoes_sistema (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  tipo TEXT DEFAULT 'info',
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE notificacoes_sistema ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios podem ver notificacoes ativas"
ON notificacoes_sistema FOR SELECT 
TO authenticated USING (ativo = true);

-- Create notificacoes_lidas table
CREATE TABLE IF NOT EXISTS notificacoes_lidas (
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  notificacao_id UUID REFERENCES notificacoes_sistema(id) ON DELETE CASCADE,
  lida_em TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (usuario_id, notificacao_id)
);

ALTER TABLE notificacoes_lidas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuario gerencia suas leituras"
ON notificacoes_lidas FOR ALL TO authenticated
USING (usuario_id = auth.uid())
WITH CHECK (usuario_id = auth.uid());
