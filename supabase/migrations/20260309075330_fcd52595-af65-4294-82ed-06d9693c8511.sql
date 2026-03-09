-- Enable pg_net extension for HTTP calls from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create a function that calls the telegram-notify edge function via pg_net
CREATE OR REPLACE FUNCTION public.notify_telegram()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_event_type text;
  v_payload jsonb;
  v_user_name text;
  v_email text;
BEGIN
  -- Determine event type and build payload
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

  -- Call edge function via pg_net
  PERFORM net.http_post(
    url := 'https://yefnvfawhjfuscnrcuzn.supabase.co/functions/v1/telegram-notify',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InllZm52ZmF3aGpmdXNjbnJjdXpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxOTY2MzYsImV4cCI6MjA4Nzc3MjYzNn0.b4rjWhvKyCsuil1K9OcAs4vjSutkoGAYMAwo8uG7qNc"}'::jsonb,
    body := v_payload
  );

  RETURN NEW;
END;
$$;

-- Create triggers
CREATE TRIGGER on_new_profile_telegram
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_telegram();

CREATE TRIGGER on_new_document_telegram
  AFTER INSERT ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_telegram();

CREATE TRIGGER on_new_transaction_telegram
  AFTER INSERT ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_telegram();
