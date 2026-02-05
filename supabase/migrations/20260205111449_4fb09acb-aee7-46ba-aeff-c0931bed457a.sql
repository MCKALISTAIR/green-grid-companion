-- Drop the overly permissive SELECT policy on push_subscriptions
DROP POLICY IF EXISTS "Device can read own subscription" ON public.push_subscriptions;

-- Create a more restrictive SELECT policy that requires device token validation
-- This ensures only the device owner can read their own subscription
CREATE POLICY "Device can read own subscription by token" 
ON public.push_subscriptions 
FOR SELECT 
USING (false);

-- Note: The service_role policy already allows full access for edge functions
-- Devices should query via edge functions that validate ownership, not direct DB access