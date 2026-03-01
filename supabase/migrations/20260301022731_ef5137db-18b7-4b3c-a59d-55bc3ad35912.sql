ALTER TABLE public.orcamentos ADD COLUMN IF NOT EXISTS enviado_whatsapp BOOLEAN DEFAULT false;
ALTER TABLE public.orcamentos ADD COLUMN IF NOT EXISTS enviado_whatsapp_em TIMESTAMP WITH TIME ZONE;