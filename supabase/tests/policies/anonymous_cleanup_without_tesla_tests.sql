-- Run after the normal full-migration suite, then exit before legacy Tesla replays.
-- Uses a separate throwaway database: no production object is touched.
\set ON_ERROR_STOP 1
\pset footer off
CREATE TEMP TABLE if_tesla_results (name text, ok boolean, detail text);
-- Compatibility when the independent Tesla-retirement migration lands first.
DROP TABLE public.tesla_charging_sessions, public.tesla_credentials, public.tesla_energy_data, public.tesla_energy_sites, public.tesla_vehicles;


\ir ../../migrations/20261106150000_cleanup_anonymous_accounts.sql
INSERT INTO auth.users(id,is_anonymous,created_at,updated_at,last_sign_in_at) VALUES ('88888888-8888-4888-8888-888888888888',true,'2000-01-01','2000-01-01','2000-01-01');
INSERT INTO public.octopus_credentials(user_id,api_key_encrypted,account_number,created_at,updated_at) VALUES ('88888888-8888-4888-8888-888888888888','secret','no-tesla','2000-01-01','2000-01-01');
DO $$ DECLARE result jsonb; BEGIN
  SELECT public.fn_cleanup_anonymous_accounts(false,now(),100,'00000000-0000-0000-0000-000000000000'::uuid,ARRAY['88888888-8888-4888-8888-888888888888']::uuid[]) INTO result;
  INSERT INTO if_tesla_results VALUES ('live deletion works after Tesla tables are removed', result->>'deleted_count'='1', result::text);
END $$;
SELECT CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END, name, CASE WHEN ok THEN '' ELSE detail END FROM if_tesla_results;
SELECT count(*) FILTER (WHERE ok), count(*) FILTER (WHERE NOT ok) FROM if_tesla_results;
