-- 1. Add user_id to push_subscriptions
ALTER TABLE public.push_subscriptions 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);

-- 2. Add is_sandbox to push_subscriptions
ALTER TABLE public.push_subscriptions 
ADD COLUMN IF NOT EXISTS is_sandbox BOOLEAN NOT NULL DEFAULT false;

-- 3. Enable extensions and schedule cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Unschedule any pre-existing jobs with the same names to keep this idempotent
DO $$
DECLARE
  job_name TEXT;
BEGIN
  FOR job_name IN SELECT unnest(ARRAY[
    'check-carbon-intensity-every-30-min',
    'daily-forecast-hourly',
    'weekly-digest-sunday-9am',
    'monthly-report-1st-9am'
  ])
  LOOP
    PERFORM cron.unschedule(job_name) WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = job_name);
  END LOOP;
END $$;

SELECT cron.schedule(
    'check-carbon-intensity-every-30-min',
    '*/30 * * * *',
    $$
    SELECT net.http_post(
        url := 'https://klwezcjmlrdwvvzisdtd.supabase.co/functions/v1/check-carbon-intensity',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := '{}'::jsonb
    );
    $$
);

SELECT cron.schedule(
    'daily-forecast-hourly',
    '0 * * * *',
    $$
    SELECT net.http_post(
        url := 'https://klwezcjmlrdwvvzisdtd.supabase.co/functions/v1/daily-forecast',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := '{}'::jsonb
    );
    $$
);

SELECT cron.schedule(
    'weekly-digest-sunday-9am',
    '0 9 * * 0',
    $$
    SELECT net.http_post(
        url := 'https://klwezcjmlrdwvvzisdtd.supabase.co/functions/v1/weekly-digest',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := '{}'::jsonb
    );
    $$
);

SELECT cron.schedule(
    'monthly-report-1st-9am',
    '0 9 1 * *',
    $$
    SELECT net.http_post(
        url := 'https://klwezcjmlrdwvvzisdtd.supabase.co/functions/v1/monthly-report',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := '{}'::jsonb
    );
    $$
);