
-- Create a function to generate random 6-digit meta_id
CREATE OR REPLACE FUNCTION generate_random_meta_id()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  new_id integer;
  done boolean := false;
BEGIN
  WHILE NOT done LOOP
    new_id := floor(random() * (999999 - 100000 + 1) + 100000)::integer;
    -- Check uniqueness
    done := NOT EXISTS (SELECT 1 FROM public.profiles WHERE meta_id = new_id);
  END LOOP;
  RETURN new_id;
END;
$$;

-- Update default for meta_id column
ALTER TABLE public.profiles ALTER COLUMN meta_id SET DEFAULT generate_random_meta_id();

-- Update existing long meta_ids to random 6-digit ones
DO $$
DECLARE
  r RECORD;
  new_id integer;
  done boolean;
BEGIN
  FOR r IN SELECT id FROM public.profiles WHERE meta_id >= 1000000 ORDER BY created_at LOOP
    done := false;
    WHILE NOT done LOOP
      new_id := floor(random() * (999999 - 100000 + 1) + 100000)::integer;
      done := NOT EXISTS (SELECT 1 FROM public.profiles WHERE meta_id = new_id);
    END LOOP;
    UPDATE public.profiles SET meta_id = new_id WHERE id = r.id;
  END LOOP;
END;
$$;
