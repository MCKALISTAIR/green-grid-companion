-- Remove the retired Tesla integration's storage.
--
-- IRREVERSIBLE DATA LOSS: applying this migration permanently deletes every
-- row in these tables, including OAuth tokens, charging history and energy
-- data. Back up and export anything that must be retained before applying.
--
-- There are no remaining runtime references in this change. Historical
-- migrations intentionally remain unchanged because they describe how an old
-- schema was created, not code that should still call the tables today.
-- No cron schedule is added or changed here.

BEGIN;

DROP FUNCTION IF EXISTS public.has_tesla_linked();
DROP TABLE IF EXISTS
  public.tesla_charging_sessions,
  public.tesla_energy_data,
  public.tesla_energy_sites,
  public.tesla_vehicles,
  public.tesla_credentials;

COMMIT;
