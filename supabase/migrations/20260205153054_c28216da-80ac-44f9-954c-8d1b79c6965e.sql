-- Create table for Octopus Intelligent dispatch slots (planned and completed)
CREATE TABLE public.octopus_intelligent_dispatches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  mpan TEXT NOT NULL,
  dispatch_type TEXT NOT NULL CHECK (dispatch_type IN ('planned', 'completed')),
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  charge_kwh NUMERIC,
  source TEXT, -- e.g. 'smart-charge', 'bump-charge'
  location TEXT, -- e.g. 'HOME'
  notified_at TIMESTAMP WITH TIME ZONE, -- Track if we sent a notification for this dispatch
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_dispatch UNIQUE (user_id, mpan, dispatch_type, start_time)
);

-- Enable RLS
ALTER TABLE public.octopus_intelligent_dispatches ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own dispatches"
ON public.octopus_intelligent_dispatches
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Service role has full access to dispatches"
ON public.octopus_intelligent_dispatches
FOR ALL
USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text)
WITH CHECK ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

-- Add trigger for updated_at
CREATE TRIGGER update_octopus_intelligent_dispatches_updated_at
BEFORE UPDATE ON public.octopus_intelligent_dispatches
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for faster queries
CREATE INDEX idx_dispatches_user_type ON public.octopus_intelligent_dispatches (user_id, dispatch_type);
CREATE INDEX idx_dispatches_start_time ON public.octopus_intelligent_dispatches (start_time DESC);