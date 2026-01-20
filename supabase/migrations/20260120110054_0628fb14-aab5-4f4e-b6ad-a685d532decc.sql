-- Enable RLS on new tables (required for security)
ALTER TABLE public.octopus_consumption ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.octopus_meters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carbon_footprint ENABLE ROW LEVEL SECURITY;

-- Since this app doesn't have user auth and data comes from edge functions with API keys,
-- we allow public read access and only edge functions (service role) can write
CREATE POLICY "Allow public read access to consumption" 
ON public.octopus_consumption FOR SELECT USING (true);

CREATE POLICY "Allow public read access to footprint" 
ON public.carbon_footprint FOR SELECT USING (true);

CREATE POLICY "Allow public read access to meters" 
ON public.octopus_meters FOR SELECT USING (true);