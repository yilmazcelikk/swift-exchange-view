
-- Temporarily disable the restrictive trigger
DROP TRIGGER IF EXISTS trg_restrict_order_updates ON public.orders;

-- Fix default
ALTER TABLE public.orders ALTER COLUMN leverage SET DEFAULT '1:200';

-- Update existing orders with wrong leverage
UPDATE public.orders SET leverage = '1:200' WHERE leverage = '1:100';

-- Re-enable the trigger
CREATE TRIGGER trg_restrict_order_updates
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION restrict_order_updates();
