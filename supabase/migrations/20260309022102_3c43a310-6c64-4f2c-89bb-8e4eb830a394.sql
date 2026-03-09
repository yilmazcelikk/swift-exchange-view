
CREATE OR REPLACE FUNCTION public.close_position(p_order_id uuid, p_close_price numeric, p_net_pnl numeric, p_swap numeric, p_close_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_order RECORD; v_profile RECORD; v_new_balance numeric;
  v_remaining_pnl numeric := 0;
  v_new_equity numeric; v_new_free_margin numeric; v_ro RECORD;
  v_remaining_margin numeric := 0;
  -- For hedge netting
  v_sym text;
  v_buy_lots numeric;
  v_sell_lots numeric;
  v_avg_buy_price numeric;
  v_avg_sell_price numeric;
  v_net_lots numeric;
  v_net_price numeric;
  v_cs numeric;
  v_lev numeric;
BEGIN
  -- Set flag so trigger knows this is from close_position
  PERFORM set_config('app.closing_position', 'true', true);

  UPDATE public.orders SET status = 'closed', closed_at = now(), current_price = p_close_price,
    pnl = p_net_pnl, swap = p_swap, close_reason = p_close_reason
  WHERE id = p_order_id AND status = 'open' RETURNING * INTO v_order;
  IF v_order IS NULL THEN RETURN jsonb_build_object('success', false, 'reason', 'already_closed'); END IF;
  SELECT * INTO v_profile FROM public.profiles WHERE user_id = v_order.user_id FOR UPDATE;
  IF v_profile IS NULL THEN RETURN jsonb_build_object('success', false, 'reason', 'profile_not_found'); END IF;
  v_new_balance := v_profile.balance + p_net_pnl;

  -- Calculate remaining PnL for open positions
  FOR v_ro IN
    SELECT o.*, s.current_price AS live_price FROM public.orders o
    LEFT JOIN public.symbols s ON s.id::text = o.symbol_id
    WHERE o.user_id = v_order.user_id AND o.status = 'open' AND o.id <> p_order_id
  LOOP
    DECLARE v_diff numeric;
    BEGIN
      v_cs := CASE
        WHEN v_ro.symbol_name = 'XAUUSD' THEN 100
        WHEN v_ro.symbol_name = 'XAGUSD' THEN 5000
        WHEN v_ro.symbol_name = 'XPTUSD' THEN 100
        WHEN v_ro.symbol_name = 'XPDUSD' THEN 100
        WHEN v_ro.symbol_name IN ('USOIL','UKOIL') THEN 1000
        WHEN v_ro.symbol_name = 'NATGAS' THEN 10000
        WHEN v_ro.symbol_name IN ('CORN','WHEAT','SOYBEAN') THEN 50
        WHEN v_ro.symbol_name = 'COTTON' THEN 50000
        WHEN v_ro.symbol_name = 'SUGAR' THEN 112000
        WHEN v_ro.symbol_name = 'COFFEE' THEN 37500
        WHEN v_ro.symbol_name = 'COCOA' THEN 10
        WHEN v_ro.symbol_name = 'COPPER' THEN 25000
        WHEN v_ro.symbol_name IN ('BTCUSD','ETHUSD','BNBUSD','SOLUSD','XRPUSD','DOGEUSD','ADAUSD','LTCUSD','DOTUSD','AVAXUSD','LINKUSD','BCHUSD','MATICUSD','ATOMUSD','TRXUSD','SHIBUSD','UNIUSD','TONUSD','SUIUSD','AABORUSD','JUPUSD','PEPE1000USD','WIFUSD','APEUSD','APTUSD','ARBUSD','OPUSD','INJUSD','NEAUSD','FILUSD','ICPUSD','ETCUSD') THEN 1
        WHEN v_ro.symbol_name IN ('US500','US30','USTEC','DE40','UK100','JP225','FR40','AU200','HK50') THEN 1
        WHEN v_ro.symbol_name ~ '^BIST' THEN 1
        WHEN v_ro.symbol_name IN ('THYAO','GARAN','AKBNK','EREGL','SISE','KCHOL','SAHOL','TUPRS','PETKM','BIMAS','YKBNK','ISCTR','ASELS','PGSUS','EKGYO','TOASO','TAVHL','FROTO','TCELL','HALKB','VAKBN','DOHOL','ENKAI','ARCLK','VESTL','MGROS','SOKM','GUBRF','SASA','OYAKC','TTKOM','TSKB','AKSA','CIMSA','AEFES','ULKER','DOAS','OTKAR','ISGYO','KRDMD','GESAN','KONTR','ODAS','BRYAT','TTRAK','EUPWR','AGHOL','MAVI','LOGO') THEN 1
        ELSE 100000
      END;
      v_diff := CASE WHEN v_ro.type = 'buy' THEN COALESCE(v_ro.live_price, v_ro.current_price) - v_ro.entry_price
        ELSE v_ro.entry_price - COALESCE(v_ro.live_price, v_ro.current_price) END;
      v_remaining_pnl := v_remaining_pnl + (v_diff * v_ro.lots * v_cs);
    END;
  END LOOP;

  -- Calculate net margin with hedge netting
  -- Group remaining orders by symbol and calculate net lots
  v_remaining_margin := 0;
  FOR v_sym, v_buy_lots, v_sell_lots, v_avg_buy_price, v_avg_sell_price, v_lev IN
    SELECT 
      o.symbol_name,
      COALESCE(SUM(CASE WHEN o.type = 'buy' THEN o.lots ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN o.type = 'sell' THEN o.lots ELSE 0 END), 0),
      CASE WHEN SUM(CASE WHEN o.type = 'buy' THEN o.lots ELSE 0 END) > 0
        THEN SUM(CASE WHEN o.type = 'buy' THEN o.lots * o.entry_price ELSE 0 END) / SUM(CASE WHEN o.type = 'buy' THEN o.lots ELSE 0 END)
        ELSE 0 END,
      CASE WHEN SUM(CASE WHEN o.type = 'sell' THEN o.lots ELSE 0 END) > 0
        THEN SUM(CASE WHEN o.type = 'sell' THEN o.lots * o.entry_price ELSE 0 END) / SUM(CASE WHEN o.type = 'sell' THEN o.lots ELSE 0 END)
        ELSE 0 END,
      COALESCE(NULLIF(split_part(MAX(o.leverage), ':', 2), '')::numeric, 200)
    FROM public.orders o
    WHERE o.user_id = v_order.user_id AND o.status = 'open' AND o.id <> p_order_id
    GROUP BY o.symbol_name
  LOOP
    v_net_lots := ABS(v_buy_lots - v_sell_lots);
    v_net_price := CASE WHEN v_buy_lots >= v_sell_lots THEN v_avg_buy_price ELSE v_avg_sell_price END;
    
    IF v_net_lots > 0 AND v_net_price > 0 THEN
      v_cs := CASE
        WHEN v_sym = 'XAUUSD' THEN 100
        WHEN v_sym = 'XAGUSD' THEN 5000
        WHEN v_sym = 'XPTUSD' THEN 100
        WHEN v_sym = 'XPDUSD' THEN 100
        WHEN v_sym IN ('USOIL','UKOIL') THEN 1000
        WHEN v_sym = 'NATGAS' THEN 10000
        WHEN v_sym IN ('CORN','WHEAT','SOYBEAN') THEN 50
        WHEN v_sym = 'COTTON' THEN 50000
        WHEN v_sym = 'SUGAR' THEN 112000
        WHEN v_sym = 'COFFEE' THEN 37500
        WHEN v_sym = 'COCOA' THEN 10
        WHEN v_sym = 'COPPER' THEN 25000
        WHEN v_sym IN ('BTCUSD','ETHUSD','BNBUSD','SOLUSD','XRPUSD','DOGEUSD','ADAUSD','LTCUSD','DOTUSD','AVAXUSD','LINKUSD','BCHUSD','MATICUSD','ATOMUSD','TRXUSD','SHIBUSD','UNIUSD','TONUSD','SUIUSD','AABORUSD','JUPUSD','PEPE1000USD','WIFUSD','APEUSD','APTUSD','ARBUSD','OPUSD','INJUSD','NEAUSD','FILUSD','ICPUSD','ETCUSD') THEN 1
        WHEN v_sym IN ('US500','US30','USTEC','DE40','UK100','JP225','FR40','AU200','HK50') THEN 1
        WHEN v_sym ~ '^BIST' THEN 1
        WHEN v_sym IN ('THYAO','GARAN','AKBNK','EREGL','SISE','KCHOL','SAHOL','TUPRS','PETKM','BIMAS','YKBNK','ISCTR','ASELS','PGSUS','EKGYO','TOASO','TAVHL','FROTO','TCELL','HALKB','VAKBN','DOHOL','ENKAI','ARCLK','VESTL','MGROS','SOKM','GUBRF','SASA','OYAKC','TTKOM','TSKB','AKSA','CIMSA','AEFES','ULKER','DOAS','OTKAR','ISGYO','KRDMD','GESAN','KONTR','ODAS','BRYAT','TTRAK','EUPWR','AGHOL','MAVI','LOGO') THEN 1
        ELSE 100000
      END;
      v_remaining_margin := v_remaining_margin + ((v_net_lots * v_cs * v_net_price) / v_lev);
    END IF;
  END LOOP;

  v_new_equity := v_new_balance + v_profile.credit + v_remaining_pnl;
  v_new_free_margin := v_new_equity - v_remaining_margin;
  UPDATE public.profiles SET balance = v_new_balance, equity = v_new_equity, free_margin = v_new_free_margin, updated_at = now()
  WHERE user_id = v_order.user_id;
  RETURN jsonb_build_object('success', true, 'new_balance', v_new_balance, 'net_pnl', p_net_pnl);
END;
$function$;
