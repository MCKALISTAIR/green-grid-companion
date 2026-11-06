-- Delete anonymous accounts after 180 days with no meaningful user activity.
-- The privacy policy promises no minimum retention, and the authentication doc
-- suggests 180 days for orphaned data. Auth sessions/refreshes, writes of
-- preferences/credentials and non-anonymous identities (Google/Apple linking)
-- protect an account. Meter sync timestamps do not: cron is not user activity.
--
-- Applying this migration schedules nothing and deletes nothing. RPC deletion
-- additionally requires an explicit candidate allowlist. The companion edge
-- function requires its own execution flag and ANONYMOUS_CLEANUP_ENABLED=true.
-- Both functions are service-role-only; the default invocation is a dry run.
-- Each batch is one transaction. Errors roll back the entire batch. Candidate
-- activity/is_anonymous are rechecked under a user lock just before deletion.
BEGIN;

CREATE OR REPLACE FUNCTION public.fn_anonymous_account_activity(
  p_user_id uuid,
  p_created_at timestamptz
) RETURNS timestamptz
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT MAX(activity_at) FROM (VALUES
    ((SELECT u.last_sign_in_at FROM auth.users u WHERE u.id = p_user_id)),
    ((SELECT u.updated_at FROM auth.users u WHERE u.id = p_user_id)),
    ((SELECT MAX(COALESCE(s.refreshed_at, s.created_at)) FROM auth.sessions s WHERE s.user_id = p_user_id)),
    ((SELECT MAX(i.last_sign_in_at) FROM auth.identities i WHERE i.user_id = p_user_id)),
    ((SELECT MAX(i.updated_at) FROM auth.identities i WHERE i.user_id = p_user_id AND i.provider <> 'anonymous')),
    ((SELECT GREATEST(MAX(p.updated_at),MAX(p.created_at)) FROM public.user_preferences p WHERE p.user_id = p_user_id)),
    ((SELECT GREATEST(MAX(c.updated_at),MAX(c.created_at)) FROM public.octopus_credentials c WHERE c.user_id = p_user_id)),
    (p_created_at)
  ) AS activity(activity_at)
$$;

CREATE OR REPLACE FUNCTION public.fn_cleanup_anonymous_accounts(
  p_dry_run boolean DEFAULT true,
  p_inactive_before timestamptz DEFAULT (now() - interval '180 days'),
  p_limit integer DEFAULT 100,
  p_before_id uuid DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
  p_candidate_ids uuid[] DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  candidate record;
  ids uuid[] := '{}'::uuid[];
  has_teslas boolean;
  result_count integer;
  last_activity timestamptz;
  v_cutoff timestamptz;
BEGIN
  IF p_dry_run IS NULL THEN
    RAISE EXCEPTION 'p_dry_run must be true or false';
  END IF;
  -- A backend parameter is deliberately available for dry-run pagination and
  -- compatibility, but cannot shorten the fixed retention period. A stricter
  -- value is accepted; a newer one is treated as this same fixed floor.
  v_cutoff := LEAST(COALESCE(p_inactive_before, now() - interval '180 days'), now() - interval '180 days');
  IF p_before_id IS NULL OR p_limit IS NULL OR p_limit < 1 OR p_limit > 200 THEN
    RAISE EXCEPTION 'p_limit must be between 1 and 200';
  END IF;
  IF NOT p_dry_run AND (p_candidate_ids IS NULL OR array_ndims(p_candidate_ids) <> 1
    OR cardinality(p_candidate_ids) < 1 OR cardinality(p_candidate_ids) > 200) THEN
    RAISE EXCEPTION 'Deletion requires a one-dimensional array of 1 to 200 approved UUIDs';
    END IF;
  IF NOT p_dry_run THEN
    PERFORM pg_advisory_xact_lock(753891257864);
  END IF;
  has_teslas := to_regclass('public.tesla_credentials') IS NOT NULL;

  FOR candidate IN
    SELECT u.id AS user_id FROM auth.users u
    WHERE u.is_anonymous = true
      AND public.fn_anonymous_account_activity(u.id, u.created_at) < v_cutoff
      AND ((p_dry_run AND u.id > p_before_id)
        OR (NOT p_dry_run AND u.id = ANY(p_candidate_ids)))
    ORDER BY u.id
    LIMIT p_limit
    FOR UPDATE OF u
  LOOP
    IF p_dry_run THEN
      ids := ids || candidate.user_id;
      CONTINUE;
    END IF;
    last_activity := public.fn_anonymous_account_activity(candidate.user_id, (SELECT u.created_at FROM auth.users u WHERE u.id = candidate.user_id));
    -- The outer cursor is `user_id`, not `id`: generic PL/pgSQL record names
    -- must not shadow `auth.users.id` inside SQL expressions. The dry-run path
    -- returns above before any write, guaranteeing that previews cannot delete.
    -- Regression coverage calls it repeatedly and verifies every row remains.
    IF NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = candidate.user_id AND u.is_anonymous = true)
      OR last_activity >= v_cutoff THEN
      CONTINUE;
    END IF;
    DELETE FROM public.octopus_consumption
      WHERE mpan IN (SELECT m.mpan FROM public.octopus_meters m WHERE m.user_id = candidate.user_id);
    DELETE FROM public.carbon_footprint
      WHERE mpan IN (SELECT m.mpan FROM public.octopus_meters m WHERE m.user_id = candidate.user_id);
    DELETE FROM public.octopus_intelligent_dispatches WHERE user_id = candidate.user_id;
    DELETE FROM public.octopus_meters WHERE user_id = candidate.user_id;
    DELETE FROM public.octopus_credentials WHERE user_id = candidate.user_id;
    DELETE FROM public.push_subscriptions WHERE user_id = candidate.user_id;
    DELETE FROM public.user_preferences WHERE user_id = candidate.user_id;
    IF has_teslas THEN EXECUTE 'DELETE FROM public.tesla_charging_sessions WHERE user_id = $1' USING candidate.user_id; END IF;
    IF has_teslas THEN EXECUTE 'DELETE FROM public.tesla_energy_data WHERE user_id = $1' USING candidate.user_id; END IF;
    IF has_teslas THEN EXECUTE 'DELETE FROM public.tesla_energy_sites WHERE user_id = $1' USING candidate.user_id; END IF;
    IF has_teslas THEN EXECUTE 'DELETE FROM public.tesla_vehicles WHERE user_id = $1' USING candidate.user_id; END IF;
    IF has_teslas THEN EXECUTE 'DELETE FROM public.tesla_credentials WHERE user_id = $1' USING candidate.user_id; END IF;
    DELETE FROM auth.identities WHERE user_id = candidate.user_id;
    DELETE FROM auth.sessions WHERE user_id = candidate.user_id;
    DELETE FROM auth.users WHERE id = candidate.user_id AND is_anonymous = true;
    IF NOT FOUND THEN RAISE EXCEPTION 'User changed or disappeared before deletion'; END IF;
    ids := ids || candidate.user_id;
  END LOOP;

  result_count := cardinality(ids);
  RETURN jsonb_build_object(
    'dry_run', p_dry_run,
    'inactive_before', v_cutoff,
    'limit', p_limit,
    'before_id', p_before_id,
    'candidate_ids', CASE WHEN p_dry_run THEN to_jsonb(ids) ELSE '[]'::jsonb END,
    'deleted_ids', CASE WHEN p_dry_run THEN '[]'::jsonb ELSE to_jsonb(ids) END,
    'candidate_count', CASE WHEN p_dry_run THEN result_count ELSE 0 END,
    'deleted_count', CASE WHEN p_dry_run THEN 0 ELSE result_count END,
    'next_before_id', CASE WHEN p_dry_run AND result_count > 0 THEN ids[result_count] ELSE NULL END,
    'has_more', p_dry_run AND EXISTS (
      SELECT 1 FROM auth.users u WHERE u.is_anonymous = true
        AND public.fn_anonymous_account_activity(u.id, u.created_at) < v_cutoff
        AND u.id > COALESCE(ids[result_count], p_before_id)
    )
  );
END;
$$;

-- Supabase functions grant EXECUTE to PUBLIC by default. Revoke it explicitly.
REVOKE ALL ON FUNCTION public.fn_anonymous_account_activity(uuid, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_cleanup_anonymous_accounts(boolean, timestamptz, integer, uuid, uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_anonymous_account_activity(uuid, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_cleanup_anonymous_accounts(boolean, timestamptz, integer, uuid, uuid[]) TO service_role;
COMMIT;
