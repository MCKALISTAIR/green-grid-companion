-- Add unique index to support upsert on octopus_intelligent_dispatches
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_dispatch 
ON public.octopus_intelligent_dispatches (user_id, mpan, dispatch_type, start_time);