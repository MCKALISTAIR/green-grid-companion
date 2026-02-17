-- Create table for rate limiting
CREATE TABLE IF NOT EXISTS public.rate_limits (
    key text PRIMARY KEY,
    count int NOT NULL DEFAULT 0,
    first_attempt bigint NOT NULL,
    blocked_until bigint NOT NULL DEFAULT 0,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Create policy to allow service role full access
CREATE POLICY "Service role has full access" ON public.rate_limits
    AS PERMISSIVE FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Function to check rate limit
CREATE OR REPLACE FUNCTION public.fn_check_rate_limit(
    p_key text,
    p_max_attempts int,
    p_window_ms int,
    p_block_duration_ms int
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    entry record;
    now_ms bigint := (EXTRACT(EPOCH FROM NOW()) * 1000)::bigint;
    retry_after int := 0;
    new_blocked_until bigint := 0;
BEGIN
    -- Lock the row if it exists to prevent race conditions
    SELECT * INTO entry FROM public.rate_limits WHERE key = p_key FOR UPDATE;

    -- If no entry, insert
    IF entry.key IS NULL THEN
        INSERT INTO public.rate_limits (key, count, first_attempt, blocked_until)
        VALUES (p_key, 1, now_ms, 0)
        ON CONFLICT (key) DO NOTHING;

        -- If we successfully inserted, we are done (count=1)
        IF FOUND THEN
             RETURN json_build_object('allowed', true);
        END IF;

        -- If not inserted, someone else did. Fetch and lock it.
        SELECT * INTO entry FROM public.rate_limits WHERE key = p_key FOR UPDATE;
    END IF;

    -- Check if currently blocked
    IF entry.blocked_until > now_ms THEN
        retry_after := CEIL((entry.blocked_until - now_ms) / 1000.0);
        RETURN json_build_object('allowed', false, 'retry_after', retry_after);
    END IF;

    -- Cleanup/Reset if window expired
    IF (now_ms - entry.first_attempt) > p_window_ms THEN
        -- Window expired, reset
        UPDATE public.rate_limits
        SET count = 1,
            first_attempt = now_ms,
            blocked_until = 0,
            updated_at = NOW()
        WHERE key = p_key;

        RETURN json_build_object('allowed', true);
    END IF;

    -- Check if limit exceeded
    IF entry.count >= p_max_attempts THEN
        -- Block
        new_blocked_until := now_ms + p_block_duration_ms;
        retry_after := CEIL(p_block_duration_ms / 1000.0);

        UPDATE public.rate_limits
        SET blocked_until = new_blocked_until,
            updated_at = NOW()
        WHERE key = p_key;

        RETURN json_build_object('allowed', false, 'retry_after', retry_after);
    ELSE
        -- Increment
        UPDATE public.rate_limits
        SET count = count + 1,
            updated_at = NOW()
        WHERE key = p_key;

        RETURN json_build_object('allowed', true);
    END IF;
END;
$$;
