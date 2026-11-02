-- BH-152: a meter row's owner can only be set once. octopus_meters is unique
-- on mpan and consumption history is keyed by mpan, so moving user_id would
-- hand one user's meter and history to another. The octopus-energy function
-- already refuses this; this trigger is the database backstop.
-- NOT APPLIED: Alistair applies it after review.

CREATE OR REPLACE FUNCTION public.fn_octopus_meters_lock_owner()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.user_id IS NOT NULL AND NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'octopus_meters.user_id cannot be changed once set'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_octopus_meters_lock_owner ON public.octopus_meters;
CREATE TRIGGER trg_octopus_meters_lock_owner
  BEFORE UPDATE OF user_id ON public.octopus_meters
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_octopus_meters_lock_owner();
