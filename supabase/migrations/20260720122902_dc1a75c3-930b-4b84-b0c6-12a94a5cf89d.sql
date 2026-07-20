
-- 1. Drop all forgeable JWT-claim service_role policies
DROP POLICY IF EXISTS "Service role has full access to credentials" ON public.octopus_credentials;
DROP POLICY IF EXISTS "Only service role can read credentials" ON public.octopus_credentials;
DROP POLICY IF EXISTS "Service role has full access to tesla_credentials" ON public.tesla_credentials;
DROP POLICY IF EXISTS "Service role has full access to consumption" ON public.octopus_consumption;
DROP POLICY IF EXISTS "Service role has full access to footprint" ON public.carbon_footprint;
DROP POLICY IF EXISTS "Service role has full access to meters" ON public.octopus_meters;
DROP POLICY IF EXISTS "Service role has full access to tesla_vehicles" ON public.tesla_vehicles;
DROP POLICY IF EXISTS "Service role has full access to tesla_energy_sites" ON public.tesla_energy_sites;
DROP POLICY IF EXISTS "Service role has full access to tesla_charging_sessions" ON public.tesla_charging_sessions;
DROP POLICY IF EXISTS "Service role has full access to tesla_energy_data" ON public.tesla_energy_data;
DROP POLICY IF EXISTS "Service role has full access to preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Service role has full access to dispatches" ON public.octopus_intelligent_dispatches;
DROP POLICY IF EXISTS "Service role has full access to push_subscriptions" ON public.push_subscriptions;

-- 2. Octopus credentials: allow user to read own row
CREATE POLICY "Users can view own credentials"
  ON public.octopus_credentials FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- 3. Tesla credentials: allow user to read own row
CREATE POLICY "Users can view own tesla credentials"
  ON public.tesla_credentials FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- 4. push_subscriptions: replace USING(false) with proper user-scoped CRUD
DROP POLICY IF EXISTS "Device can read own subscription by token" ON public.push_subscriptions;

CREATE POLICY "Users can view own push subscriptions"
  ON public.push_subscriptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own push subscriptions"
  ON public.push_subscriptions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own push subscriptions"
  ON public.push_subscriptions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own push subscriptions"
  ON public.push_subscriptions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 5. Convert SECURITY DEFINER helper functions to SECURITY INVOKER
CREATE OR REPLACE FUNCTION public.has_tesla_linked()
 RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.tesla_credentials
    WHERE user_id = auth.uid() AND token_expires_at > now())
$function$;

CREATE OR REPLACE FUNCTION public.get_my_credentials_status()
 RETURNS TABLE(user_id uuid, account_number text, has_api_key boolean, created_at timestamptz, updated_at timestamptz)
 LANGUAGE sql STABLE SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
  SELECT oc.user_id, oc.account_number, true AS has_api_key, oc.created_at, oc.updated_at
  FROM public.octopus_credentials oc WHERE oc.user_id = auth.uid()
$function$;

CREATE OR REPLACE FUNCTION public.user_owns_mpan(check_mpan text)
 RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.octopus_meters
    WHERE mpan = check_mpan AND user_id = auth.uid())
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$function$;

-- 6. Realtime authorization: scope channels to the caller's own user_id.
-- Topic patterns used by the app: 'settings:<uuid>' and 'user_preferences:<uuid>'
CREATE POLICY "Users can only access their own realtime topics"
  ON realtime.messages FOR SELECT TO authenticated
  USING (split_part(realtime.topic(), ':', 2) = (SELECT auth.uid()::text));
