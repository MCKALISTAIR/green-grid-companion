#!/usr/bin/env bash
# Apply every migration to a throwaway local Postgres (with a minimal shim of
# Supabase roles/schemas: anon, authenticated, service_role, auth.uid(), cron,
# net, vault) and run the privilege/RLS assertions in policy_tests.sql, then
# re-apply 20261010170000_anon_access_tidy.sql to check it is idempotent and
# that it skips the no-plaintext constraint while plaintext keys remain.
#
# This does NOT touch any Supabase project. Requires a local Postgres you can
# reach as superuser via `psql` (e.g. `sudo -u postgres`), e.g.:
#   PSQL="sudo -u postgres psql" CREATEDB="sudo -u postgres createdb" \
#   DROPDB="sudo -u postgres dropdb" supabase/tests/policies/run.sh
#
# With the Supabase CLI + Docker you can instead run `supabase start` /
# `supabase db reset` and execute policy_tests.sql against the local stack
# (skip shim.sql there).
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$HERE/../../.." && pwd)"
PSQL=${PSQL:-psql}; CREATEDB=${CREATEDB:-createdb}; DROPDB=${DROPDB:-dropdb}
DB=${DB:-gridsense_policy_test}
TMP=$(mktemp)
trap 'rm -f "$TMP"' EXIT

$DROPDB --if-exists "$DB" >/dev/null 2>&1 || true
$CREATEDB "$DB"
$PSQL -q -v ON_ERROR_STOP=1 -d "$DB" -f - < "$HERE/shim.sql" >/dev/null 2>&1
if [[ "${NO_VAULT:-}" == "1" ]]; then
  # Simulate a project without Vault to exercise the private-table fallback
  echo "DROP SCHEMA vault CASCADE;" | $PSQL -q -v ON_ERROR_STOP=1 -d "$DB" -f - >/dev/null 2>&1
  echo "(variant: no Vault)"
fi
for f in $(ls "$REPO"/supabase/migrations/*.sql | sort); do
  # pg_cron / pg_net are stubbed by shim.sql
  # Optional hook run just before a migration, e.g. to simulate pre-existing tampering
  hook="$HERE/pre_$(basename "$f")"
  if [[ -f "$hook" ]]; then $PSQL -q -v ON_ERROR_STOP=1 -d "$DB" -f - < "$hook" >/dev/null; fi
  sed -E 's/^\s*CREATE EXTENSION IF NOT EXISTS (pg_cron|pg_net)[^;]*;//I' "$f" > "$TMP"
  if ! out=$($PSQL -q -v ON_ERROR_STOP=1 -d "$DB" -f - < "$TMP" 2>&1); then
    echo "FAILED applying $(basename "$f")"; echo "$out"; exit 1
  fi
done
echo "Applied $(ls "$REPO"/supabase/migrations/*.sql | wc -l) migrations"
if ! out=$($PSQL -q -v ON_ERROR_STOP=1 -d "$DB" -At -F ' | ' -f - < "$HERE/policy_tests.sql" 2>&1); then
  echo "policy_tests.sql errored:"; echo "$out"; exit 1
fi
echo "$out" | grep -E '^(PASS|FAIL) ' || true
summary=$(echo "$out" | tail -n 1)
echo "passed | failed: $summary"
[[ "$summary" =~ \|\ 0$ ]] || exit 1

# Tesla storage retirement: the drop migration is safe to reapply and preserves
# unrelated account and Octopus fixtures in this throwaway database.
# Local-only; never run this harness against a live Supabase project.
TESLA_REMOVAL="$HERE/tesla_removal_tests.sql"
if [[ -f "$TESLA_REMOVAL" ]]; then
  if ! out=$($PSQL -q -v ON_ERROR_STOP=1 -d "$DB" -At -F ' | ' -f "$TESLA_REMOVAL" 2>&1); then
    echo "tesla_removal_tests.sql errored:"; echo "$out"; exit 1
  fi
  echo "$out" | grep -E '^(PASS|FAIL) ' || true
  summary=$(echo "$out" | tail -n 1)
  echo "Tesla removal passed | failed: $summary"
  [[ "$summary" =~ \|\ 0$ ]] || exit 1
fi

# Optional schema-order check: TEST_TESLAS_ABSENT=1 simulates a future cleanup
# change landing after Tesla retirement, then stops before historical Tesla
# replays. It must not alter or incompletely replay the combined branch's tests.
if [[ "${TEST_TESLAS_ABSENT:-}" == "1" ]]; then
  TESLA_COMPAT="$HERE/anonymous_cleanup_without_tesla_tests.sql"
  if ! out=$($PSQL -q -v ON_ERROR_STOP=1 -d "$DB" -At -F ' | ' -f - < "$TESLA_COMPAT" 2>&1); then
    echo "anonymous_cleanup_without_tesla_tests.sql errored:"; echo "$out"; exit 1
  fi
  echo "$out" | grep -E '^(PASS|FAIL) ' || true
  summary=$(echo "$out" | tail -n 1)
  echo "cleanup without Tesla passed | failed: $summary"
  [[ "$summary" =~ \|\ 0$ ]] || exit 1
  # This simulated schema ordering intentionally stops before legacy Tesla SQL.
  exit 0
fi

ANONYMOUS_CLEANUP="$HERE/anonymous_cleanup_tests.sql"
# The complete legacy Tesla fixture applies only before the retirement migration.
# Check both files so an unrelated pre-existing drop migration cannot accidentally
# bypass the entire anonymous-cleanup suite.
if [[ -f "$ANONYMOUS_CLEANUP" && ! -f "$REPO/supabase/migrations/20261106150000_remove_tesla_tables.sql" ]]; then
  if ! out=$($PSQL -q -v ON_ERROR_STOP=1 -d "$DB" -At -F ' | ' -f "$ANONYMOUS_CLEANUP" 2>&1); then
    echo "anonymous_cleanup_tests.sql errored:"; echo "$out"; exit 1
  fi
  echo "$out" | grep -E '^(PASS|FAIL) ' || true
  summary=$(echo "$out" | tail -n 1)
  echo "anonymous cleanup passed | failed: $summary"
  [[ "$summary" =~ \|\ 0$ ]] || exit 1
fi

# Re-run checks for migrations that must be safe to apply twice.
ANON_TIDY="$REPO/supabase/migrations/20261010170000_anon_access_tidy.sql"
if [[ -f "$ANON_TIDY" ]]; then
  if ! out=$($PSQL -q -v ON_ERROR_STOP=1 -d "$DB" -f - < <("$HERE/filter_legacy_anon_tidy.py" "$ANON_TIDY") 2>&1); then
    echo "FAIL re-applying $(basename "$ANON_TIDY")"; echo "$out"; exit 1
  fi
  echo "PASS | anon_access_tidy is safe to re-apply"
  # If a plaintext key were still waiting for the backfill, the migration
  # must still apply and simply skip the no-plaintext constraint.
  if ! out=$($PSQL -q -v ON_ERROR_STOP=1 -d "$DB" -f - 2>&1 <<'SQL'
ALTER TABLE public.octopus_credentials DROP CONSTRAINT octopus_credentials_no_plaintext;
UPDATE public.octopus_credentials SET api_key = 'sk_legacy' WHERE user_id = '22222222-2222-2222-2222-222222222222';
SQL
  ); then echo "FAIL preparing plaintext variant"; echo "$out"; exit 1; fi
  if ! out=$($PSQL -v ON_ERROR_STOP=1 -d "$DB" -f - < <("$HERE/filter_legacy_anon_tidy.py" "$ANON_TIDY") 2>&1); then
    echo "FAIL anon_access_tidy with a plaintext key left"; echo "$out"; exit 1
  fi
  has=$($PSQL -At -d "$DB" -c "SELECT count(*) FROM pg_constraint WHERE conname = 'octopus_credentials_no_plaintext'")
  if [[ "$has" == "0" ]] && grep -q "Skipping octopus_credentials_no_plaintext" <<<"$out"; then
    echo "PASS | anon_access_tidy skips the no-plaintext constraint while plaintext keys remain"
  else
    echo "FAIL | expected the no-plaintext constraint to be skipped (found $has)"; exit 1
  fi
fi

if [[ -f "$HERE/user_data_cleanup_tests.sql" ]]; then
  if ! out=$($PSQL -q -v ON_ERROR_STOP=1 -d "$DB" -At -F ' | ' -f - < "$HERE/user_data_cleanup_tests.sql" 2>&1); then
    echo "user_data_cleanup_tests.sql errored:"; echo "$out"; exit 1
  fi
  echo "$out" | grep -E '^(PASS|FAIL) ' || true
  summary=$(echo "$out" | tail -n 1)
  echo "user data cleanup passed | failed: $summary"
  [[ "$summary" =~ \|\ 0$ ]] || exit 1
fi

# 20261011100000_user_data_cleanup.sql: safe to re-apply, and it removes readings
# orphaned before the trigger existed (fixture meter M-2 has no meter row).
CLEANUP="$REPO/supabase/migrations/20261011100000_user_data_cleanup.sql"
if [[ -f "$CLEANUP" ]]; then
  if ! out=$($PSQL -q -v ON_ERROR_STOP=1 -d "$DB" -f - < "$CLEANUP" 2>&1); then
    echo "FAIL re-applying $(basename "$CLEANUP")"; echo "$out"; exit 1
  fi
  left=$($PSQL -At -d "$DB" -c "SELECT (SELECT count(*) FROM public.octopus_consumption WHERE mpan = 'M-2') + (SELECT count(*) FROM public.carbon_footprint WHERE mpan = 'M-2')")
  kept=$($PSQL -At -d "$DB" -c "SELECT count(*) FROM public.octopus_consumption WHERE mpan = 'M-1'")
  jobs=$($PSQL -At -d "$DB" -c "SELECT count(*) FROM cron.job WHERE jobname = 'cleanup-push-subscriptions-daily'")
  if [[ "$left" == "0" && "$kept" == "1" && "$jobs" == "1" ]]; then
    echo "PASS | user_data_cleanup re-applies, removes orphaned readings, keeps owned ones, one cron job"
  else
    echo "FAIL | user_data_cleanup re-apply (orphans left: $left, owned kept: $kept, jobs: $jobs)"; exit 1
  fi
fi
