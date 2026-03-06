
-- Migrate existing plans to new simplified plan names
UPDATE public.agencias SET plano = 'starter' WHERE plano IN ('starter_a', 'starter_b');
UPDATE public.agencias SET plano = 'pro' WHERE plano IN ('pro_a', 'pro_b');
UPDATE public.agencias SET plano = 'elite' WHERE plano IN ('agency_c', 'white_label');

-- Set default to 'starter'
ALTER TABLE public.agencias ALTER COLUMN plano SET DEFAULT 'starter';

-- Add Asaas billing columns to agencias
ALTER TABLE public.agencias ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT;
ALTER TABLE public.agencias ADD COLUMN IF NOT EXISTS asaas_subscription_id TEXT;
ALTER TABLE public.agencias ADD COLUMN IF NOT EXISTS status_pagamento TEXT DEFAULT 'ativo';
ALTER TABLE public.agencias ADD COLUMN IF NOT EXISTS data_bloqueio TIMESTAMPTZ;
ALTER TABLE public.agencias ADD COLUMN IF NOT EXISTS data_proximo_vencimento DATE;

-- Create asaas_pagamentos table
CREATE TABLE IF NOT EXISTS public.asaas_pagamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agencia_id UUID REFERENCES public.agencias(id) ON DELETE CASCADE NOT NULL,
  asaas_payment_id TEXT,
  valor DECIMAL(10,2),
  status TEXT,
  forma_pagamento TEXT,
  vencimento DATE,
  pago_em TIMESTAMPTZ,
  pix_qr_code TEXT,
  pix_copia_cola TEXT,
  boleto_url TEXT,
  boleto_linha_digitavel TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on asaas_pagamentos
ALTER TABLE public.asaas_pagamentos ENABLE ROW LEVEL SECURITY;

-- Superadmin can view all payments
CREATE POLICY "Superadmin can view all asaas_pagamentos"
ON public.asaas_pagamentos
FOR SELECT
TO authenticated
USING (public.is_superadmin());

-- Agency admins can view their own payments
CREATE POLICY "Agency can view own asaas_pagamentos"
ON public.asaas_pagamentos
FOR SELECT
TO authenticated
USING (agencia_id = public.get_user_agencia_id());
