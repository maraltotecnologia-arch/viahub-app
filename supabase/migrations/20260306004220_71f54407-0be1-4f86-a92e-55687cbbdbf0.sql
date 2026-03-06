ALTER TABLE public.agencias ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now();

CREATE OR REPLACE TRIGGER update_agencias_atualizado_em
  BEFORE UPDATE ON public.agencias
  FOR EACH ROW
  EXECUTE FUNCTION public.update_atualizado_em();