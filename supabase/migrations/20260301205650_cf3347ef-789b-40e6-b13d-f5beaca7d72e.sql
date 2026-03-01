
-- Attach the candle trigger to the symbols table
DROP TRIGGER IF EXISTS trg_update_candles ON public.symbols;

CREATE TRIGGER trg_update_candles
  AFTER UPDATE OF current_price ON public.symbols
  FOR EACH ROW
  EXECUTE FUNCTION public.update_candles_on_price_change();
