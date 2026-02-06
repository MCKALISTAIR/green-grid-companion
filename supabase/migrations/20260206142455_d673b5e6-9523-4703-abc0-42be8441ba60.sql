
-- Add carbon savings columns to intelligent dispatches
ALTER TABLE public.octopus_intelligent_dispatches
ADD COLUMN avg_intensity_gco2 integer,
ADD COLUMN carbon_used_g numeric,
ADD COLUMN carbon_saved_g numeric;
