
-- Candle data table for OHLC chart
CREATE TABLE public.candles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol_id uuid NOT NULL,
  timeframe text NOT NULL DEFAULT '1m',
  bucket_time timestamp with time zone NOT NULL,
  open numeric NOT NULL DEFAULT 0,
  high numeric NOT NULL DEFAULT 0,
  low numeric NOT NULL DEFAULT 0,
  close numeric NOT NULL DEFAULT 0,
  volume numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(symbol_id, timeframe, bucket_time)
);

-- Index for fast queries
CREATE INDEX idx_candles_symbol_timeframe_time ON public.candles (symbol_id, timeframe, bucket_time DESC);

-- RLS
ALTER TABLE public.candles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view candles" ON public.candles
  FOR SELECT USING (true);

CREATE POLICY "System can manage candles" ON public.candles
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.candles;

-- Function to update candle data when symbol price changes
CREATE OR REPLACE FUNCTION public.update_candles_on_price_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_now timestamp with time zone := now();
  v_bucket_1m timestamp with time zone;
  v_bucket_1h timestamp with time zone;
  v_price numeric;
BEGIN
  -- Only process if price actually changed
  IF NEW.current_price IS NULL OR NEW.current_price = 0 THEN
    RETURN NEW;
  END IF;
  
  IF OLD.current_price IS NOT NULL AND NEW.current_price = OLD.current_price THEN
    RETURN NEW;
  END IF;

  v_price := NEW.current_price;
  
  -- 1-minute bucket
  v_bucket_1m := date_trunc('minute', v_now);
  INSERT INTO public.candles (symbol_id, timeframe, bucket_time, open, high, low, close, volume)
  VALUES (NEW.id, '1m', v_bucket_1m, v_price, v_price, v_price, v_price, 1)
  ON CONFLICT (symbol_id, timeframe, bucket_time) DO UPDATE SET
    high = GREATEST(candles.high, EXCLUDED.high),
    low = LEAST(candles.low, EXCLUDED.low),
    close = EXCLUDED.close,
    volume = candles.volume + 1;

  -- 1-hour bucket
  v_bucket_1h := date_trunc('hour', v_now);
  INSERT INTO public.candles (symbol_id, timeframe, bucket_time, open, high, low, close, volume)
  VALUES (NEW.id, '1h', v_bucket_1h, v_price, v_price, v_price, v_price, 1)
  ON CONFLICT (symbol_id, timeframe, bucket_time) DO UPDATE SET
    high = GREATEST(candles.high, EXCLUDED.high),
    low = LEAST(candles.low, EXCLUDED.low),
    close = EXCLUDED.close,
    volume = candles.volume + 1;

  RETURN NEW;
END;
$$;

-- Trigger on symbols table
CREATE TRIGGER trg_update_candles
  AFTER UPDATE OF current_price ON public.symbols
  FOR EACH ROW
  EXECUTE FUNCTION public.update_candles_on_price_change();
