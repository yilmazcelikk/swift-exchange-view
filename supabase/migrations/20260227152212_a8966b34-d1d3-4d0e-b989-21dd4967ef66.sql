
CREATE TABLE public.bank_accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bank_name text NOT NULL,
  account_holder text NOT NULL,
  iban text NOT NULL,
  currency text NOT NULL DEFAULT 'TRY',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

-- Everyone can view active bank accounts (users need to see them for deposits)
CREATE POLICY "Anyone can view active bank accounts" ON public.bank_accounts
  FOR SELECT USING (is_active = true);

-- Admins can do everything
CREATE POLICY "Admins can manage bank accounts" ON public.bank_accounts
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
