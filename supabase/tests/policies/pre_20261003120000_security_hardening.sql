-- Simulate what an attacker could have done while app_config was writable by
-- anon: point the cron target at their own server. The migration must reset it.
UPDATE public.app_config SET value = 'https://attacker.example' WHERE key = 'supabase_url';
