-- Assertions for 20261106150000_remove_tesla_tables.sql.
-- Run after policy_tests.sql against a THROWAWAY local database only.
\set ON_ERROR_STOP 1
\pset footer off
SET client_min_messages = warning;

CREATE TEMP TABLE results (name text, ok boolean, detail text);

INSERT INTO results
SELECT 'all five Tesla tables dropped', count(*) = 0, string_agg(tablename, ',')
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('tesla_charging_sessions', 'tesla_credentials', 'tesla_energy_data', 'tesla_energy_sites', 'tesla_vehicles');
INSERT INTO results
SELECT 'Tesla link helper dropped', count(*) = 0, count(*)::text
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'has_tesla_linked';
INSERT INTO results
SELECT 'existing auth users survive migration', count(*) = 2, count(*)::text FROM auth.users;
INSERT INTO results
SELECT 'existing Octopus credentials survive migration', count(*) = 2, count(*)::text FROM public.octopus_credentials;

-- Applying the same file again is a no-op (idempotent, no recreation).
\ir ../../migrations/20261106150000_remove_tesla_tables.sql
INSERT INTO results
SELECT 'drop migration is safe to reapply', count(*) = 0, count(*)::text
FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'tesla\_%' ESCAPE '\';

SELECT CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END AS result, name, CASE WHEN ok THEN '' ELSE detail END AS detail FROM results;
SELECT count(*) FILTER (WHERE ok) AS passed, count(*) FILTER (WHERE NOT ok) AS failed FROM results;
