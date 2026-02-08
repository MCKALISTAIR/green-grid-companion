
-- Add meter_type column to identify import vs export meters
ALTER TABLE public.octopus_meters 
ADD COLUMN meter_type text NOT NULL DEFAULT 'import';

-- Add a comment for clarity
COMMENT ON COLUMN public.octopus_meters.meter_type IS 'Type of meter: import (consumption) or export (solar/generation)';
