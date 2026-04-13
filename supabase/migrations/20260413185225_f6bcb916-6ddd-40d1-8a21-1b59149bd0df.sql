
-- 1. Fix bank_accounts: Remove overly permissive SELECT policy, replace with admin/moderator only
DROP POLICY IF EXISTS "Authenticated users can view active bank accounts" ON public.bank_accounts;

CREATE POLICY "Admins and moderators can view bank accounts"
ON public.bank_accounts
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role)
);

-- 2. Fix user_roles privilege escalation: ensure only admins can INSERT
-- The existing "Admins can manage roles" ALL policy already restricts to admins.
-- But we need to make sure there's no implicit INSERT allowed for non-admins.
-- Add explicit deny-like policy: users can only view their own roles (already exists)
-- Verify by checking if RLS is enabled (it should be)

-- 3. Add explicit restrictive policies for user_roles INSERT/UPDATE/DELETE
-- The ALL policy for admins already covers this, but let's be explicit
-- No additional policy needed since RLS is enabled and only admin ALL + user SELECT exist
-- However, let's verify RLS is definitely ON
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles FORCE ROW LEVEL SECURITY;
