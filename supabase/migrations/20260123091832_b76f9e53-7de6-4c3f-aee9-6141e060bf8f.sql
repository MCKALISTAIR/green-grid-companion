-- Add monthly report preferences to push_subscriptions
ALTER TABLE public.push_subscriptions 
ADD COLUMN IF NOT EXISTS monthly_report_enabled boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS monthly_report_day integer NOT NULL DEFAULT 1;