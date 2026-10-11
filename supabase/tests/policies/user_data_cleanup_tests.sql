-- Assertions for 20261011100000_user_data_cleanup.sql.
-- Run by run.sh after policy_tests.sql, in the same database (reuses its users
-- 1111.../2222... and meter M-1 fixtures).
\set ON_ERROR_STOP 1
\pset footer off
SET client_min_messages = warning;

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

-- 8. User data cleanup (20261011100000_user_data_cleanup.sql)
-- 8a. Deleting a meter (Octopus disconnect) removes its readings and dispatches
INSERT INTO public.octopus_meters (user_id, mpan, serial_number) VALUES ('22222222-2222-2222-2222-222222222222', 'M-9', 'S9');
INSERT INTO public.octopus_consumption (interval_start, interval_end, consumption_kwh, mpan, serial_number) VALUES ('2026-10-02 00:00Z', '2026-10-02 00:30Z', 0.5, 'M-9', 'S9');
INSERT INTO public.carbon_footprint (interval_start, interval_end, consumption_kwh, intensity_gco2_kwh, carbon_g, intensity_index, mpan) VALUES ('2026-10-02 00:00Z', '2026-10-02 00:30Z', 0.5, 100, 50, 'low', 'M-9');
INSERT INTO public.octopus_intelligent_dispatches (user_id, mpan, dispatch_type, start_time, end_time) VALUES ('22222222-2222-2222-2222-222222222222', 'M-9', 'completed', '2026-10-02 01:00Z', '2026-10-02 02:00Z');
SELECT pg_temp.check('disconnect: service_role deletes meter', 'service_role', NULL, $q$WITH d AS (DELETE FROM public.octopus_meters WHERE mpan = 'M-9' RETURNING 1) SELECT count(*)::text FROM d$q$, 'OK:1');
INSERT INTO results SELECT 'disconnect: meter consumption deleted', count(*) = 0, count(*)::text FROM public.octopus_consumption WHERE mpan = 'M-9';
INSERT INTO results SELECT 'disconnect: meter footprint deleted', count(*) = 0, count(*)::text FROM public.carbon_footprint WHERE mpan = 'M-9';
INSERT INTO results SELECT 'disconnect: meter dispatches deleted', count(*) = 0, count(*)::text FROM public.octopus_intelligent_dispatches WHERE mpan = 'M-9';
INSERT INTO results SELECT 'disconnect: other users readings untouched', count(*) = 1, count(*)::text FROM public.octopus_consumption WHERE mpan = 'M-1';

-- 8b. Deleting the auth user cascades all the way down
INSERT INTO auth.users VALUES ('44444444-4444-4444-4444-444444444444', false);
INSERT INTO public.octopus_meters (user_id, mpan, serial_number) VALUES ('44444444-4444-4444-4444-444444444444', 'M-4', 'S4');
INSERT INTO public.octopus_consumption (interval_start, interval_end, consumption_kwh, mpan, serial_number) VALUES ('2026-10-02 00:00Z', '2026-10-02 00:30Z', 0.5, 'M-4', 'S4');
INSERT INTO public.carbon_footprint (interval_start, interval_end, consumption_kwh, intensity_gco2_kwh, carbon_g, intensity_index, mpan) VALUES ('2026-10-02 00:00Z', '2026-10-02 00:30Z', 0.5, 100, 50, 'low', 'M-4');
INSERT INTO public.octopus_intelligent_dispatches (user_id, mpan, dispatch_type, start_time, end_time) VALUES ('44444444-4444-4444-4444-444444444444', 'M-OTHER', 'planned', '2026-10-02 01:00Z', '2026-10-02 02:00Z');
INSERT INTO public.push_subscriptions (device_token, postcode, user_id) VALUES ('tok-4', 'SW1', '44444444-4444-4444-4444-444444444444');
DELETE FROM auth.users WHERE id = '44444444-4444-4444-4444-444444444444';
INSERT INTO results SELECT 'account delete: meters, readings, dispatches, push gone',
  (SELECT count(*) FROM public.octopus_meters WHERE mpan = 'M-4') + (SELECT count(*) FROM public.octopus_consumption WHERE mpan = 'M-4')
  + (SELECT count(*) FROM public.carbon_footprint WHERE mpan = 'M-4') + (SELECT count(*) FROM public.octopus_intelligent_dispatches WHERE user_id = '44444444-4444-4444-4444-444444444444')
  + (SELECT count(*) FROM public.push_subscriptions WHERE device_token = 'tok-4') = 0, 'remaining rows';
SELECT pg_temp.check('dispatches need a real user (FK)', 'service_role', NULL, $q$INSERT INTO public.octopus_intelligent_dispatches (user_id, mpan, dispatch_type, start_time, end_time) VALUES ('99999999-9999-9999-9999-999999999999', 'M-X', 'planned', now(), now()) RETURNING 1::text$q$, 'ERR:%foreign key%');
SELECT pg_temp.check('authenticated cannot call fn_delete_meter_readings directly', 'authenticated', '11111111-1111-1111-1111-111111111111', $q$SELECT public.fn_delete_meter_readings()::text$q$, 'ERR:%');

-- 8c. Push subscriptions with no account
INSERT INTO public.push_subscriptions (device_token, postcode, user_id, updated_at) VALUES
  ('anon-old-off', 'SW1', NULL, now() - interval '40 days'),
  ('anon-recent-off', 'SW1', NULL, now() - interval '5 days'),
  ('acct-old-off', 'SW1', '22222222-2222-2222-2222-222222222222', now() - interval '40 days');
INSERT INTO public.push_subscriptions (device_token, postcode, user_id, low_intensity_enabled, updated_at) VALUES
  ('anon-old-on', 'SW1', NULL, true, now() - interval '400 days');
SELECT pg_temp.check('anon cannot run push cleanup', 'anon', NULL, $q$SELECT public.fn_cleanup_push_subscriptions()::text$q$, 'ERR:permission denied%');
SELECT pg_temp.check('authenticated cannot run push cleanup', 'authenticated', '11111111-1111-1111-1111-111111111111', $q$SELECT public.fn_cleanup_push_subscriptions()::text$q$, 'ERR:permission denied%');
SELECT pg_temp.check('push cleanup removes only stale, all-off, no-account rows', 'service_role', NULL, $q$SELECT public.fn_cleanup_push_subscriptions()::text$q$, 'OK:1');
INSERT INTO results SELECT 'push cleanup keeps enabled / recent / account-linked rows', count(*) = 3, string_agg(device_token, ',') FROM public.push_subscriptions WHERE device_token IN ('anon-old-off','anon-recent-off','acct-old-off','anon-old-on');

SELECT CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END AS result, name, CASE WHEN ok THEN '' ELSE detail END AS detail FROM results;
SELECT count(*) FILTER (WHERE ok) AS passed, count(*) FILTER (WHERE NOT ok) AS failed FROM results;
