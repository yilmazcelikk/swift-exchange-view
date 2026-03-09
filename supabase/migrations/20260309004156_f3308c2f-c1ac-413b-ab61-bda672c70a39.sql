-- Update close_position function with international standard contract sizes
CREATE OR REPLACE FUNCTION public.close_position(
  p_order_id uuid,
  p_close_price numeric,
  p_net_pnl numeric,
  p_swap numeric,
  p_close_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_order RECORD; v_profile RECORD; v_new_balance numeric;
  v_remaining_pnl numeric := 0; v_remaining_margin numeric := 0;
  v_new_equity numeric; v_new_free_margin numeric; v_ro RECORD;
BEGIN
  UPDATE public.orders SET status = 'closed', closed_at = now(), current_price = p_close_price,
    pnl = p_net_pnl, swap = p_swap, close_reason = p_close_reason
  WHERE id = p_order_id AND status = 'open' RETURNING * INTO v_order;
  IF v_order IS NULL THEN RETURN jsonb_build_object('success', false, 'reason', 'already_closed'); END IF;
  SELECT * INTO v_profile FROM public.profiles WHERE user_id = v_order.user_id FOR UPDATE;
  IF v_profile IS NULL THEN RETURN jsonb_build_object('success', false, 'reason', 'profile_not_found'); END IF;
  v_new_balance := v_profile.balance + p_net_pnl;

  FOR v_ro IN
    SELECT o.*, s.current_price AS live_price FROM public.orders o
    LEFT JOIN public.symbols s ON s.id::text = o.symbol_id
    WHERE o.user_id = v_order.user_id AND o.status = 'open' AND o.id <> p_order_id
  LOOP
    DECLARE v_cs numeric; v_diff numeric; v_lev numeric;
    BEGIN
      v_lev := COALESCE(NULLIF(split_part(v_ro.leverage, ':', 2), '')::numeric, 200);
      v_cs := CASE
        -- Precious metals (COMEX/NYMEX standard)
        WHEN v_ro.symbol_name = 'XAUUSD' THEN 100
        WHEN v_ro.symbol_name = 'XAGUSD' THEN 5000
        WHEN v_ro.symbol_name = 'XPTUSD' THEN 50
        WHEN v_ro.symbol_name = 'XPDUSD' THEN 50
        -- Energy (NYMEX/ICE standard)
        WHEN v_ro.symbol_name IN ('USOIL','UKOIL') THEN 1000
        WHEN v_ro.symbol_name = 'NATGAS' THEN 10000
        -- Agriculture (CME/CBOT standard)
        WHEN v_ro.symbol_name IN ('CORN','WHEAT','SOYBEAN') THEN 5000
        WHEN v_ro.symbol_name = 'COTTON' THEN 50000
        WHEN v_ro.symbol_name = 'SUGAR' THEN 112000
        WHEN v_ro.symbol_name = 'COFFEE' THEN 37500
        WHEN v_ro.symbol_name = 'COCOA' THEN 10
        WHEN v_ro.symbol_name = 'COPPER' THEN 25000
        -- Crypto - 1 unit
        WHEN v_ro.symbol_name IN ('BTCUSD','ETHUSD','BNBUSD','SOLUSD','XRPUSD','DOGEUSD','ADAUSD','LTCUSD','DOTUSD','AVAXUSD','LINKUSD','BCHUSD','MATICUSD','ATOMUSD','TRXUSD','SHIBUSD','UNIUSD','TONUSD','SUIUSD','AABORUSD','JUPUSD','PEPE1000USD','WIFUSD','APEUSD','APTUSD','ARBUSD','OPUSD','INJUSD','NEAUSD','FILUSD','ICPUSD','ETCUSD') THEN 1
        -- Indices
        WHEN v_ro.symbol_name IN ('US500','US30','USTEC','DE40','UK100','JP225','FR40','AU200','HK50') THEN 1
        -- BIST stocks
        WHEN v_ro.symbol_name ~ '^BIST' THEN 1
        WHEN v_ro.symbol_name IN ('THYAO','GARAN','AKBNK','EREGL','SISE','KCHOL','SAHOL','TUPRS','PETKM','BIMAS') THEN 1
        -- Forex - 100,000 units (standard lot)
        ELSE 100000
      END;
      v_diff := CASE WHEN v_ro.type = 'buy' THEN COALESCE(v_ro.live_price, v_ro.current_price) - v_ro.entry_price
        ELSE v_ro.entry_price - COALESCE(v_ro.live_price, v_ro.current_price) END;
      v_remaining_pnl := v_remaining_pnl + (v_diff * v_ro.lots * v_cs);
      v_remaining_margin := v_remaining_margin + ((v_ro.lots * v_cs * v_ro.entry_price) / v_lev);
    END;
  END LOOP;

  v_new_equity := v_new_balance + v_profile.credit + v_remaining_pnl;
  v_new_free_margin := v_new_equity - v_remaining_margin;
  UPDATE public.profiles SET balance = v_new_balance, equity = v_new_equity, free_margin = v_new_free_margin, updated_at = now()
  WHERE user_id = v_order.user_id;
  RETURN jsonb_build_object('success', true, 'new_balance', v_new_balance, 'net_pnl', p_net_pnl);
END;
$function$;