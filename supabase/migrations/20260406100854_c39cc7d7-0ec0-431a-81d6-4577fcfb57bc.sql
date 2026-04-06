
-- Enforce pending status and positive amount on transaction insert
CREATE OR REPLACE FUNCTION public.enforce_transaction_defaults()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Non-admin users always get pending status
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    NEW.status := 'pending';
  END IF;
  
  -- Amount must be positive
  IF NEW.amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_transaction_defaults
  BEFORE INSERT ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_transaction_defaults();
