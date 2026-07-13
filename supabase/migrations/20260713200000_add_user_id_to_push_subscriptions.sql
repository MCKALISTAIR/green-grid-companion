-- Add user_id column to push_subscriptions to secure device registrations
ALTER TABLE public.push_subscriptions 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create an index for efficient query performance when lookup is done by user_id
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);
