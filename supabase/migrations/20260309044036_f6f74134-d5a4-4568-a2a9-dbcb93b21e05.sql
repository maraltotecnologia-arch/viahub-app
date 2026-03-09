-- Trigger to notify agency when superadmin sends a message
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
  -- Only trigger if message is from superadmin
  IF NEW.is_superadmin IS DISTINCT FROM true THEN
    RETURN NEW;
  END IF;

  -- Get ticket info
  SELECT id, agencia_id, prioridade, ticket_number
  INTO _ticket
  FROM public.tickets
  WHERE id = NEW.ticket_id;

  IF _ticket.id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Generate visual ID
  _visual_id := public.ticket_visual_id(_ticket.prioridade, _ticket.ticket_number);

  -- Insert notification
  INSERT INTO public.notificacoes_sistema (
    titulo,
    mensagem,
    tipo,
    agencia_id,
    destinatario,
    ativo
  ) VALUES (
    'Atualização de chamado',
    'Nova resposta no chamado ' || _visual_id || '.',
    'info',
    _ticket.agencia_id,
    'agencia',
    true
  );

  RETURN NEW;
END;
$$;

-- Create trigger on ticket_mensagens
DROP TRIGGER IF EXISTS on_ticket_message_from_support ON public.ticket_mensagens;
CREATE TRIGGER on_ticket_message_from_support
  AFTER INSERT ON public.ticket_mensagens
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_ticket_message_from_support();

-- Trigger to notify agency when superadmin changes ticket status
CREATE OR REPLACE FUNCTION public.notify_ticket_status_change_from_support()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  _visual_id text;
BEGIN
  -- Only trigger if status actually changed
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  -- Only notify if the change is made by superadmin
  IF NOT public.is_superadmin() THEN
    RETURN NEW;
  END IF;

  -- Generate visual ID
  _visual_id := public.ticket_visual_id(NEW.prioridade, NEW.ticket_number);

  -- Insert notification
  INSERT INTO public.notificacoes_sistema (
    titulo,
    mensagem,
    tipo,
    agencia_id,
    destinatario,
    ativo
  ) VALUES (
    'Status de chamado atualizado',
    'Seu chamado ' || _visual_id || ' foi atualizado.',
    'info',
    NEW.agencia_id,
    'agencia',
    true
  );

  RETURN NEW;
END;
$$;

-- Create trigger on tickets
DROP TRIGGER IF EXISTS on_ticket_status_change_from_support ON public.tickets;
CREATE TRIGGER on_ticket_status_change_from_support
  AFTER UPDATE ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_ticket_status_change_from_support();

-- Trigger to update atualizado_em on tickets
CREATE OR REPLACE FUNCTION public.update_atualizado_em()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO public
AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_tickets_atualizado_em ON public.tickets;
CREATE TRIGGER update_tickets_atualizado_em
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_atualizado_em();