-- Create octopus_credentials table for multi-user support
CREATE TABLE IF NOT EXISTS public.octopus_credentials (
    user_id uuid NOT NULL DEFAULT auth.uid() PRIMARY KEY,
    api_key text NOT NULL,
    account_number text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT octopus_credentials_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable RLS on octopus_credentials
ALTER TABLE public.octopus_credentials ENABLE ROW LEVEL SECURITY;

-- RLS policies for octopus_credentials - users can only manage their own credentials
CREATE POLICY "Users can view own credentials"
ON public.octopus_credentials FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own credentials"
ON public.octopus_credentials FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own credentials"
ON public.octopus_credentials FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own credentials"
ON public.octopus_credentials FOR DELETE
USING (auth.uid() = user_id);

-- Add user_id column to octopus_meters for multi-user support
ALTER TABLE public.octopus_meters 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update RLS policy on octopus_meters to use user_id
DROP POLICY IF EXISTS "Allow public read access to meters" ON public.octopus_meters;

CREATE POLICY "Users can view own meters"
ON public.octopus_meters FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own meters"
ON public.octopus_meters FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own meters"
ON public.octopus_meters FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own meters"
ON public.octopus_meters FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger for updated_at on octopus_credentials
CREATE TRIGGER update_octopus_credentials_updated_at
BEFORE UPDATE ON public.octopus_credentials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();