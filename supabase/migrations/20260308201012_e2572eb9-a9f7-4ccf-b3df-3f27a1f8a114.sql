
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS account_holder text;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS iban text;
