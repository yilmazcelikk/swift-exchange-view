
CREATE OR REPLACE FUNCTION public.notify_telegram_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_payload jsonb;
  v_user_name text;
  v_event_type text;
BEGIN
  SELECT full_name INTO v_user_name FROM public.profiles WHERE user_id = NEW.user_id;

  IF TG_OP = 'INSERT' AND NEW.status = 'open' THEN
    v_event_type := 'position_open';
    v_payload := jsonb_build_object(
      'event_type', v_event_type,
      'data', jsonb_build_object(
        'user_name', COALESCE(v_user_name, 'Bilinmeyen'),
        'symbol_name', NEW.symbol_name,
        'type', NEW.type,
        'lots', NEW.lots,
        'entry_price', NEW.entry_price,
        'leverage', NEW.leverage,
        'order_type', NEW.order_type
      )
    );

  ELSIF TG_OP = 'UPDATE' AND OLD.status IN ('open', 'pending') AND NEW.status = 'closed' THEN
    v_event_type := 'position_close';
    v_payload := jsonb_build_object(
      'event_type', v_event_type,
      'data', jsonb_build_object(
        'user_name', COALESCE(v_user_name, 'Bilinmeyen'),
        'symbol_name', NEW.symbol_name,
        'type', NEW.type,
        'lots', NEW.lots,
        'entry_price', NEW.entry_price,
        'close_price', NEW.current_price,
        'pnl', NEW.pnl,
        'close_reason', NEW.close_reason
      )
    );
  ELSE
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := 'https://yefnvfawhjfuscnrcuzn.supabase.co/functions/v1/telegram-notify',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InllZm52ZmF3aGpmdXNjbnJjdXpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxOTY2MzYsImV4cCI6MjA4Nzc3MjYzNn0.b4rjWhvKyCsuil1K9OcAs4vjSutkoGAYMAwo8uG7qNc"}'::jsonb,
    body := v_payload
  );

  RETURN NEW;
END;
$function$;

CREATE TRIGGER notify_telegram_on_order
  AFTER INSERT OR UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_telegram_order();
