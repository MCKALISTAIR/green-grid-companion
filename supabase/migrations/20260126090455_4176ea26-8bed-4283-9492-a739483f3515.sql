-- Security: Create a view that hides sensitive API keys from direct client access
-- Users should not be able to SELECT their API key - it should only be used server-side

-- Drop existing SELECT policy that exposes API keys
DROP POLICY IF EXISTS "Users can view own credentials" ON public.octopus_credentials;

-- Create a safe view that only exposes whether credentials exist, not the actual keys
CREATE VIEW public.octopus_credentials_status
WITH (security_invoker = on) AS
SELECT 
  user_id,
  account_number,
  created_at,
  updated_at,
  true AS has_api_key
FROM public.octopus_credentials;

-- Create a restrictive policy that prevents direct SELECT on credentials table for regular users
-- Only service role can read the actual API keys
CREATE POLICY "Only service role can read credentials"
ON public.octopus_credentials FOR SELECT
USING (auth.jwt() ->> 'role' = 'service_role');

-- Grant access to the safe view
GRANT SELECT ON public.octopus_credentials_status TO authenticated;

-- For push_subscriptions: We need to restrict SELECT to only return the user's own record
-- Since there's no user auth, we need to use a stored procedure approach
-- First, let's update the policy to be less permissive

DROP POLICY IF EXISTS "Device can read own subscription" ON public.push_subscriptions;