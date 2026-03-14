CREATE OR REPLACE FUNCTION public.update_candles_on_price_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_now timestamp with time zone := now();
  v_price numeric;
  v_bucket timestamp with time zone;
  v_has_orders boolean;
BEGIN
  IF NEW.current_price IS NULL OR NEW.current_price = 0 THEN
    RETURN NEW;
  END IF;
  
  IF OLD.current_price IS NOT NULL AND NEW.current_price = OLD.current_price THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.orders WHERE symbol_id = NEW.id::text AND status = 'open' LIMIT 1
  ) INTO v_has_orders;
  
  IF NOT v_has_orders THEN
    RETURN NEW;
  END IF;

  v_price := NEW.current_price;

  -- 15-minute bucket (removed 1m to reduce storage)
  v_bucket := date_trunc('hour', v_now) + (floor(extract(minute from v_now) / 15) * interval '15 minutes');
  INSERT INTO public.candles (symbol_id, timeframe, bucket_time, open, high, low, close, volume)
  VALUES (NEW.id, '15m', v_bucket, v_price, v_price, v_price, v_price, 1)
  ON CONFLICT (symbol_id, timeframe, bucket_time) DO UPDATE SET
    high = GREATEST(candles.high, EXCLUDED.high),
    low = LEAST(candles.low, EXCLUDED.low),
    close = EXCLUDED.close,
    volume = candles.volume + 1;

  -- 1-hour bucket
  v_bucket := date_trunc('hour', v_now);
  INSERT INTO public.candles (symbol_id, timeframe, bucket_time, open, high, low, close, volume)
  VALUES (NEW.id, '1h', v_bucket, v_price, v_price, v_price, v_price, 1)
  ON CONFLICT (symbol_id, timeframe, bucket_time) DO UPDATE SET
    high = GREATEST(candles.high, EXCLUDED.high),
    low = LEAST(candles.low, EXCLUDED.low),
    close = EXCLUDED.close,
    volume = candles.volume + 1;

  -- 4-hour bucket
  v_bucket := date_trunc('day', v_now) + (floor(extract(hour from v_now) / 4) * interval '4 hours');
  INSERT INTO public.candles (symbol_id, timeframe, bucket_time, open, high, low, close, volume)
  VALUES (NEW.id, '4h', v_bucket, v_price, v_price, v_price, v_price, 1)
  ON CONFLICT (symbol_id, timeframe, bucket_time) DO UPDATE SET
    high = GREATEST(candles.high, EXCLUDED.high),
    low = LEAST(candles.low, EXCLUDED.low),
    close = EXCLUDED.close,
    volume = candles.volume + 1;

  -- 1-day bucket
  v_bucket := date_trunc('day', v_now);
  INSERT INTO public.candles (symbol_id, timeframe, bucket_time, open, high, low, close, volume)
  VALUES (NEW.id, '1d', v_bucket, v_price, v_price, v_price, v_price, 1)
  ON CONFLICT (symbol_id, timeframe, bucket_time) DO UPDATE SET
    high = GREATEST(candles.high, EXCLUDED.high),
    low = LEAST(candles.low, EXCLUDED.low),
    close = EXCLUDED.close,
    volume = candles.volume + 1;

  RETURN NEW;
END;
$function$;