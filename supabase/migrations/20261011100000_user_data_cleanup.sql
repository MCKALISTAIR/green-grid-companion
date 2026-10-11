-- User data cleanup (privacy review, Oct 2026)
--
-- 1. When an octopus_meters row is deleted (Octopus disconnect, account deletion via
--    the auth.users -> octopus_meters ON DELETE CASCADE, or by hand), delete that
--    meter's consumption, footprint and dispatch rows too. octopus_consumption and
--    carbon_footprint are keyed by MPAN only, so without this they were left behind
--    with nothing linking them to a person.
-- 2. One-off removal of rows already orphaned that way, and of dispatch rows whose
--    user no longer exists.
-- 3. octopus_intelligent_dispatches.user_id gets a foreign key to auth.users with
--    ON DELETE CASCADE (it had none).
-- 4. Daily cleanup of push subscriptions with no account that can never send
--    anything (every alert type off, untouched for 30 days). Subscriptions whose
--    device token APNs/FCM report as dead are removed by the edge functions
--    (_shared/push.ts). Subscriptions linked to an account already cascade-delete
--    with the auth user.
--
-- Safe to re-run. Step 2 deletes data: preview counts first with the queries at
-- the bottom of this file.

-- ---------------------------------------------------------------------------
-- 1. Trigger: meter deleted -> its readings deleted
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- 2. Remove rows that are already orphaned
-- ---------------------------------------------------------------------------
DELETE FROM public.octopus_consumption c
  WHERE NOT EXISTS (SELECT 1 FROM public.octopus_meters m WHERE m.mpan = c.mpan);
DELETE FROM public.carbon_footprint f
  WHERE NOT EXISTS (SELECT 1 FROM public.octopus_meters m WHERE m.mpan = f.mpan);
DELETE FROM public.octopus_intelligent_dispatches d
  WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = d.user_id);

-- ---------------------------------------------------------------------------
-- 3. Dispatches cascade with the account
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- 4. Push subscriptions with no account
-- ---------------------------------------------------------------------------
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

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-push-subscriptions-daily') THEN
    PERFORM cron.unschedule('cleanup-push-subscriptions-daily');
  END IF;
END $$;
SELECT cron.schedule(
  'cleanup-push-subscriptions-daily',
  '15 3 * * *',
  $cron$SELECT public.fn_cleanup_push_subscriptions();$cron$
);

-- ---------------------------------------------------------------------------
-- Preview (run BEFORE applying to see what step 2 / step 4 would remove):
--   SELECT count(*) FROM public.octopus_consumption c WHERE NOT EXISTS (SELECT 1 FROM public.octopus_meters m WHERE m.mpan = c.mpan);
--   SELECT count(*) FROM public.carbon_footprint f WHERE NOT EXISTS (SELECT 1 FROM public.octopus_meters m WHERE m.mpan = f.mpan);
--   SELECT count(*) FROM public.octopus_intelligent_dispatches d WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = d.user_id);
--   SELECT count(*) FROM public.push_subscriptions WHERE user_id IS NULL AND NOT (low_intensity_enabled OR high_intensity_enabled OR daily_forecast_enabled OR weekly_digest_enabled OR monthly_report_enabled) AND updated_at < now() - interval '30 days';
-- ---------------------------------------------------------------------------
