-- Lovable's 2026-10-04 rate-limit migration re-creates a policy that
-- 20260212120000_fix_rate_limiting already made (no IF NOT EXISTS). On the
-- live project it applied cleanly because rate_limits was missing there at
-- the time (Lovable confirmed this during the 4 Oct rollout); on a
-- from-scratch replay it fails. Drop the policy first so the replay matches
-- the live state. Test-only; never run against Supabase.
DROP POLICY IF EXISTS "Service role has full access" ON public.rate_limits;
