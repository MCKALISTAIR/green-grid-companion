-- Tesla OAuth credentials storage
CREATE TABLE public.tesla_credentials (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL DEFAULT auth.uid(),
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    token_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT unique_tesla_user UNIQUE (user_id)
);

-- Tesla vehicles linked to user
CREATE TABLE public.tesla_vehicles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    vehicle_id TEXT NOT NULL,
    vin TEXT,
    display_name TEXT,
    battery_capacity_kwh NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT unique_tesla_vehicle UNIQUE (user_id, vehicle_id)
);

-- Tesla energy sites (Powerwall/Solar)
CREATE TABLE public.tesla_energy_sites (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    site_id TEXT NOT NULL,
    site_name TEXT,
    solar_capacity_kw NUMERIC,
    battery_capacity_kwh NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT unique_tesla_site UNIQUE (user_id, site_id)
);

-- Tesla charging sessions for carbon tracking
CREATE TABLE public.tesla_charging_sessions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    vehicle_id TEXT NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ended_at TIMESTAMP WITH TIME ZONE,
    energy_added_kwh NUMERIC NOT NULL DEFAULT 0,
    start_battery_pct INTEGER,
    end_battery_pct INTEGER,
    avg_intensity_gco2 INTEGER,
    carbon_used_g NUMERIC,
    carbon_saved_vs_avg_g NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tesla energy data (solar generation, battery, exports)
CREATE TABLE public.tesla_energy_data (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    site_id TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    solar_generation_kwh NUMERIC NOT NULL DEFAULT 0,
    battery_charge_kwh NUMERIC NOT NULL DEFAULT 0,
    battery_discharge_kwh NUMERIC NOT NULL DEFAULT 0,
    grid_import_kwh NUMERIC NOT NULL DEFAULT 0,
    grid_export_kwh NUMERIC NOT NULL DEFAULT 0,
    intensity_gco2_kwh INTEGER,
    carbon_offset_g NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT unique_energy_timestamp UNIQUE (site_id, timestamp)
);

-- Enable RLS on all tables
ALTER TABLE public.tesla_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tesla_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tesla_energy_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tesla_charging_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tesla_energy_data ENABLE ROW LEVEL SECURITY;

-- Tesla credentials policies (sensitive - service role only for reading tokens)
CREATE POLICY "Service role has full access to tesla_credentials"
ON public.tesla_credentials FOR ALL
USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text)
WITH CHECK ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

CREATE POLICY "Users can insert own tesla credentials"
ON public.tesla_credentials FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own tesla credentials"
ON public.tesla_credentials FOR DELETE
USING (auth.uid() = user_id);

-- Tesla vehicles policies
CREATE POLICY "Service role has full access to tesla_vehicles"
ON public.tesla_vehicles FOR ALL
USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text)
WITH CHECK ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

CREATE POLICY "Users can view own vehicles"
ON public.tesla_vehicles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own vehicles"
ON public.tesla_vehicles FOR DELETE
USING (auth.uid() = user_id);

-- Tesla energy sites policies
CREATE POLICY "Service role has full access to tesla_energy_sites"
ON public.tesla_energy_sites FOR ALL
USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text)
WITH CHECK ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

CREATE POLICY "Users can view own energy sites"
ON public.tesla_energy_sites FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own energy sites"
ON public.tesla_energy_sites FOR DELETE
USING (auth.uid() = user_id);

-- Tesla charging sessions policies
CREATE POLICY "Service role has full access to tesla_charging_sessions"
ON public.tesla_charging_sessions FOR ALL
USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text)
WITH CHECK ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

CREATE POLICY "Users can view own charging sessions"
ON public.tesla_charging_sessions FOR SELECT
USING (auth.uid() = user_id);

-- Tesla energy data policies
CREATE POLICY "Service role has full access to tesla_energy_data"
ON public.tesla_energy_data FOR ALL
USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text)
WITH CHECK ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

CREATE POLICY "Users can view own energy data"
ON public.tesla_energy_data FOR SELECT
USING (auth.uid() = user_id);

-- Function to check if user has Tesla linked
CREATE OR REPLACE FUNCTION public.has_tesla_linked()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tesla_credentials
    WHERE user_id = auth.uid()
      AND token_expires_at > now()
  )
$$;

-- Trigger for updated_at
CREATE TRIGGER update_tesla_credentials_updated_at
BEFORE UPDATE ON public.tesla_credentials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tesla_vehicles_updated_at
BEFORE UPDATE ON public.tesla_vehicles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tesla_energy_sites_updated_at
BEFORE UPDATE ON public.tesla_energy_sites
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();