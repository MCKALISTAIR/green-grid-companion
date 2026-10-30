import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

import { corsHeaders } from '../_shared/cors.ts';
import { normalizeSubscriptionPostcode } from '../_shared/subscription-postcode.ts';
import { pushDeliveryFor } from '../_shared/push-config.ts';
import { requireUser } from '../_shared/require-user.ts';
import { checkRateLimit } from '../_shared/rate-limit.ts';
import {
  PUSH_IP_LIMIT,
  PUSH_USER_LIMIT,
  PUSH_WINDOW_SECONDS,
  canAccessSubscription,
  isPlausibleDeviceToken,
  ownerForUpsert,
} from '../_shared/push-subscription-access.ts';

interface PushSubscriptionData {
  device_token: string;
  postcode: string;
  platform?: string;
  low_intensity_enabled?: boolean;
  low_intensity_threshold?: number;
  high_intensity_enabled?: boolean;
  high_intensity_threshold?: number;
  daily_forecast_enabled?: boolean;
  daily_forecast_time?: string;
  weekly_digest_enabled?: boolean;
  weekly_digest_day?: number;
  monthly_report_enabled?: boolean;
  monthly_report_day?: number;
  is_sandbox?: boolean;
  /** Ignored. Kept so older app builds that still send it are accepted. */
  attestation_token?: string | null;
}

const json = (body: unknown, status: number, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', ...extra },
  });

const tooMany = (retryAfter: number) =>
  json({ error: 'Too many requests' }, 429, { 'Retry-After': String(retryAfter) });

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Create service role client for secure database access
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // BH-149: rate limit by IP first, then require a session (anonymous is
    // fine), then rate limit by user.
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const ipLimit = await checkRateLimit(`push-subs:ip:${ip}`, PUSH_IP_LIMIT, PUSH_WINDOW_SECONDS);
    if (!ipLimit.allowed) return tooMany(ipLimit.retryAfter);

    const auth = await requireUser(req, (t) => supabase.auth.getUser(t), 'push-subscriptions');
    if ('response' in auth) return auth.response;
    const userId = auth.user.id;

    const userLimit = await checkRateLimit(
      `push-subs:user:${userId}`,
      PUSH_USER_LIMIT,
      PUSH_WINDOW_SECONDS,
    );
    if (!userLimit.allowed) return tooMany(userLimit.retryAfter);

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    // Parse request body for POST/PUT requests
    let body: PushSubscriptionData | null = null;
    if (req.method === 'POST' || req.method === 'PUT') {
      body = await req.json();
    }

    console.log(`Push subscriptions action: ${action}, method: ${req.method}`);

    switch (action) {
      case 'get': {
        // Get subscription by device token
        const deviceToken = url.searchParams.get('device_token');

        if (!isPlausibleDeviceToken(deviceToken)) {
          return new Response(JSON.stringify({ error: 'device_token is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { data, error } = await supabase
          .from('push_subscriptions')
          .select('*')
          .eq('device_token', deviceToken)
          .maybeSingle();

        if (error) {
          console.error('Error fetching subscription:', error);
          return new Response(JSON.stringify({ error: 'Failed to fetch subscription' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Ownership check: If subscription is tied to a user, it must match the authenticated requester
        if (data && !canAccessSubscription(data.user_id, userId)) {
          console.warn('[SECURITY] push subscription access denied');
          return new Response(JSON.stringify({ error: 'Forbidden' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({ data }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'upsert': {
        // Upsert subscription (create or update)
        if (!body) {
          return new Response(JSON.stringify({ error: 'Request body is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (!isPlausibleDeviceToken(body.device_token) || !body.postcode) {
          return new Response(JSON.stringify({ error: 'device_token and postcode are required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // The app only keeps the outward code ("SW1A") or "GB" (national).
        // Never require a full postcode; if one arrives, store only the outward code.
        const postcode = normalizeSubscriptionPostcode(body.postcode);
        if (!postcode) {
          return new Response(
            JSON.stringify({ error: 'Invalid postcode: send an outward code such as SW1A, or GB' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }

        // Validate platform if provided
        const validPlatforms = ['ios', 'android', 'web'];
        if (body.platform && !validPlatforms.includes(body.platform.toLowerCase())) {
          return new Response(JSON.stringify({ error: 'Invalid platform' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Validate threshold range
        if (
          body.low_intensity_threshold !== undefined &&
          (body.low_intensity_threshold < 0 || body.low_intensity_threshold > 500)
        ) {
          return new Response(
            JSON.stringify({ error: 'Intensity threshold must be between 0 and 500' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }

        // Validate high intensity threshold range
        if (
          body.high_intensity_threshold !== undefined &&
          (body.high_intensity_threshold < 0 || body.high_intensity_threshold > 500)
        ) {
          return new Response(
            JSON.stringify({ error: 'High intensity threshold must be between 0 and 500' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }

        // Validate weekly digest day (0-6)
        if (
          body.weekly_digest_day !== undefined &&
          (body.weekly_digest_day < 0 || body.weekly_digest_day > 6)
        ) {
          return new Response(
            JSON.stringify({
              error: 'Weekly digest day must be between 0 (Sunday) and 6 (Saturday)',
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }

        // Validate monthly report day (1-28)
        if (
          body.monthly_report_day !== undefined &&
          (body.monthly_report_day < 1 || body.monthly_report_day > 28)
        ) {
          return new Response(
            JSON.stringify({ error: 'Monthly report day must be between 1 and 28' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }

        // Validate time format (HH:MM)
        if (body.daily_forecast_time) {
          const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
          if (!timeRegex.test(body.daily_forecast_time)) {
            return new Response(JSON.stringify({ error: 'Invalid time format. Use HH:MM' }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        }

        // Check ownership of existing subscription
        const { data: existingSub, error: checkError } = await supabase
          .from('push_subscriptions')
          .select('user_id')
          .eq('device_token', body.device_token)
          .maybeSingle();

        if (checkError) {
          console.error('Error checking existing subscription:', checkError.message);
          return json({ error: 'Failed to check subscription' }, 500);
        }

        if (existingSub && !canAccessSubscription(existingSub.user_id, userId)) {
          console.warn('[SECURITY] push subscription access denied');
          return new Response(JSON.stringify({ error: 'Forbidden' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { data, error } = await supabase
          .from('push_subscriptions')
          .upsert(
            {
              device_token: body.device_token,
              user_id: ownerForUpsert(userId),
              postcode,
              platform: body.platform?.toLowerCase() || 'ios',
              low_intensity_enabled: body.low_intensity_enabled ?? false,
              low_intensity_threshold: body.low_intensity_threshold ?? 100,
              high_intensity_enabled: body.high_intensity_enabled ?? false,
              high_intensity_threshold: body.high_intensity_threshold ?? 200,
              daily_forecast_enabled: body.daily_forecast_enabled ?? false,
              daily_forecast_time: body.daily_forecast_time ?? '07:00',
              weekly_digest_enabled: body.weekly_digest_enabled ?? false,
              weekly_digest_day: body.weekly_digest_day ?? 0,
              monthly_report_enabled: body.monthly_report_enabled ?? false,
              monthly_report_day: body.monthly_report_day ?? 1,
              is_sandbox: body.is_sandbox ?? false,
            },
            {
              onConflict: 'device_token',
            },
          )
          .select()
          .single();

        if (error) {
          console.error('Error upserting subscription:', error);
          return new Response(JSON.stringify({ error: 'Failed to save subscription' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        console.log(
          'Successfully upserted subscription for device:',
          body.device_token.substring(0, 10) + '...',
        );

        // The app only treats the server daily outlook as confirmed (and drops its
        // phone-scheduled fallback) when the server can really deliver a push.
        const push_delivery = pushDeliveryFor(data?.platform ?? body.platform);
        return new Response(JSON.stringify({ data, push_delivery }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'delete': {
        // Delete subscription by device token
        const deviceToken = url.searchParams.get('device_token');

        if (!isPlausibleDeviceToken(deviceToken)) {
          return new Response(JSON.stringify({ error: 'device_token is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Verify ownership
        const { data: existingSub, error: checkError } = await supabase
          .from('push_subscriptions')
          .select('user_id')
          .eq('device_token', deviceToken)
          .maybeSingle();

        if (checkError) {
          console.error('Error checking existing subscription:', checkError.message);
          return json({ error: 'Failed to check subscription' }, 500);
        }

        if (existingSub && !canAccessSubscription(existingSub.user_id, userId)) {
          console.warn('[SECURITY] push subscription access denied');
          return new Response(JSON.stringify({ error: 'Forbidden' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { error } = await supabase
          .from('push_subscriptions')
          .delete()
          .eq('device_token', deviceToken);

        if (error) {
          console.error('Error deleting subscription:', error);
          return new Response(JSON.stringify({ error: 'Failed to delete subscription' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        console.log(
          'Successfully deleted subscription for device:',
          deviceToken.substring(0, 10) + '...',
        );

        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action. Use: get, upsert, or delete' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
    }
  } catch (error) {
    console.error('Push subscriptions error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
