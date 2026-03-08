CREATE OR REPLACE FUNCTION public.restrict_order_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Allow backend automation (service role) to update system fields like pnl/current_price/status
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Only allow strict field updates for non-admin users
  IF NOT has_role(auth.uid(), 'admin') THEN
    IF NEW.entry_price IS DISTINCT FROM OLD.entry_price
       OR NEW.pnl IS DISTINCT FROM OLD.pnl
       OR NEW.lots IS DISTINCT FROM OLD.lots
       OR NEW.leverage IS DISTINCT FROM OLD.leverage
       OR NEW.symbol_id IS DISTINCT FROM OLD.symbol_id
       OR NEW.symbol_name IS DISTINCT FROM OLD.symbol_name
       OR NEW.type IS DISTINCT FROM OLD.type
       OR NEW.user_id IS DISTINCT FROM OLD.user_id
       OR NEW.swap IS DISTINCT FROM OLD.swap
       OR NEW.current_price IS DISTINCT FROM OLD.current_price
    THEN
      RAISE EXCEPTION 'Users can only update stop_loss, take_profit, status, closed_at, and close_reason';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;