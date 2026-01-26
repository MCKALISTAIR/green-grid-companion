-- Enable RLS on the credentials status view by recreating with proper security
-- Views with security_invoker inherit the RLS of the underlying table

-- The view already uses security_invoker=on which means RLS on octopus_credentials applies
-- But we need authenticated users to see their OWN status via the view
-- Since base table now only allows service_role SELECT, we need a different approach

-- Drop the view and recreate with a security definer function approach
DROP VIEW IF EXISTS public.octopus_credentials_status;

-- Create a security definer function that returns credentials status for current user
CREATE OR REPLACE FUNCTION public.get_my_credentials_status()
RETURNS TABLE (
  user_id uuid,
  account_number text,
  has_api_key boolean,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    oc.user_id,
    oc.account_number,
    true AS has_api_key,
    oc.created_at,
    oc.updated_at
  FROM public.octopus_credentials oc
  WHERE oc.user_id = auth.uid()
$$;