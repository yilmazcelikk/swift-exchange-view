
-- Re-add realtime for profiles and transactions - RLS already protects data
-- Users can only see their own rows, admins can see all
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
