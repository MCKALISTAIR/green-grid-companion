
-- Add column to track whether user was last notified as above or below threshold
-- null = never checked, 'above' = last reading was above threshold, 'below' = last reading was below threshold
ALTER TABLE public.push_subscriptions
ADD COLUMN last_intensity_state text DEFAULT NULL;

-- Add a comment for documentation
COMMENT ON COLUMN public.push_subscriptions.last_intensity_state IS 'Tracks last known intensity state relative to threshold: above, below, or null (never checked). Used for range-based notifications.';
