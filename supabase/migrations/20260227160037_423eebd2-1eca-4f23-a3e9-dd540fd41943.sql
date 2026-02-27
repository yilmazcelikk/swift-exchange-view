
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS receipt_url text DEFAULT NULL;
