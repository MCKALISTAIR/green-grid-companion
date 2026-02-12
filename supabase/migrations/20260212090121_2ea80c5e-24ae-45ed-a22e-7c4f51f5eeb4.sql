
ALTER TABLE public.push_subscriptions
ADD COLUMN IF NOT EXISTS high_intensity_enabled boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS high_intensity_threshold integer NOT NULL DEFAULT 200,
ADD COLUMN IF NOT EXISTS last_high_intensity_state text;
