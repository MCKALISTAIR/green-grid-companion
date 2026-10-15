CREATE OR REPLACE FUNCTION public.fn_delete_meter_readings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.octopus_consumption WHERE mpan = OLD.mpan;
  DELETE FROM public.carbon_footprint WHERE mpan = OLD.mpan;
  IF OLD.user_id IS NOT NULL THEN
    DELETE FROM public.octopus_intelligent_dispatches
      WHERE mpan = OLD.mpan AND user_id = OLD.user_id;
  END IF;
  RETURN OLD;
END;
$$;
REVOKE ALL ON FUNCTION public.fn_delete_meter_readings() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_octopus_meters_delete_readings ON public.octopus_meters;
CREATE TRIGGER trg_octopus_meters_delete_readings
  AFTER DELETE ON public.octopus_meters
  FOR EACH ROW EXECUTE FUNCTION public.fn_delete_meter_readings();

DELETE FROM public.octopus_consumption c
  WHERE NOT EXISTS (SELECT 1 FROM public.octopus_meters m WHERE m.mpan = c.mpan);
DELETE FROM public.carbon_footprint f
  WHERE NOT EXISTS (SELECT 1 FROM public.octopus_meters m WHERE m.mpan = f.mpan);
DELETE FROM public.octopus_intelligent_dispatches d
  WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = d.user_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'octopus_intelligent_dispatches_user_id_fkey'
      AND conrelid = 'public.octopus_intelligent_dispatches'::regclass
  ) THEN
    ALTER TABLE public.octopus_intelligent_dispatches
      ADD CONSTRAINT octopus_intelligent_dispatches_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.fn_cleanup_push_subscriptions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE removed integer;
BEGIN
  DELETE FROM public.push_subscriptions
  WHERE user_id IS NULL
    AND NOT low_intensity_enabled
    AND NOT high_intensity_enabled
    AND NOT daily_forecast_enabled
    AND NOT weekly_digest_enabled
    AND NOT monthly_report_enabled
    AND updated_at < now() - interval '30 days';
  GET DIAGNOSTICS removed = ROW_COUNT;
  RETURN removed;
END;
$$;
REVOKE ALL ON FUNCTION public.fn_cleanup_push_subscriptions() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_cleanup_push_subscriptions() TO service_role;

SELECT cron.schedule(
  'cleanup-push-subscriptions-daily',
  '15 3 * * *',
  $cron$SELECT public.fn_cleanup_push_subscriptions();$cron$
);