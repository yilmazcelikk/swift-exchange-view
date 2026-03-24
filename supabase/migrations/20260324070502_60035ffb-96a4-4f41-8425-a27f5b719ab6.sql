CREATE OR REPLACE FUNCTION public.notify_telegram()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_event_type text;
  v_payload jsonb;
  v_user_name text;
  v_email text;
BEGIN
  IF TG_TABLE_NAME = 'profiles' AND TG_OP = 'INSERT' THEN
    v_event_type := 'new_user';
    SELECT email INTO v_email FROM auth.users WHERE id = NEW.user_id;
    v_payload := jsonb_build_object(
      'event_type', v_event_type,
      'data', jsonb_build_object(
        'full_name', COALESCE(NEW.full_name, ''),
        'meta_id', NEW.meta_id,
        'email', COALESCE(v_email, '')
      )
    );
  ELSIF TG_TABLE_NAME = 'documents' AND TG_OP = 'INSERT' THEN
    v_event_type := 'new_document';
    SELECT full_name INTO v_user_name FROM public.profiles WHERE user_id = NEW.user_id;
    v_payload := jsonb_build_object(
      'event_type', v_event_type,
      'data', jsonb_build_object(
        'user_name', COALESCE(v_user_name, 'Bilinmeyen'),
        'type', NEW.type
      )
    );
  ELSIF TG_TABLE_NAME = 'transactions' AND TG_OP = 'INSERT' THEN
    SELECT full_name INTO v_user_name FROM public.profiles WHERE user_id = NEW.user_id;
    IF NEW.type = 'deposit' THEN
      v_event_type := 'new_deposit';
    ELSE
      v_event_type := 'new_withdrawal';
    END IF;
    v_payload := jsonb_build_object(
      'event_type', v_event_type,
      'data', jsonb_build_object(
        'user_name', COALESCE(v_user_name, 'Bilinmeyen'),
        'amount', NEW.amount,
        'currency', NEW.currency
      )
    );
  ELSE
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := 'https://pvummwblnoukhhskvjjh.supabase.co/functions/v1/telegram-notify',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2dW1td2Jsbm91a2hoc2t2ampoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NzI3MDUsImV4cCI6MjA4OTI0ODcwNX0.12cr6iQKwBXBs5EFmisKyGMWmRiS3LzCdplQ2HUh2Hw"}'::jsonb,
    body := v_payload
  );

  RETURN NEW;
END;
$function$;

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
    url := 'https://pvummwblnoukhhskvjjh.supabase.co/functions/v1/telegram-notify',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2dW1td2Jsbm91a2hoc2t2ampoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NzI3MDUsImV4cCI6MjA4OTI0ODcwNX0.12cr6iQKwBXBs5EFmisKyGMWmRiS3LzCdplQ2HUh2Hw"}'::jsonb,
    body := v_payload
  );

  RETURN NEW;
END;
$function$;