-- Create app_config table
CREATE TABLE IF NOT EXISTS public.app_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- Seed with development fallback URL
INSERT INTO public.app_config (key, value)
VALUES ('supabase_url', 'https://klwezcjmlrdwvvzisdtd.supabase.co')
ON CONFLICT (key) DO NOTHING;

-- Create geocoding_cache table for caching OpenStreetMap Nominatim lookups
CREATE TABLE IF NOT EXISTS public.geocoding_cache (
    query TEXT PRIMARY KEY,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    response_json JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geocoding_cache ENABLE ROW LEVEL SECURITY;

-- Allow public read access to app_config
CREATE POLICY "Allow public read access to app_config" ON public.app_config FOR SELECT USING (true);
CREATE POLICY "Allow service_role full access to app_config" ON public.app_config FOR ALL USING (true);

-- Allow public read access to geocoding_cache
CREATE POLICY "Allow public read access to geocoding_cache" ON public.geocoding_cache FOR SELECT USING (true);
CREATE POLICY "Allow service_role full access to geocoding_cache" ON public.geocoding_cache FOR ALL USING (true);

-- Recreate cron jobs to use dynamic URL
-- Unschedule jobs first to ensure idempotency
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

-- Schedule jobs using dynamic URL resolution from app_config
SELECT cron.schedule(
    'check-carbon-intensity-every-30-min',
    '*/30 * * * *',
    $$
    SELECT net.http_post(
        url := (SELECT value FROM public.app_config WHERE key = 'supabase_url') || '/functions/v1/check-carbon-intensity',
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
        url := (SELECT value FROM public.app_config WHERE key = 'supabase_url') || '/functions/v1/daily-forecast',
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
        url := (SELECT value FROM public.app_config WHERE key = 'supabase_url') || '/functions/v1/weekly-digest',
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
        url := (SELECT value FROM public.app_config WHERE key = 'supabase_url') || '/functions/v1/monthly-report',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := '{}'::jsonb
    );
    $$
);
