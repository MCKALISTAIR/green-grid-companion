-- Fix overly permissive push_subscriptions policies
-- Remove client-side INSERT, UPDATE, DELETE policies that only validate device_token length
-- All push_subscriptions operations should go through edge functions with service_role

-- Drop the permissive INSERT policy
DROP POLICY IF EXISTS "Device can register" ON public.push_subscriptions;

-- Drop the permissive UPDATE policy
DROP POLICY IF EXISTS "Device can update own subscription" ON public.push_subscriptions;

-- Drop the permissive DELETE policy
DROP POLICY IF EXISTS "Device can delete own subscription" ON public.push_subscriptions;

-- The following policies remain:
-- 1. "Service role has full access to push_subscriptions" - allows edge functions to manage all subscriptions
-- 2. "Device can read own subscription by token" - USING (false) prevents direct SELECT

-- Note: All push_subscriptions operations MUST now go through edge functions that:
-- 1. Validate device ownership through APNs/FCM token verification
-- 2. Use service_role credentials for database operations