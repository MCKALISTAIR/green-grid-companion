#!/usr/bin/env bash
# Apply every migration to a throwaway local Postgres (with a minimal shim of
# Supabase roles/schemas: anon, authenticated, service_role, auth.uid(), cron,
# net, vault) and run the privilege/RLS assertions in policy_tests.sql.
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
for f in $(ls "$REPO"/supabase/migrations/*.sql | sort); do
  # pg_cron / pg_net are stubbed by shim.sql
  sed -E 's/^\s*CREATE EXTENSION IF NOT EXISTS (pg_cron|pg_net)[^;]*;//I' "$f" > "$TMP"
  if ! out=$($PSQL -q -v ON_ERROR_STOP=1 -d "$DB" -f - < "$TMP" 2>&1); then
    echo "FAILED applying $(basename "$f")"; echo "$out"; exit 1
  fi
done
echo "Applied $(ls "$REPO"/supabase/migrations/*.sql | wc -l) migrations"
out=$($PSQL -q -v ON_ERROR_STOP=1 -d "$DB" -At -F ' | ' -f - < "$HERE/policy_tests.sql" 2>&1)
echo "$out" | grep -E '^(PASS|FAIL) ' || true
summary=$(echo "$out" | tail -n 1)
echo "passed | failed: $summary"
[[ "$summary" =~ \|\ 0$ ]]
