-- Supabase-like shim for running migrations on vanilla Postgres in tests ONLY.
-- Never run this against a real Supabase project.
-- Minimal Supabase-like environment for testing migrations on vanilla Postgres
DO $$ BEGIN CREATE ROLE anon NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE authenticated NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE service_role NOLOGIN BYPASSRLS; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT CREATE ON SCHEMA public TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA auth; GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
CREATE TABLE auth.users (id uuid PRIMARY KEY, is_anonymous boolean DEFAULT false);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT current_setting('request.jwt.claim.role', true) $$;
CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO anon, authenticated, service_role;
CREATE SCHEMA cron; CREATE TABLE cron.job (jobid serial PRIMARY KEY, jobname text UNIQUE, schedule text, command text);
CREATE FUNCTION cron.schedule(n text, s text, c text) RETURNS bigint LANGUAGE sql AS $$ INSERT INTO cron.job(jobname, schedule, command) VALUES (n,s,c) ON CONFLICT (jobname) DO UPDATE SET schedule=excluded.schedule, command=excluded.command RETURNING jobid $$;
CREATE FUNCTION cron.unschedule(n text) RETURNS boolean LANGUAGE sql AS $$ DELETE FROM cron.job WHERE jobname = n RETURNING true $$;
CREATE SCHEMA net; CREATE TABLE net.calls (id serial, url text, headers jsonb, body jsonb);
CREATE FUNCTION net.http_post(url text, headers jsonb DEFAULT '{}', body jsonb DEFAULT '{}') RETURNS bigint LANGUAGE sql AS $$ INSERT INTO net.calls(url, headers, body) VALUES (url, headers, body) RETURNING id $$;
CREATE SCHEMA vault; CREATE TABLE vault.secrets (name text PRIMARY KEY, secret text);
CREATE VIEW vault.decrypted_secrets AS SELECT name, secret AS decrypted_secret FROM vault.secrets;
CREATE FUNCTION vault.create_secret(s text, n text) RETURNS text LANGUAGE sql AS $$ INSERT INTO vault.secrets VALUES (n, s) RETURNING n $$;
CREATE SCHEMA realtime; CREATE TABLE realtime.messages (id serial, topic text); ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION realtime.topic() RETURNS text LANGUAGE sql AS $$ SELECT current_setting('realtime.topic', true) $$;
CREATE SCHEMA extensions;
CREATE PUBLICATION supabase_realtime;
