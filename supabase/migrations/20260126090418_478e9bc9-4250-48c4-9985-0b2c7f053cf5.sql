-- Final security hardening: Add service role policies and restrict data modification

-- 1. Service role policies for octopus_consumption (edge functions need write access)
CREATE POLICY "Service role has full access to consumption"
ON public.octopus_consumption FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role')
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- 2. Service role policies for carbon_footprint (edge functions need write access)
CREATE POLICY "Service role has full access to footprint"
ON public.carbon_footprint FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role')
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- 3. Service role policies for octopus_meters (edge functions need to update last_sync_at)
CREATE POLICY "Service role has full access to meters"
ON public.octopus_meters FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role')
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- 4. Service role policies for octopus_credentials (edge functions need read access)
CREATE POLICY "Service role has full access to credentials"
ON public.octopus_credentials FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role')
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');