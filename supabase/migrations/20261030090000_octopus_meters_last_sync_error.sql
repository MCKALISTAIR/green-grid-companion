-- BH-127: remember when Octopus rejected a user's key (HTTP 401/403) so the app
-- can show "Octopus rejected your key, please relink" instead of failing quietly.
-- Written by the octopus sync (service role) and cleared on the next successful
-- sync or when the user saves a new key. Additive and nullable: no backfill.
ALTER TABLE public.octopus_meters
  ADD COLUMN IF NOT EXISTS last_sync_error text,
  ADD COLUMN IF NOT EXISTS last_sync_error_at timestamptz;

COMMENT ON COLUMN public.octopus_meters.last_sync_error IS
  'Last sync error code that needs the user to act (octopus_http_401 / octopus_http_403). NULL when the last sync was fine.';
COMMENT ON COLUMN public.octopus_meters.last_sync_error_at IS
  'When last_sync_error was recorded.';
