
CREATE OR REPLACE FUNCTION generate_random_meta_id()
RETURNS integer
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  new_id integer;
  done boolean := false;
BEGIN
  WHILE NOT done LOOP
    new_id := floor(random() * (999999 - 100000 + 1) + 100000)::integer;
    done := NOT EXISTS (SELECT 1 FROM public.profiles WHERE meta_id = new_id);
  END LOOP;
  RETURN new_id;
END;
$$;
