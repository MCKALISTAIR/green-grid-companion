-- Policy/privilege assertions for 20261003120000_security_hardening.sql
\set ON_ERROR_STOP 1
\pset footer off
SET client_min_messages = warning;
INSERT INTO auth.users VALUES ('11111111-1111-1111-1111-111111111111', false), ('22222222-2222-2222-2222-222222222222', false);
INSERT INTO public.octopus_credentials (user_id, api_key_encrypted, api_key_hint, account_number) VALUES
  ('11111111-1111-1111-1111-111111111111', 'v1.aaa.bbb', 'AAAA', 'A-11111111'),
  ('22222222-2222-2222-2222-222222222222', 'v1.ccc.ddd', 'BBBB', 'A-22222222');
INSERT INTO public.push_subscriptions (id, device_token, postcode) VALUES ('33333333-3333-3333-3333-333333333333', 'tok', 'SW1');

CREATE TEMP TABLE results (name text, ok boolean, detail text);
GRANT ALL ON results TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION pg_temp.run_as(p_role text, p_sub text, p_sql text) RETURNS text LANGUAGE plpgsql AS $$
DECLARE r text;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', coalesce(p_sub, ''), true);
  EXECUTE format('SET LOCAL ROLE %I', p_role);
  BEGIN
    EXECUTE p_sql INTO r;
    RESET ROLE;
    RETURN 'OK:' || coalesce(r, '<null>');
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    RETURN 'ERR:' || SQLERRM;
  END;
END $$;

CREATE OR REPLACE FUNCTION pg_temp.check(p_name text, p_role text, p_sub text, p_sql text, p_expect text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE r text;
BEGIN
  r := pg_temp.run_as(p_role, p_sub, p_sql);
  INSERT INTO results VALUES (p_name, r LIKE p_expect, r);
END $$;

-- 1. app_config / geocoding_cache
SELECT pg_temp.check('anon cannot update app_config', 'anon', NULL, $q$UPDATE public.app_config SET value='https://evil.example' WHERE key='supabase_url' RETURNING value$q$, 'ERR:permission denied%');
SELECT pg_temp.check('authenticated cannot update app_config', 'authenticated', '11111111-1111-1111-1111-111111111111', $q$UPDATE public.app_config SET value='https://evil.example' WHERE key='supabase_url' RETURNING value$q$, 'ERR:permission denied%');
SELECT pg_temp.check('anon cannot insert app_config', 'anon', NULL, $q$INSERT INTO public.app_config VALUES ('x','y') RETURNING key$q$, 'ERR:permission denied%');
SELECT pg_temp.check('anon cannot delete app_config', 'anon', NULL, $q$DELETE FROM public.app_config RETURNING key$q$, 'ERR:permission denied%');
SELECT pg_temp.check('anon cannot read app_config', 'anon', NULL, $q$SELECT value FROM public.app_config LIMIT 1$q$, 'ERR:permission denied%');
SELECT pg_temp.check('anon cannot insert geocoding_cache', 'anon', NULL, $q$INSERT INTO public.geocoding_cache (query, latitude, longitude, response_json) VALUES ('q',1,1,'{}') RETURNING query$q$, 'ERR:permission denied%');
SELECT pg_temp.check('authenticated cannot read geocoding_cache', 'authenticated', '11111111-1111-1111-1111-111111111111', $q$SELECT count(*)::text FROM public.geocoding_cache$q$, 'ERR:permission denied%');
SELECT pg_temp.check('service_role can update app_config', 'service_role', NULL, $q$UPDATE public.app_config SET value=value WHERE key='supabase_url' RETURNING key$q$, 'OK:supabase_url');
SELECT pg_temp.check('service_role can write geocoding_cache', 'service_role', NULL, $q$INSERT INTO public.geocoding_cache (query, latitude, longitude, response_json) VALUES ('q',1,1,'{}') RETURNING query$q$, 'OK:q');

-- 2. rate limiter
SELECT pg_temp.check('anon cannot call fn_check_rate_limit', 'anon', NULL, $q$SELECT public.fn_check_rate_limit('22222222-2222-2222-2222-222222222222:save-credentials', 0, 60000, 300000)::text$q$, 'ERR:permission denied%');
SELECT pg_temp.check('authenticated cannot call fn_check_rate_limit', 'authenticated', '11111111-1111-1111-1111-111111111111', $q$SELECT public.fn_check_rate_limit('22222222-2222-2222-2222-222222222222:save-credentials', 0, 60000, 300000)::text$q$, 'ERR:permission denied%');
SELECT pg_temp.check('authenticated cannot read rate_limits', 'authenticated', '11111111-1111-1111-1111-111111111111', $q$SELECT count(*)::text FROM public.rate_limits$q$, 'ERR:permission denied%');
SELECT pg_temp.check('service_role can call fn_check_rate_limit', 'service_role', NULL, $q$SELECT (public.fn_check_rate_limit('u:save-credentials', 5, 60000, 300000)->>'allowed')$q$, 'OK:true');

-- 3. octopus_credentials
SELECT pg_temp.check('anon cannot read credentials', 'anon', NULL, $q$SELECT count(*)::text FROM public.octopus_credentials$q$, 'ERR:permission denied%');
SELECT pg_temp.check('user cannot select api_key', 'authenticated', '11111111-1111-1111-1111-111111111111', $q$SELECT api_key FROM public.octopus_credentials LIMIT 1$q$, 'ERR:permission denied%');
SELECT pg_temp.check('user cannot select api_key_encrypted', 'authenticated', '11111111-1111-1111-1111-111111111111', $q$SELECT api_key_encrypted FROM public.octopus_credentials LIMIT 1$q$, 'ERR:permission denied%');
SELECT pg_temp.check('user cannot select *', 'authenticated', '11111111-1111-1111-1111-111111111111', $q$SELECT count(*)::text FROM (SELECT * FROM public.octopus_credentials) s$q$, 'ERR:permission denied%');
SELECT pg_temp.check('user sees only own row (safe columns)', 'authenticated', '11111111-1111-1111-1111-111111111111', $q$SELECT string_agg(account_number || '/' || api_key_hint, ',') FROM public.octopus_credentials$q$, 'OK:A-11111111/AAAA');
SELECT pg_temp.check('user cannot insert credentials', 'authenticated', '11111111-1111-1111-1111-111111111111', $q$INSERT INTO public.octopus_credentials (user_id, api_key, account_number) VALUES ('11111111-1111-1111-1111-111111111111','sk_live_x','A-1') RETURNING user_id::text$q$, 'ERR:permission denied%');
SELECT pg_temp.check('user cannot update credentials', 'authenticated', '11111111-1111-1111-1111-111111111111', $q$UPDATE public.octopus_credentials SET account_number='A-X' RETURNING user_id::text$q$, 'ERR:permission denied%');
SELECT pg_temp.check('user cannot delete credentials', 'authenticated', '11111111-1111-1111-1111-111111111111', $q$DELETE FROM public.octopus_credentials RETURNING user_id::text$q$, 'ERR:permission denied%');
SELECT pg_temp.check('get_my_credentials_status works for owner', 'authenticated', '11111111-1111-1111-1111-111111111111', $q$SELECT account_number FROM public.get_my_credentials_status()$q$, 'OK:A-11111111');
SELECT pg_temp.check('anon cannot call get_my_credentials_status', 'anon', NULL, $q$SELECT count(*)::text FROM public.get_my_credentials_status()$q$, 'ERR:permission denied%');
SELECT pg_temp.check('service_role can read encrypted key', 'service_role', NULL, $q$SELECT api_key_encrypted FROM public.octopus_credentials WHERE user_id='22222222-2222-2222-2222-222222222222'$q$, 'OK:v1.ccc.ddd');
SELECT pg_temp.check('row must have a key', 'service_role', NULL, $q$INSERT INTO public.octopus_credentials (user_id, account_number) VALUES ('11111111-1111-1111-1111-111111111111','A-1') ON CONFLICT (user_id) DO UPDATE SET api_key_encrypted = NULL RETURNING user_id::text$q$, 'ERR:%octopus_credentials_api_key_present%');

-- 4. idempotency log
SELECT pg_temp.check('anon cannot touch notification log', 'anon', NULL, $q$SELECT count(*)::text FROM public.scheduled_notification_log$q$, 'ERR:permission denied%');
SELECT pg_temp.check('authenticated cannot write notification log', 'authenticated', '11111111-1111-1111-1111-111111111111', $q$INSERT INTO public.scheduled_notification_log (job_name, period_key, subscription_id) VALUES ('weekly-digest','2026-W40','33333333-3333-3333-3333-333333333333') RETURNING job_name$q$, 'ERR:permission denied%');
SELECT pg_temp.check('first claim succeeds', 'service_role', NULL, $q$INSERT INTO public.scheduled_notification_log (job_name, period_key, subscription_id) VALUES ('weekly-digest','2026-W40','33333333-3333-3333-3333-333333333333') ON CONFLICT DO NOTHING RETURNING subscription_id::text$q$, 'OK:33333333-3333-3333-3333-333333333333');
SELECT pg_temp.check('duplicate claim returns nothing', 'service_role', NULL, $q$INSERT INTO public.scheduled_notification_log (job_name, period_key, subscription_id) VALUES ('weekly-digest','2026-W40','33333333-3333-3333-3333-333333333333') ON CONFLICT DO NOTHING RETURNING subscription_id::text$q$, 'OK:<null>');

-- 5. scheduler secret + cron jobs
INSERT INTO results SELECT 'supabase_url reset to the real project URL', value = 'https://klwezcjmlrdwvvzisdtd.supabase.co', value FROM public.app_config WHERE key = 'supabase_url';
SELECT pg_temp.check('anon cannot call get_scheduler_secret', 'anon', NULL, $q$SELECT public.get_scheduler_secret()$q$, 'ERR:permission denied%');
SELECT pg_temp.check('authenticated cannot call get_scheduler_secret', 'authenticated', '11111111-1111-1111-1111-111111111111', $q$SELECT public.get_scheduler_secret()$q$, 'ERR:permission denied%');
SELECT pg_temp.check('anon cannot read private.scheduler_secret', 'anon', NULL, $q$SELECT secret FROM private.scheduler_secret$q$, 'ERR:permission denied%');
SELECT pg_temp.check('authenticated cannot read vault secrets', 'authenticated', '11111111-1111-1111-1111-111111111111', $q$SELECT count(*)::text FROM vault.decrypted_secrets$q$, 'ERR:%');
SELECT pg_temp.check('service_role gets a 64-hex scheduler secret', 'service_role', NULL, $q$SELECT (public.get_scheduler_secret() ~ '^[0-9a-f]{64}$')::text$q$, 'OK:true');
DO $$
DECLARE in_vault boolean := false; in_private boolean;
BEGIN
  IF to_regclass('vault.secrets') IS NOT NULL THEN
    EXECUTE $v$SELECT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'cron_secret')$v$ INTO in_vault;
  END IF;
  SELECT EXISTS (SELECT 1 FROM private.scheduler_secret) INTO in_private;
  INSERT INTO results VALUES ('secret stored in Vault when available (else private table)',
    CASE WHEN to_regclass('vault.secrets') IS NOT NULL THEN in_vault AND NOT in_private ELSE in_private END,
    CASE WHEN to_regclass('vault.secrets') IS NOT NULL THEN 'vault' ELSE 'private table' END);
END $$;
DO $$ DECLARE c text; BEGIN FOR c IN SELECT command FROM cron.job LOOP EXECUTE c; END LOOP; END $$;
INSERT INTO results SELECT 'all 4 cron jobs send the scheduler secret', count(*) = 4 AND bool_and(headers->>'x-cron-secret' = public.get_scheduler_secret()), count(*)::text || ' calls' FROM net.calls;
INSERT INTO results SELECT 'cron jobs target the real project URL', bool_and(url LIKE 'https://klwezcjmlrdwvvzisdtd.supabase.co/functions/v1/%'), string_agg(DISTINCT split_part(url, '/functions', 1), ',') FROM net.calls;
INSERT INTO results SELECT 'cron job set unchanged (4 jobs)', count(*) = 4, string_agg(jobname, ',') FROM cron.job;

SELECT CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END AS result, name, CASE WHEN ok THEN '' ELSE detail END AS detail FROM results;
SELECT count(*) FILTER (WHERE ok) AS passed, count(*) FILTER (WHERE NOT ok) AS failed FROM results;
