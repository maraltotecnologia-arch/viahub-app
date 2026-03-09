-- Create tickets table
CREATE TABLE public.tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agencia_id UUID NOT NULL REFERENCES public.agencias(id) ON DELETE CASCADE,
  assunto TEXT NOT NULL,
  categoria TEXT NOT NULL,
  prioridade TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Aberto',
  descricao TEXT NOT NULL,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Create tickets policies
CREATE POLICY "Agencia can manage own tickets"
ON public.tickets
FOR ALL
USING (agencia_id = get_user_agencia_id())
WITH CHECK (agencia_id = get_user_agencia_id());

CREATE POLICY "Superadmin can view and update all tickets"
ON public.tickets
FOR ALL
USING (is_superadmin())
WITH CHECK (is_superadmin());

-- Create ticket_mensagens table
CREATE TABLE public.ticket_mensagens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  mensagem TEXT NOT NULL,
  is_superadmin BOOLEAN NOT NULL DEFAULT false,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ticket_mensagens ENABLE ROW LEVEL SECURITY;

-- Create ticket_mensagens policies
CREATE POLICY "Agencia can manage own ticket messages"
ON public.ticket_mensagens
FOR ALL
USING (ticket_id IN (SELECT id FROM public.tickets WHERE agencia_id = get_user_agencia_id()))
WITH CHECK (ticket_id IN (SELECT id FROM public.tickets WHERE agencia_id = get_user_agencia_id()));

CREATE POLICY "Superadmin can manage all ticket messages"
ON public.ticket_mensagens
FOR ALL
USING (is_superadmin())
WITH CHECK (is_superadmin());

-- Trigger for update_atualizado_em on tickets
CREATE TRIGGER update_tickets_atualizado_em
BEFORE UPDATE ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION public.update_atualizado_em();