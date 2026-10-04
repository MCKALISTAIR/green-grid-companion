-- lovable-cron-fallback-reviewed: existing 30-min carbon intensity job, matches the grid's half-hourly data; reschedule only
-- Security hardening (Oct 2026)
--
--  1. app_config / geocoding_cache: the "service_role full access" policies
--     from 20260718000000 had no TO clause, so they applied to anon and
--     authenticated too (anyone with the anon key could rewrite supabase_url,
--     which the cron jobs use as their target). Recreate them scoped to
--     service_role and revoke client privileges entirely. Neither table is
--     read by the client (geocoding goes through the geocoding edge function).
--  2. fn_check_rate_limit: SECURITY DEFINER and executable by PUBLIC, so anyone
--     could burn another user's "<user_id>:save-credentials" bucket and lock
--     them out. Make it service_role-only (the edge function calls it with the
--     service role and keys it to the authenticated user id).
--  3. octopus_credentials: API keys move to an AES-256-GCM encrypted column
--     (encrypted by the octopus-energy edge function with a key held only in
--     the OCTOPUS_CREDENTIALS_KEY function secret). Clients lose all write
--     access and may only read non-secret columns of their own row.
--     The legacy plaintext column is kept (nullable) until the backfill has
--     run; see the post-merge steps in the PR description for dropping it.
--  4. scheduled_notification_log: idempotency guard for daily-forecast,
--     weekly-digest and monthly-report.
--  5. Scheduler secret: generated here, inside the database (Supabase Vault
--     entry 'cron_secret'; falls back to private.scheduler_secret if Vault is
--     unavailable). Nobody needs to create or copy it. pg_cron reads it via
--     public.get_scheduler_secret() and sends it as x-cron-secret; edge
--     functions read it via the same RPC with the service role (the function
--     is executable by service_role only).
--  0. Runs first: app_config.supabase_url is reset to the real project URL,
--     in case it was tampered with while it was world-writable, so the secret
--     is never sent anywhere else.
--
-- Written to be safe to re-run.

-- ---------------------------------------------------------------------------
-- 0. Reset the cron target URL BEFORE anything sends the secret
-- ---------------------------------------------------------------------------
INSERT INTO public.app_config (key, value)
VALUES ('supabase_url', 'https://klwezcjmlrdwvvzisdtd.supabase.co')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- ---------------------------------------------------------------------------
-- 1. app_config / geocoding_cache
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow service_role full access to app_config" ON public.app_config;
DROP POLICY IF EXISTS "Allow service_role full access to geocoding_cache" ON public.geocoding_cache;
DROP POLICY IF EXISTS "Allow public read access to app_config" ON public.app_config;
DROP POLICY IF EXISTS "Allow public read access to geocoding_cache" ON public.geocoding_cache;
DROP POLICY IF EXISTS "Service role full access to app_config" ON public.app_config;
DROP POLICY IF EXISTS "Service role full access to geocoding_cache" ON public.geocoding_cache;

-- service_role bypasses RLS anyway; these explicit policies just document intent.
CREATE POLICY "Service role full access to app_config"
  ON public.app_config FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to geocoding_cache"
  ON public.geocoding_cache FOR ALL TO service_role USING (true) WITH CHECK (true);

REVOKE ALL ON public.app_config FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.geocoding_cache FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.app_config TO service_role;
GRANT ALL ON public.geocoding_cache TO service_role;

-- ---------------------------------------------------------------------------
-- 2. Rate limiter: internal only
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.fn_check_rate_limit(text, integer, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_check_rate_limit(text, integer, integer, integer) TO service_role;

REVOKE ALL ON public.rate_limits FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.rate_limits TO service_role;

-- ---------------------------------------------------------------------------
-- 3. Octopus credentials: encrypted at rest, server-side only
-- ---------------------------------------------------------------------------
ALTER TABLE public.octopus_credentials
  ADD COLUMN IF NOT EXISTS api_key_encrypted text,
  ADD COLUMN IF NOT EXISTS api_key_hint text;

ALTER TABLE public.octopus_credentials ALTER COLUMN api_key DROP NOT NULL;

ALTER TABLE public.octopus_credentials DROP CONSTRAINT IF EXISTS octopus_credentials_api_key_present;
ALTER TABLE public.octopus_credentials
  ADD CONSTRAINT octopus_credentials_api_key_present
  CHECK (api_key IS NOT NULL OR api_key_encrypted IS NOT NULL);

-- Non-secret hint (last 4 chars) for existing rows; the key itself is
-- encrypted by the edge function backfill (it needs the function secret).
UPDATE public.octopus_credentials
   SET api_key_hint = right(api_key, 4)
 WHERE api_key IS NOT NULL AND api_key_hint IS NULL;

-- Drop every client-facing policy (old and new names)
DROP POLICY IF EXISTS "Users can manage their own octopus credentials" ON public.octopus_credentials;
DROP POLICY IF EXISTS "Users can view own credentials" ON public.octopus_credentials;
DROP POLICY IF EXISTS "Users can insert own credentials" ON public.octopus_credentials;
DROP POLICY IF EXISTS "Users can update own credentials" ON public.octopus_credentials;
DROP POLICY IF EXISTS "Users can delete own credentials" ON public.octopus_credentials;
DROP POLICY IF EXISTS "Only service role can read credentials" ON public.octopus_credentials;
DROP POLICY IF EXISTS "Service role has full access to credentials" ON public.octopus_credentials;
DROP POLICY IF EXISTS "Users can view own credential status" ON public.octopus_credentials;

-- Clients: no writes at all (all writes go through the octopus-energy edge
-- function), and SELECT only on non-secret columns of their own row.
REVOKE ALL ON public.octopus_credentials FROM PUBLIC, anon, authenticated;
GRANT SELECT (user_id, account_number, api_key_hint, created_at, updated_at)
  ON public.octopus_credentials TO authenticated;
GRANT ALL ON public.octopus_credentials TO service_role;

CREATE POLICY "Users can view own credential status"
  ON public.octopus_credentials FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- get_my_credentials_status() is SECURITY INVOKER and only touches the
-- columns granted above, so it keeps working for authenticated users.
REVOKE ALL ON FUNCTION public.get_my_credentials_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_credentials_status() TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4. Idempotency log for scheduled notifications
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.scheduled_notification_log (
  job_name text NOT NULL,
  period_key text NOT NULL,
  subscription_id uuid NOT NULL REFERENCES public.push_subscriptions(id) ON DELETE CASCADE,
  sent_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (job_name, period_key, subscription_id)
);
CREATE INDEX IF NOT EXISTS idx_scheduled_notification_log_sent_at
  ON public.scheduled_notification_log (sent_at);

ALTER TABLE public.scheduled_notification_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.scheduled_notification_log FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.scheduled_notification_log TO service_role;

-- ---------------------------------------------------------------------------
-- 5. Scheduler secret (generated in-database) + cron jobs that send it
-- ---------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

-- Fallback store, only used if Vault is unavailable. Not exposed via the API
-- (private schema) and no client privileges.
CREATE TABLE IF NOT EXISTS private.scheduler_secret (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  secret text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON private.scheduler_secret FROM PUBLIC, anon, authenticated;

-- Single accessor used by both pg_cron and the edge functions.
CREATE OR REPLACE FUNCTION public.get_scheduler_secret()
RETURNS text
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $fn$
DECLARE
  s text;
BEGIN
  BEGIN
    SELECT ds.decrypted_secret INTO s FROM vault.decrypted_secrets ds WHERE ds.name = 'cron_secret' LIMIT 1;
  EXCEPTION WHEN undefined_table OR invalid_schema_name OR insufficient_privilege THEN
    s := NULL;
  END;
  IF s IS NULL THEN
    SELECT ss.secret INTO s FROM private.scheduler_secret ss LIMIT 1;
  END IF;
  RETURN s;
END
$fn$;

REVOKE ALL ON FUNCTION public.get_scheduler_secret() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_scheduler_secret() TO service_role;

-- 256 bits from the core CSPRNG (gen_random_uuid is v4, built in since PG13;
-- avoids depending on where pgcrypto is installed). 64 hex characters.
DO $$
DECLARE
  new_secret text := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
BEGIN
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'cron_secret') THEN
      PERFORM vault.create_secret(new_secret, 'cron_secret', 'GridSense: shared secret for pg_cron -> edge function calls');
    END IF;
  EXCEPTION WHEN undefined_table OR undefined_function OR invalid_schema_name OR insufficient_privilege THEN
    RAISE NOTICE 'Vault unavailable (%); using private.scheduler_secret', SQLERRM;
  END;
  -- Fallback if Vault is missing, or the secret can't be read back from it
  -- (so pg_cron and the edge functions always agree on a non-empty value).
  IF public.get_scheduler_secret() IS NULL THEN
    INSERT INTO private.scheduler_secret (secret) VALUES (new_secret) ON CONFLICT (id) DO NOTHING;
  END IF;
  IF public.get_scheduler_secret() IS NULL THEN
    RAISE EXCEPTION 'Could not provision the scheduler secret';
  END IF;
END $$;


DO $$
DECLARE job_name TEXT;
BEGIN
  FOR job_name IN SELECT unnest(ARRAY[
    'check-carbon-intensity-every-30-min',
    'daily-forecast-hourly',
    'weekly-digest-sunday-9am',
    'monthly-report-1st-9am'
  ])
  LOOP
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = job_name) THEN
      PERFORM cron.unschedule(job_name);
    END IF;
  END LOOP;
END $$;

SELECT cron.schedule('check-carbon-intensity-every-30-min', '*/30 * * * *', $cron$
  SELECT net.http_post(
    url := (SELECT value FROM public.app_config WHERE key = 'supabase_url') || '/functions/v1/check-carbon-intensity',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', coalesce(public.get_scheduler_secret(), '')
    ),
    body := '{}'::jsonb
  );
$cron$);

SELECT cron.schedule('daily-forecast-hourly', '0 * * * *', $cron$
  SELECT net.http_post(
    url := (SELECT value FROM public.app_config WHERE key = 'supabase_url') || '/functions/v1/daily-forecast',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', coalesce(public.get_scheduler_secret(), '')
    ),
    body := '{}'::jsonb
  );
$cron$);

SELECT cron.schedule('weekly-digest-sunday-9am', '0 9 * * 0', $cron$
  SELECT net.http_post(
    url := (SELECT value FROM public.app_config WHERE key = 'supabase_url') || '/functions/v1/weekly-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', coalesce(public.get_scheduler_secret(), '')
    ),
    body := '{}'::jsonb
  );
$cron$);

SELECT cron.schedule('monthly-report-1st-9am', '0 9 1 * *', $cron$
  SELECT net.http_post(
    url := (SELECT value FROM public.app_config WHERE key = 'supabase_url') || '/functions/v1/monthly-report',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', coalesce(public.get_scheduler_secret(), '')
    ),
    body := '{}'::jsonb
  );
$cron$);