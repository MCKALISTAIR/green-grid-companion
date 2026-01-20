-- Create table to store consumption data from Octopus Energy
CREATE TABLE public.octopus_consumption (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  interval_start TIMESTAMP WITH TIME ZONE NOT NULL,
  interval_end TIMESTAMP WITH TIME ZONE NOT NULL,
  consumption_kwh DECIMAL(10, 4) NOT NULL,
  mpan TEXT NOT NULL,
  serial_number TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(mpan, interval_start)
);

-- Create table to store carbon footprint calculations
CREATE TABLE public.carbon_footprint (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  interval_start TIMESTAMP WITH TIME ZONE NOT NULL,
  interval_end TIMESTAMP WITH TIME ZONE NOT NULL,
  consumption_kwh DECIMAL(10, 4) NOT NULL,
  intensity_gco2_kwh INTEGER NOT NULL,
  carbon_g DECIMAL(12, 4) NOT NULL,
  intensity_index TEXT NOT NULL,
  mpan TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(mpan, interval_start)
);

-- Create table to store meter details (cached from Octopus API)
CREATE TABLE public.octopus_meters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mpan TEXT NOT NULL UNIQUE,
  serial_number TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- No RLS needed - this is a single-user app with API key in backend
-- The app doesn't have user authentication

-- Create indexes for performance
CREATE INDEX idx_consumption_mpan_interval ON public.octopus_consumption(mpan, interval_start DESC);
CREATE INDEX idx_footprint_mpan_interval ON public.carbon_footprint(mpan, interval_start DESC);
CREATE INDEX idx_footprint_interval_start ON public.carbon_footprint(interval_start DESC);