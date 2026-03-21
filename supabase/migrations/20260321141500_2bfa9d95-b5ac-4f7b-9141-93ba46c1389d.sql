
CREATE OR REPLACE FUNCTION public.delete_order_and_reverse_pnl(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_order RECORD;
  v_profile RECORD;
  v_new_balance numeric;
BEGIN
  -- Only admins
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_admin');
  END IF;

  -- Get the closed order
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id AND status = 'closed';
  IF v_order IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'order_not_found');
  END IF;

  -- Get user profile
  SELECT * INTO v_profile FROM public.profiles WHERE user_id = v_order.user_id FOR UPDATE;
  IF v_profile IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'profile_not_found');
  END IF;

  -- Reverse the PnL from balance
  v_new_balance := v_profile.balance - v_order.pnl;

  -- Update profile balance, equity, free_margin
  UPDATE public.profiles 
  SET balance = v_new_balance,
      equity = v_new_balance + v_profile.credit,
      free_margin = v_new_balance + v_profile.credit,
      updated_at = now()
  WHERE user_id = v_order.user_id;

  -- Delete the order
  DELETE FROM public.orders WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true, 'reversed_pnl', v_order.pnl, 'new_balance', v_new_balance);
END;
$$;
