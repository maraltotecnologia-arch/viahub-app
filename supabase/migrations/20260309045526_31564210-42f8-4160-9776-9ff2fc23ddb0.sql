-- Add link column to notificacoes_sistema for click-to-redirect
ALTER TABLE public.notificacoes_sistema
ADD COLUMN IF NOT EXISTS link text DEFAULT NULL;

-- Update ticket message notification trigger to include link
CREATE OR REPLACE FUNCTION public.notify_ticket_message_from_support()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  _ticket RECORD;
  _visual_id text;
BEGIN
  IF NEW.is_superadmin IS DISTINCT FROM true THEN
    RETURN NEW;
  END IF;

  SELECT id, agencia_id, prioridade, ticket_number
  INTO _ticket
  FROM public.tickets
  WHERE id = NEW.ticket_id;

  IF _ticket.id IS NULL THEN
    RETURN NEW;
  END IF;

  _visual_id := public.ticket_visual_id(_ticket.prioridade, _ticket.ticket_number);

  INSERT INTO public.notificacoes_sistema (
    titulo, mensagem, tipo, agencia_id, destinatario, ativo, link
  ) VALUES (
    'Atualização de chamado',
    'Nova resposta no chamado ' || _visual_id || '.',
    'info',
    _ticket.agencia_id,
    'agencia',
    true,
    '/suporte'
  );

  RETURN NEW;
END;
$$;

-- Update ticket status change trigger to include link
CREATE OR REPLACE FUNCTION public.notify_ticket_status_change_from_support()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  _visual_id text;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  IF NOT public.is_superadmin() THEN
    RETURN NEW;
  END IF;

  _visual_id := public.ticket_visual_id(NEW.prioridade, NEW.ticket_number);

  INSERT INTO public.notificacoes_sistema (
    titulo, mensagem, tipo, agencia_id, destinatario, ativo, link
  ) VALUES (
    'Status de chamado atualizado',
    'Seu chamado ' || _visual_id || ' foi atualizado.',
    'info',
    NEW.agencia_id,
    'agencia',
    true,
    '/suporte'
  );

  RETURN NEW;
END;
$$;
