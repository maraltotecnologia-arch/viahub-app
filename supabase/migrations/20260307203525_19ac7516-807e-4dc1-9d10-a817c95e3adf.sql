
ALTER TABLE public.agencias ADD COLUMN IF NOT EXISTS forma_pagamento TEXT;
ALTER TABLE public.notificacoes_sistema ADD COLUMN IF NOT EXISTS status_pagamento_alvo TEXT DEFAULT NULL;
