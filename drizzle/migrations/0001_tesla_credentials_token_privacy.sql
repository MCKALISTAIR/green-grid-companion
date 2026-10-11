-- tesla_credentials: stop signed-in users reading their own Tesla OAuth tokens
-- from the browser (deferred item from PR #36 / 20261010170000_anon_access_tidy.sql).
--
-- Who needs what:
--   - tesla-energy edge function reads/writes tokens with the service role
--     (RLS and these grants do not restrict it).
--   - tesla-energy "unlink" deletes the caller's row with the user-scoped client.
--   - public.has_tesla_linked() is SECURITY INVOKER and reads user_id +
--     token_expires_at as the caller.
-- So authenticated keeps SELECT on non-secret columns only (row-filtered by the
-- existing "Users can view own tesla credentials" policy) plus DELETE of own
-- row. INSERT/UPDATE from the client are removed: tokens are only ever written
-- by the edge function. access_token / refresh_token become unreadable to
-- anon and authenticated.
--
-- Tesla is parked (FEATURES.tesla = false), so no user-facing change.
-- Safe to re-run.

REVOKE ALL ON public.tesla_credentials FROM PUBLIC, anon, authenticated;

GRANT SELECT (id, user_id, token_expires_at, created_at, updated_at)
  ON public.tesla_credentials TO authenticated;
GRANT DELETE ON public.tesla_credentials TO authenticated;
GRANT ALL ON public.tesla_credentials TO service_role;

-- Client-side token inserts are no longer allowed (edge function only).
DROP POLICY IF EXISTS "Users can insert own tesla credentials" ON public.tesla_credentials;

-- Re-create the owner policies scoped to authenticated, using the cached auth.uid() form.
DROP POLICY IF EXISTS "Users can view own tesla credentials" ON public.tesla_credentials;
CREATE POLICY "Users can view own tesla credentials" ON public.tesla_credentials
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own tesla credentials" ON public.tesla_credentials;
CREATE POLICY "Users can delete own tesla credentials" ON public.tesla_credentials
  FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);