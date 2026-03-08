
-- Drop the existing permissive update policy for users
DROP POLICY IF EXISTS "Users can update their own orders" ON public.orders;

-- Create a restrictive update policy that only allows updating stop_loss and take_profit
-- Using a trigger to enforce column-level restrictions since RLS can't do column checks
CREATE OR REPLACE FUNCTION public.restrict_order_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only allow changes to stop_loss and take_profit for non-admin users
  IF NOT has_role(auth.uid(), 'admin') THEN
    -- Ensure critical fields are not changed
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

DROP TRIGGER IF EXISTS trg_restrict_order_updates ON public.orders;
CREATE TRIGGER trg_restrict_order_updates
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.restrict_order_updates();

-- Re-create the user update policy (still needed for RLS)
CREATE POLICY "Users can update their own orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND status IN ('open', 'pending'))
WITH CHECK (auth.uid() = user_id);
