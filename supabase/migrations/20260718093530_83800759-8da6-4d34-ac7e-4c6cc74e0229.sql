CREATE TABLE IF NOT EXISTS public.app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

GRANT SELECT ON public.app_config TO anon, authenticated;
GRANT ALL ON public.app_config TO service_role;

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to app_config" ON public.app_config;
CREATE POLICY "Allow public read access to app_config" ON public.app_config FOR SELECT USING (true);

INSERT INTO public.app_config (key, value)
VALUES ('supabase_url', 'https://klwezcjmlrdwvvzisdtd.supabase.co')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.geocoding_cache (
  query TEXT PRIMARY KEY,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  response_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.geocoding_cache TO anon, authenticated;
GRANT ALL ON public.geocoding_cache TO service_role;

ALTER TABLE public.geocoding_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to geocoding_cache" ON public.geocoding_cache;
CREATE POLICY "Allow public read access to geocoding_cache" ON public.geocoding_cache FOR SELECT USING (true);

-- Reschedule cron jobs to use dynamic URL from app_config
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

SELECT cron.schedule('check-carbon-intensity-every-30-min','*/30 * * * *',
  $$SELECT net.http_post(url:=(SELECT value FROM public.app_config WHERE key='supabase_url')||'/functions/v1/check-carbon-intensity', headers:='{"Content-Type":"application/json"}'::jsonb, body:='{}'::jsonb);$$);
SELECT cron.schedule('daily-forecast-hourly','0 * * * *',
  $$SELECT net.http_post(url:=(SELECT value FROM public.app_config WHERE key='supabase_url')||'/functions/v1/daily-forecast', headers:='{"Content-Type":"application/json"}'::jsonb, body:='{}'::jsonb);$$);
SELECT cron.schedule('weekly-digest-sunday-9am','0 9 * * 0',
  $$SELECT net.http_post(url:=(SELECT value FROM public.app_config WHERE key='supabase_url')||'/functions/v1/weekly-digest', headers:='{"Content-Type":"application/json"}'::jsonb, body:='{}'::jsonb);$$);
SELECT cron.schedule('monthly-report-1st-9am','0 9 1 * *',
  $$SELECT net.http_post(url:=(SELECT value FROM public.app_config WHERE key='supabase_url')||'/functions/v1/monthly-report', headers:='{"Content-Type":"application/json"}'::jsonb, body:='{}'::jsonb);$$);