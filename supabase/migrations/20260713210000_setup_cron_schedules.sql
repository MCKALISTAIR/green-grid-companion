-- Enable pg_cron and pg_net extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule check-carbon-intensity every 30 minutes
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

-- Schedule daily-forecast every hour (at minute 0)
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

-- Schedule weekly-digest every Sunday at 9 AM
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

-- Schedule monthly-report on the 1st of every month at 9 AM
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
