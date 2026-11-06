-- Local throwaway database only. Assertions for anonymous-account retention.
\set ON_ERROR_STOP 1
\pset footer off
SET client_min_messages = warning;
CREATE TEMP TABLE cleanup_results (name text, ok boolean, detail text);
INSERT INTO cleanup_results
SELECT 'migration creates no cron jobs', count(*) = 5, count(*)::text FROM cron.job;

-- An entirely abandoned anonymous account, including legacy Tesla rows.
INSERT INTO auth.users(id, is_anonymous, created_at, updated_at, last_sign_in_at) VALUES
  ('66aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', true, '2000-01-01', '2000-01-01', '2000-01-01');
INSERT INTO auth.sessions(user_id, created_at, refreshed_at) VALUES ('66aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '2000-01-01', '2000-01-02');
INSERT INTO auth.identities(user_id, provider, updated_at, last_sign_in_at) VALUES ('66aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'anonymous', '2000-01-01', '2000-01-01');
INSERT INTO public.octopus_meters(user_id, mpan, serial_number, last_sync_at) VALUES ('66aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'CLEANUP-OLD', 'OLD', now());
INSERT INTO public.octopus_consumption(interval_start, interval_end, consumption_kwh, mpan, serial_number) VALUES ('2000-01-01', '2000-01-01 00:30', 1, 'CLEANUP-OLD', 'OLD');
INSERT INTO public.carbon_footprint(interval_start, interval_end, consumption_kwh, intensity_gco2_kwh, carbon_g, intensity_index, mpan) VALUES ('2000-01-01', '2000-01-01 00:30', 1, 100, 100, 'mid', 'CLEANUP-OLD');
INSERT INTO public.octopus_intelligent_dispatches(user_id, mpan, dispatch_type, start_time, end_time) VALUES ('66aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'CLEANUP-OLD', 'planned', '2000-01-01', '2000-01-02');
INSERT INTO public.octopus_credentials(user_id,api_key_encrypted,account_number,created_at,updated_at) VALUES ('66aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'secret', 'A', '2000-01-01', '2000-01-01');
INSERT INTO public.user_preferences(user_id,created_at,updated_at) VALUES ('66aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','2000-01-01','2000-01-01');
INSERT INTO public.push_subscriptions(device_token, postcode, user_id) VALUES ('cleanup-token', 'SW1A', '66aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
INSERT INTO public.tesla_charging_sessions(user_id, vehicle_id, started_at, energy_added_kwh) VALUES ('66aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'v', '2000-01-01', 1);
INSERT INTO public.tesla_credentials(user_id, access_token, refresh_token, token_expires_at) VALUES ('66aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 't', 'r', '2000-01-01');
INSERT INTO public.tesla_energy_data(user_id, site_id, timestamp, solar_generation_kwh, battery_charge_kwh, battery_discharge_kwh, grid_import_kwh, grid_export_kwh) VALUES ('66aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 's', '2000-01-01', 0, 0, 0, 0, 0);
INSERT INTO public.tesla_energy_sites(user_id, site_id) VALUES ('66aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 's');
INSERT INTO public.tesla_vehicles(user_id, vehicle_id) VALUES ('66aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'v');

-- Recent sign-in, session refresh, provider identity, preferences and credential
-- activity each protect a separate stale-created account. Fresh meter sync alone
-- must not keep an abandoned account alive forever.
INSERT INTO auth.users(id, is_anonymous, created_at, updated_at, last_sign_in_at)
SELECT id, true, '2000-01-01', '2000-01-01', '2000-01-01' FROM unnest(ARRAY[
 '7bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid,'77cccccc-cccc-4ccc-8ccc-cccccccccccc'::uuid,
 '77dddddd-dddd-4ddd-8ddd-dddddddddddd'::uuid,'77eeeeee-eeee-4eee-8eee-eeeeeeeeeeee'::uuid,
 '77ffffff-ffff-4fff-8fff-ffffffffffff'::uuid,'66121212-2121-4121-8121-121212121212'::uuid,
 '71313131-3131-4131-8131-131313131313'::uuid
]) tabs(id);
UPDATE auth.users SET last_sign_in_at = now() WHERE id = '7bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
INSERT INTO auth.sessions(user_id, created_at, refreshed_at) VALUES ('77cccccc-cccc-4ccc-8ccc-cccccccccccc', '2000-01-01', now());
INSERT INTO auth.identities(user_id, provider, updated_at, last_sign_in_at) VALUES ('77dddddd-dddd-4ddd-8ddd-dddddddddddd', 'google', now(), now());
INSERT INTO public.user_preferences(user_id,created_at,updated_at) VALUES ('77eeeeee-eeee-4eee-8eee-eeeeeeeeeeee',now(),now());
INSERT INTO public.octopus_credentials(user_id,api_key_encrypted,account_number,created_at,updated_at) VALUES ('77ffffff-ffff-4fff-8fff-ffffffffffff', 'secret', 'F', now(), now());
INSERT INTO public.octopus_meters(user_id, mpan, serial_number, last_sync_at) VALUES ('66121212-2121-4121-8121-121212121212', 'CLEANUP-METER', 'M', now());
UPDATE auth.users SET is_anonymous = false WHERE id = '71313131-3131-4131-8131-131313131313';

DO $$ DECLARE preview jsonb; next_preview jsonb; live jsonb; v_next_before_id uuid; BEGIN
  SELECT public.fn_cleanup_anonymous_accounts(true, now(), 1, '00000000-0000-0000-0000-000000000000'::uuid, NULL) INTO preview;
  INSERT INTO cleanup_results VALUES ('default is capped dry run with pagination', preview->>'dry_run' = 'true' AND preview->>'has_more' = 'true' AND (preview->'candidate_ids') ? '66121212-2121-4121-8121-121212121212' AND preview->>'next_before_id' = '66121212-2121-4121-8121-121212121212', preview::text);
  v_next_before_id := (preview->>'next_before_id')::uuid;
  SELECT public.fn_cleanup_anonymous_accounts(true, now(), 100, v_next_before_id, NULL) INTO next_preview;
  INSERT INTO cleanup_results VALUES ('pagination resumes without skipping candidates', (next_preview->'candidate_ids') ? '66aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' AND next_preview->>'has_more' = 'false', next_preview::text);
  SELECT public.fn_cleanup_anonymous_accounts(true, now(), 100, '00000000-0000-0000-0000-000000000000'::uuid, NULL) INTO preview;
  INSERT INTO cleanup_results VALUES ('fixed 180-day floor cannot be shortened', preview->>'candidate_count' = '2', preview::text);
  IF preview->>'candidate_count' <> '2' THEN RAISE EXCEPTION 'Expected exactly two stale candidates: %', preview; END IF;
  BEGIN
    PERFORM public.fn_cleanup_anonymous_accounts(false, now(), 100, '00000000-0000-0000-0000-000000000000'::uuid, NULL);
    INSERT INTO cleanup_results VALUES ('deletion refuses missing allowlist', false, 'no exception caught');
  EXCEPTION WHEN others THEN INSERT INTO cleanup_results VALUES ('deletion refuses missing allowlist', true, SQLERRM);
  END;
  SELECT public.fn_cleanup_anonymous_accounts(false, now(), 100, '00000000-0000-0000-0000-000000000000'::uuid,
      ARRAY['66aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','66121212-2121-4121-8121-121212121212',
      '7bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','77cccccc-cccc-4ccc-8ccc-cccccccccccc',
      '77dddddd-dddd-4ddd-8ddd-dddddddddddd','77eeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      '77ffffff-ffff-4fff-8fff-ffffffffffff','71313131-3131-4131-8131-131313131313']::uuid[]) INTO live;
  INSERT INTO cleanup_results VALUES ('reviewed live batch deletes only the selected stale accounts', live->>'deleted_count' = '2', live::text);
END $$;

INSERT INTO cleanup_results
SELECT 'every stale anonymous account row is gone', value = 0, table_name || ' ' || value FROM unnest(ARRAY[
 'consumption','footprint','dispatches','meters','credentials','preferences','push','sessions','identities','users',
 'tesla_charging','tesla_credentials','tesla_energy','tesla_sites','tesla_vehicles'], ARRAY[
 (SELECT count(*) FROM public.octopus_consumption WHERE mpan IN ('CLEANUP-OLD','CLEANUP-METER')),
 (SELECT count(*) FROM public.carbon_footprint WHERE mpan = 'CLEANUP-OLD'),
 (SELECT count(*) FROM public.octopus_intelligent_dispatches WHERE user_id IN ('66aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','66121212-2121-4121-8121-121212121212')),
 (SELECT count(*) FROM public.octopus_meters WHERE mpan IN ('CLEANUP-OLD','CLEANUP-METER')),
 (SELECT count(*) FROM public.octopus_credentials WHERE user_id = '66aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
 (SELECT count(*) FROM public.user_preferences WHERE user_id = '66aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
 (SELECT count(*) FROM public.push_subscriptions WHERE user_id = '66aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
 (SELECT count(*) FROM auth.sessions WHERE user_id = '66aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
 (SELECT count(*) FROM auth.identities WHERE user_id = '66aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
 (SELECT count(*) FROM auth.users WHERE id = ANY(ARRAY['66aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','66121212-2121-4121-8121-121212121212']::uuid[])),
 (SELECT count(*) FROM public.tesla_charging_sessions WHERE user_id = '66aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
 (SELECT count(*) FROM public.tesla_credentials WHERE user_id = '66aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
 (SELECT count(*) FROM public.tesla_energy_data WHERE user_id = '66aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
 (SELECT count(*) FROM public.tesla_energy_sites WHERE user_id = '66aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
 (SELECT count(*) FROM public.tesla_vehicles WHERE user_id = '66aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
]) rows(table_name, value);
INSERT INTO cleanup_results
SELECT 'all recent and nonanonymous accounts survive including an overbroad allowlist', count(*) = 6, string_agg(id::text, ',') FROM auth.users WHERE id IN ('7bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','77cccccc-cccc-4ccc-8ccc-cccccccccccc','77dddddd-dddd-4ddd-8ddd-dddddddddddd','77eeeeee-eeee-4eee-8eee-eeeeeeeeeeee','77ffffff-ffff-4fff-8fff-ffffffffffff','71313131-3131-4131-8131-131313131313');
INSERT INTO cleanup_results VALUES ('migration reapply does not schedule jobs', (SELECT count(*) FROM cron.job) = 5, 'existing main fixtures only');
INSERT INTO cleanup_results
SELECT 'migration reapply preserves live deletion grant boundary', count(*) = 0, count(*)::text
FROM information_schema.routine_privileges WHERE routine_schema = 'public' AND routine_name = 'fn_cleanup_anonymous_accounts' AND grantee IN ('PUBLIC','anon','authenticated');
\ir ../../migrations/20261106150000_cleanup_anonymous_accounts.sql
INSERT INTO cleanup_results
SELECT 'migration is safe to reapply', NOT EXISTS(SELECT 1 FROM auth.users WHERE id = '66aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), 'reapplied after deletion';
SELECT public.fn_cleanup_anonymous_accounts(false, now(), 100, '00000000-0000-0000-0000-000000000000'::uuid, ARRAY['66aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa']::uuid[]) AS idempotent_repeat \gset cleanup_
INSERT INTO cleanup_results VALUES ('repeat live deletion is a no-op', (:'cleanup_idempotent_repeat')::jsonb->>'deleted_count' = '0', :'cleanup_idempotent_repeat');



-- Separate rollback fixture, short-circuits on the final account delete.
INSERT INTO auth.users(id,is_anonymous,created_at,updated_at,last_sign_in_at) VALUES ('00000000-0000-4000-8000-00000000aaaa',true,'2000-01-01','2000-01-01','2000-01-01');
INSERT INTO public.octopus_credentials(user_id,api_key_encrypted,account_number,created_at,updated_at) VALUES ('00000000-0000-4000-8000-00000000aaaa','secret','rollback','2000-01-01','2000-01-01');
CREATE OR REPLACE FUNCTION public.fail_cleanup_test_user() RETURNS trigger LANGUAGE plpgsql AS $trigger$ BEGIN RAISE EXCEPTION 'intentional test rollback'; END $trigger$;
CREATE CONSTRAINT TRIGGER fail_cleanup_test_user AFTER DELETE ON auth.users FOR EACH ROW EXECUTE FUNCTION public.fail_cleanup_test_user();
DO $$ BEGIN
  BEGIN
    PERFORM public.fn_cleanup_anonymous_accounts(false,now(),100,'00000000-0000-0000-0000-000000000000'::uuid,ARRAY['00000000-0000-4000-8000-00000000aaaa']::uuid[]);
    RAISE EXCEPTION 'Expected intentional rollback test failure';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'intentional test rollback' THEN RAISE; END IF;
  END;
END $$;
DROP TRIGGER fail_cleanup_test_user ON auth.users;
INSERT INTO cleanup_results SELECT 'mid-batch failure leaves all rows untouched', count(*)=2, count(*)::text FROM (SELECT user_id::text FROM public.octopus_credentials WHERE user_id='00000000-0000-4000-8000-00000000aaaa' UNION ALL SELECT id::text FROM auth.users WHERE id='00000000-0000-4000-8000-00000000aaaa') kept;

DO $$ BEGIN
  BEGIN
    SET LOCAL ROLE anon;
    PERFORM public.fn_cleanup_anonymous_accounts();
    RAISE EXCEPTION 'anon unexpectedly allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RESET ROLE;
  BEGIN
    SET LOCAL ROLE authenticated;
    PERFORM public.fn_cleanup_anonymous_accounts();
    RAISE EXCEPTION 'authenticated unexpectedly allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  INSERT INTO cleanup_results VALUES ('anon and authenticated cannot call cleanup RPC', true, 'permission denied');
END $$;
SELECT CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END, name, CASE WHEN ok THEN '' ELSE detail END FROM cleanup_results;
SELECT count(*) FILTER (WHERE ok), count(*) FILTER (WHERE NOT ok) FROM cleanup_results;