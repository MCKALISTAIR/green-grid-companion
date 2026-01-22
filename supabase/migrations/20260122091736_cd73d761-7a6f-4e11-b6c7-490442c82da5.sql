-- Add weekly digest columns to push_subscriptions
ALTER TABLE public.push_subscriptions 
ADD COLUMN IF NOT EXISTS weekly_digest_enabled boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS weekly_digest_day integer NOT NULL DEFAULT 0; -- 0 = Sunday, 1 = Monday, etc.