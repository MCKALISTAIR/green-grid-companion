-- Add is_sandbox column to push_subscriptions to enable sandbox/production routing for APNs
ALTER TABLE public.push_subscriptions 
ADD COLUMN IF NOT EXISTS is_sandbox BOOLEAN NOT NULL DEFAULT false;
