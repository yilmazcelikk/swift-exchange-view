
-- Add meta_id column with unique sequential ID for each user
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS meta_id bigint;

-- Create sequence for meta_id
CREATE SEQUENCE IF NOT EXISTS profiles_meta_id_seq START WITH 1000000000;

-- Set default for new rows
ALTER TABLE public.profiles ALTER COLUMN meta_id SET DEFAULT nextval('profiles_meta_id_seq');

-- Fill existing rows that don't have meta_id
UPDATE public.profiles SET meta_id = nextval('profiles_meta_id_seq') WHERE meta_id IS NULL;

-- Make meta_id NOT NULL and UNIQUE
ALTER TABLE public.profiles ALTER COLUMN meta_id SET NOT NULL;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_meta_id_unique UNIQUE (meta_id);

-- Change default leverage to 1:200
ALTER TABLE public.profiles ALTER COLUMN leverage SET DEFAULT '1:200';
