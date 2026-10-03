# Security hardening (Oct 2026): deploy runbook

This PR changes the database, five edge functions and the client. **Nothing is
applied automatically.** Follow these steps in this order. Project ref:
`klwezcjmlrdwvvzisdtd`.

## 0. Generate two secrets (keep both in a password manager)

```bash
CRON_SECRET=$(openssl rand -hex 32)                 # shared by pg_cron and the functions
OCTOPUS_CREDENTIALS_KEY=$(openssl rand -base64 32)  # AES-256 key for Octopus API keys
```

If you lose `OCTOPUS_CREDENTIALS_KEY`, every stored Octopus key becomes
unreadable and users have to enter theirs again. Don't rotate it casually:
rotating needs a re-encryption step, which this PR does not include.

## 1. Set the edge function secrets

```bash
supabase secrets set --project-ref klwezcjmlrdwvvzisdtd \
  CRON_SECRET="$CRON_SECRET" OCTOPUS_CREDENTIALS_KEY="$OCTOPUS_CREDENTIALS_KEY"
```
(Or use Dashboard → Edge Functions → Secrets, or the Lovable Cloud secrets UI if
Lovable manages the project.)

## 2. Store the cron secret in Vault (SQL editor)

```sql
select vault.create_secret('<CRON_SECRET value>', 'cron_secret');
-- to rotate later:
-- select vault.update_secret((select id from vault.secrets where name = 'cron_secret'), '<new value>');
```

## 3. Apply the migration

Apply `supabase/migrations/20261003120000_security_hardening.sql` (`supabase db push`,
or let Lovable apply it after merge). Old function code keeps working with
the new schema, so a short gap before step 4 is fine. The reverse order is
not: new function code needs the new columns.

## 4. Deploy the functions

```bash
supabase functions deploy octopus-energy daily-forecast weekly-digest monthly-report check-carbon-intensity \
  --project-ref klwezcjmlrdwvvzisdtd
```

## 5. Encrypt existing plaintext Octopus keys (one-off backfill)

```bash
curl -sS -X POST \
  "https://klwezcjmlrdwvvzisdtd.supabase.co/functions/v1/octopus-energy?action=encrypt-legacy-credentials" \
  -H "Authorization: Bearer <anon/publishable key>" \
  -H "x-cron-secret: $CRON_SECRET"
# expect: {"success":true,"encrypted":N,"failed":0,"remaining_plaintext":0}
```
Any row the backfill misses is still encrypted lazily the next time it is used.

## 6. Verify (SQL editor)

See "Verification SQL" below.

## 7. After `remaining_plaintext = 0`, forbid plaintext from now on

```sql
alter table public.octopus_credentials
  add constraint octopus_credentials_no_plaintext check (api_key is null);
```
Dropping the `api_key` column needs a small follow-up code change, because the
function still writes `api_key: null` and reads it for the lazy-migration path.

## 8. Other cron jobs

If you created any cron job outside the migrations that calls
`octopus-energy?action=sync-all-users` or `calculate-all-footprints`, add the header:
`'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')`.
Those calls now return 401 without it.

## 9. Ship new app builds

The localStorage cleanup only runs in the new client. Publish the web app
and ship new iOS/Android builds (`npm run build:mobile`).

## Verification SQL

```sql
-- Policies on the affected tables (expect: no ALL/INSERT/UPDATE/DELETE policy for public/anon/authenticated)
select tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('app_config','geocoding_cache','octopus_credentials','rate_limits','scheduled_notification_log')
order by tablename, policyname;

-- Table-level privileges for client roles (expect 0 rows)
select table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee in ('anon','authenticated','PUBLIC')
  and table_name in ('app_config','geocoding_cache','octopus_credentials','rate_limits','scheduled_notification_log')
order by 1,2,3;

-- Column privileges on octopus_credentials (expect only authenticated SELECT on
-- user_id, account_number, api_key_hint, created_at, updated_at)
select grantee, column_name, privilege_type
from information_schema.column_privileges
where table_schema = 'public' and table_name = 'octopus_credentials'
  and grantee in ('anon','authenticated')
order by 1,2,3;

-- Function execute rights (expect fn_check_rate_limit: anon=f, authenticated=f, service_role=t)
select p.proname,
       has_function_privilege('anon', p.oid, 'execute')          as anon,
       has_function_privilege('authenticated', p.oid, 'execute') as authenticated,
       has_function_privilege('service_role', p.oid, 'execute')  as service_role
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname in ('fn_check_rate_limit','get_my_credentials_status');

-- Simulated attacks: each must fail with "permission denied" (rolled back either way)
begin; set local role anon;          update public.app_config set value = 'x' where key = 'supabase_url'; rollback;
begin; set local role anon;          select public.fn_check_rate_limit('x:save-credentials', 0, 60000, 300000); rollback;
begin; set local role authenticated; select api_key, api_key_encrypted from public.octopus_credentials limit 1; rollback;
begin; set local role authenticated; insert into public.octopus_credentials (user_id, api_key, account_number) values (gen_random_uuid(), 'x', 'y'); rollback;

-- app_config wasn't tampered with before the fix (expect only supabase_url = https://klwezcjmlrdwvvzisdtd.supabase.co)
select * from public.app_config;

-- Encryption progress (expect plaintext = 0 after step 5)
select count(*) filter (where api_key is not null)           as plaintext,
       count(*) filter (where api_key_encrypted is not null) as encrypted
from public.octopus_credentials;

-- Cron jobs send the secret, and the secret exists
select jobname, schedule, command like '%x-cron-secret%' as sends_secret from cron.job order by jobname;
select exists (select 1 from vault.decrypted_secrets where name = 'cron_secret') as cron_secret_present;

-- After the next run: recent cron HTTP results (expect 200s, not 401/500)
select id, status_code, left(content::text, 120) as body, created
from net._http_response order by created desc limit 10;

-- Idempotency log is filling
select job_name, period_key, count(*) from public.scheduled_notification_log
group by 1,2 order by max(sent_at) desc limit 10;
```

## Local policy tests (no Supabase project involved)

`supabase/tests/policies/run.sh` applies every migration to a throwaway local
Postgres with a small shim for the Supabase roles and schemas, then runs
`policy_tests.sql` (31 assertions).
