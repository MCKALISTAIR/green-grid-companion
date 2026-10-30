-- BH-153: signed-in users could INSERT/UPDATE push_subscriptions directly via
-- PostgREST and skip the push-subscriptions edge function's checks (full
-- postcode, thresholds outside 0-500, any platform, last_intensity_state).
-- The app only writes through the edge function, which uses service_role.
-- NOT APPLIED: Alistair applies it after review.

-- 1. Writes only through the edge function. Own-row SELECT and DELETE stay
--    (RLS auth.uid() = user_id still applies).
REVOKE INSERT, UPDATE ON public.push_subscriptions FROM authenticated, anon;

-- 2. Backstop constraints matching the edge function. NOT VALID so existing
--    rows are not rechecked; run the VALIDATE lines after cleaning any old rows.
ALTER TABLE public.push_subscriptions
  ADD CONSTRAINT push_subscriptions_platform_chk
    CHECK (platform IN ('ios', 'android', 'web')) NOT VALID,
  ADD CONSTRAINT push_subscriptions_low_threshold_chk
    CHECK (low_intensity_threshold BETWEEN 0 AND 500) NOT VALID,
  ADD CONSTRAINT push_subscriptions_high_threshold_chk
    CHECK (high_intensity_threshold BETWEEN 0 AND 500) NOT VALID,
  ADD CONSTRAINT push_subscriptions_weekly_day_chk
    CHECK (weekly_digest_day BETWEEN 0 AND 6) NOT VALID,
  ADD CONSTRAINT push_subscriptions_monthly_day_chk
    CHECK (monthly_report_day BETWEEN 1 AND 28) NOT VALID,
  ADD CONSTRAINT push_subscriptions_postcode_outward_chk
    CHECK (postcode = 'GB' OR postcode ~ '^[A-Z]{1,2}[0-9][A-Z0-9]?$') NOT VALID;

-- After checking existing rows:
-- ALTER TABLE public.push_subscriptions VALIDATE CONSTRAINT push_subscriptions_platform_chk;
-- (repeat for each constraint above)
