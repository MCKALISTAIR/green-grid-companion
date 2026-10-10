-- Anonymous-access tidy-up (Oct 2026)
--
-- Follow-up to 20261003120000_security_hardening. Lovable's scan reported 15
-- "Anonymous Access Policies" findings (Supabase lint 0012, one per table that
-- has policies for roles anonymous sign-in users can use). GridSense signs
-- every visitor in anonymously first (src/lib/auth-utils.ts), so anonymous
-- users owning their own rows is intended and those findings stay. This
-- migration fixes the one real hole behind them and tightens the rest:
--
--  1. octopus_meters: clients could INSERT/UPDATE meter rows with any MPAN not
--     already claimed. user_owns_mpan() trusts that table, so a user could
--     claim an MPAN whose owner had disconnected (disconnect deletes the meter
--     row but keeps consumption history) and read its half-hourly
--     octopus_consumption and carbon_footprint rows. Meters are only ever
--     written by the octopus-energy edge function (service role), so clients
--     lose all write access. Read-own stays (user_owns_mpan needs it).
--  2. Policies that were TO public (which includes the signed-out "anon" role)
--     are recreated TO authenticated, using (select auth.uid()) so the check is
--     evaluated once per query. Duplicate octopus_meters policies are removed.
--  3. The signed-out "anon" role loses table privileges on user-data tables
--     and EXECUTE on the helper functions. The app never queries these without
--     a session (anonymous or full). Clients keep only the privileges their
--     policies actually allow.
--  4. octopus_credentials: CHECK (api_key IS NULL) so a plaintext Octopus key
--     can never be stored again. Only added if no plaintext keys remain.
--
-- Not changed here (tracked separately): tesla_credentials (owner can still
-- read their Tesla tokens), weekly/monthly digest totals, half-hour forecasts.
--
-- Safe to re-run.

-- ---------------------------------------------------------------------------
-- 1 + 2. Policies
-- ---------------------------------------------------------------------------

-- octopus_meters: read-own only; all writes via the edge function
DROP POLICY IF EXISTS "Users can view own meters" ON public.octopus_meters;
DROP POLICY IF EXISTS "Users can view their own meters" ON public.octopus_meters;
DROP POLICY IF EXISTS "Users can insert own meters" ON public.octopus_meters;
DROP POLICY IF EXISTS "Users can insert their own meters" ON public.octopus_meters;
DROP POLICY IF EXISTS "Users can update own meters" ON public.octopus_meters;
DROP POLICY IF EXISTS "Users can update their own meters" ON public.octopus_meters;
DROP POLICY IF EXISTS "Users can delete own meters" ON public.octopus_meters;
DROP POLICY IF EXISTS "Users can delete their own meters" ON public.octopus_meters;
CREATE POLICY "Users can view own meters" ON public.octopus_meters
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);

-- Meter-linked data: read-only for the meter's owner
DROP POLICY IF EXISTS "Users can view own consumption via meter" ON public.octopus_consumption;
CREATE POLICY "Users can view own consumption via meter" ON public.octopus_consumption
  FOR SELECT TO authenticated USING (public.user_owns_mpan(mpan));

DROP POLICY IF EXISTS "Users can view own footprint via meter" ON public.carbon_footprint;
CREATE POLICY "Users can view own footprint via meter" ON public.carbon_footprint
  FOR SELECT TO authenticated USING (public.user_owns_mpan(mpan));

DROP POLICY IF EXISTS "Users can view own dispatches" ON public.octopus_intelligent_dispatches;
CREATE POLICY "Users can view own dispatches" ON public.octopus_intelligent_dispatches
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);

-- Tesla data tables (not tesla_credentials; see header)
DROP POLICY IF EXISTS "Users can view own charging sessions" ON public.tesla_charging_sessions;
CREATE POLICY "Users can view own charging sessions" ON public.tesla_charging_sessions
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view own energy data" ON public.tesla_energy_data;
CREATE POLICY "Users can view own energy data" ON public.tesla_energy_data
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view own energy sites" ON public.tesla_energy_sites;
DROP POLICY IF EXISTS "Users can delete own energy sites" ON public.tesla_energy_sites;
CREATE POLICY "Users can view own energy sites" ON public.tesla_energy_sites
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can delete own energy sites" ON public.tesla_energy_sites
  FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view own vehicles" ON public.tesla_vehicles;
DROP POLICY IF EXISTS "Users can delete own vehicles" ON public.tesla_vehicles;
CREATE POLICY "Users can view own vehicles" ON public.tesla_vehicles
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can delete own vehicles" ON public.tesla_vehicles
  FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

-- user_preferences: full CRUD on own row (useSettings / useSavedLocations upsert)
DROP POLICY IF EXISTS "Users can view own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can insert own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can update own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can delete own preferences" ON public.user_preferences;
CREATE POLICY "Users can view own preferences" ON public.user_preferences
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can insert own preferences" ON public.user_preferences
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can update own preferences" ON public.user_preferences
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can delete own preferences" ON public.user_preferences
  FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- 3. Table and function privileges
-- ---------------------------------------------------------------------------

-- Signed-out callers: nothing on user-data tables.
REVOKE ALL ON public.octopus_meters, public.octopus_consumption, public.carbon_footprint,
  public.octopus_intelligent_dispatches, public.tesla_charging_sessions,
  public.tesla_energy_data, public.tesla_energy_sites, public.tesla_vehicles,
  public.user_preferences, public.push_subscriptions
  FROM PUBLIC, anon;

-- Signed-in callers (including anonymous sign-ins): only what policies allow.
REVOKE ALL ON public.octopus_meters, public.octopus_consumption, public.carbon_footprint,
  public.octopus_intelligent_dispatches, public.tesla_charging_sessions,
  public.tesla_energy_data
  FROM authenticated;
GRANT SELECT ON public.octopus_meters, public.octopus_consumption, public.carbon_footprint,
  public.octopus_intelligent_dispatches, public.tesla_charging_sessions,
  public.tesla_energy_data
  TO authenticated;

REVOKE ALL ON public.tesla_energy_sites, public.tesla_vehicles FROM authenticated;
GRANT SELECT, DELETE ON public.tesla_energy_sites, public.tesla_vehicles TO authenticated;

REVOKE ALL ON public.user_preferences, public.push_subscriptions FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_preferences, public.push_subscriptions TO authenticated;

GRANT ALL ON public.octopus_meters, public.octopus_consumption, public.carbon_footprint,
  public.octopus_intelligent_dispatches, public.tesla_charging_sessions,
  public.tesla_energy_data, public.tesla_energy_sites, public.tesla_vehicles,
  public.user_preferences, public.push_subscriptions
  TO service_role;

-- Helper functions: signed-in callers and the server only.
REVOKE ALL ON FUNCTION public.user_owns_mpan(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_owns_mpan(text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.has_tesla_linked() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_tesla_linked() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4. No plaintext Octopus keys, ever (only if none are left)
-- ---------------------------------------------------------------------------
DO $$
DECLARE plaintext_left bigint;
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.octopus_credentials'::regclass
       AND conname = 'octopus_credentials_no_plaintext'
  ) THEN
    RETURN;
  END IF;

  SELECT count(*) INTO plaintext_left FROM public.octopus_credentials WHERE api_key IS NOT NULL;
  IF plaintext_left > 0 THEN
    RAISE NOTICE 'Skipping octopus_credentials_no_plaintext: % plaintext key(s) still to encrypt. Run the backfill, then re-apply this migration.', plaintext_left;
    RETURN;
  END IF;

  ALTER TABLE public.octopus_credentials
    ADD CONSTRAINT octopus_credentials_no_plaintext CHECK (api_key IS NULL);
END $$;
