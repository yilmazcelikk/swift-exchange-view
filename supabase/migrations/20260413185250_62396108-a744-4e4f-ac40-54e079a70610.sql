
CREATE POLICY "Authenticated users can view active bank accounts"
ON public.bank_accounts
FOR SELECT
TO authenticated
USING (is_active = true);
