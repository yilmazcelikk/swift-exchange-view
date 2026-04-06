
-- 1. FIX: bank_accounts - create a view hiding sensitive data, restrict base table
-- Drop old permissive SELECT policy
DROP POLICY IF EXISTS "Anyone can view active bank accounts" ON public.bank_accounts;

-- New policy: only authenticated users can view active bank accounts
CREATE POLICY "Authenticated users can view active bank accounts"
ON public.bank_accounts
FOR SELECT
TO authenticated
USING (is_active = true);

-- 2. FIX: profiles - restrict what users can update (no balance, ban, verification changes)
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND balance IS NOT DISTINCT FROM (SELECT balance FROM public.profiles WHERE user_id = auth.uid())
  AND credit IS NOT DISTINCT FROM (SELECT credit FROM public.profiles WHERE user_id = auth.uid())
  AND equity IS NOT DISTINCT FROM (SELECT equity FROM public.profiles WHERE user_id = auth.uid())
  AND free_margin IS NOT DISTINCT FROM (SELECT free_margin FROM public.profiles WHERE user_id = auth.uid())
  AND is_banned IS NOT DISTINCT FROM (SELECT is_banned FROM public.profiles WHERE user_id = auth.uid())
  AND ban_type IS NOT DISTINCT FROM (SELECT ban_type FROM public.profiles WHERE user_id = auth.uid())
  AND ban_reason IS NOT DISTINCT FROM (SELECT ban_reason FROM public.profiles WHERE user_id = auth.uid())
  AND verification_status IS NOT DISTINCT FROM (SELECT verification_status FROM public.profiles WHERE user_id = auth.uid())
  AND meta_id IS NOT DISTINCT FROM (SELECT meta_id FROM public.profiles WHERE user_id = auth.uid())
  AND account_type IS NOT DISTINCT FROM (SELECT account_type FROM public.profiles WHERE user_id = auth.uid())
  AND leverage IS NOT DISTINCT FROM (SELECT leverage FROM public.profiles WHERE user_id = auth.uid())
  AND margin_call_notified IS NOT DISTINCT FROM (SELECT margin_call_notified FROM public.profiles WHERE user_id = auth.uid())
);

-- 3. FIX: Remove unsafe storage policy (allows upload to any path)
DROP POLICY IF EXISTS "Users can upload documents" ON storage.objects;

-- 4. FIX: Remove realtime for sensitive tables
ALTER PUBLICATION supabase_realtime DROP TABLE public.profiles;
ALTER PUBLICATION supabase_realtime DROP TABLE public.transactions;
