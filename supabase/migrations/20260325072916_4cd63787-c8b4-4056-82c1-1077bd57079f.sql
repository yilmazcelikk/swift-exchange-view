
-- Temporarily fix BIST positions that were closed without TRY/USD conversion
DO $$
BEGIN
  PERFORM set_config('app.closing_position', 'true', true);
  
  UPDATE orders SET pnl = 30.18 WHERE id = 'c368f1b8-3145-4588-9bed-6352822b3a23';
  UPDATE orders SET pnl = -110.83 WHERE id = '85fac475-139f-4c05-8436-fc66c223174c';
  UPDATE orders SET pnl = -109.46 WHERE id = '68bd9270-e115-44b5-b287-60ea625c00d7';
  
  UPDATE profiles SET balance = 5636.40, equity = 5636.40, free_margin = 5636.40, updated_at = now()
  WHERE user_id = '5d8722f5-ee2e-42a0-b302-c975633fc3a1';
END $$;
