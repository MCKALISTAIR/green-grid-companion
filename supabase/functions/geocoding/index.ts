import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { safeErrorResponse } from '../_shared/safe-error.ts';
import { requireUser } from '../_shared/require-user.ts';
import { checkRateLimit } from '../_shared/rate-limit.ts';
import {
  GEOCODING_IP_LIMIT,
  GEOCODING_USER_LIMIT,
  checkGeocodingQuery,
  clientIp,
  isCacheableResult,
} from '../_shared/geocoding-guard.ts';

const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', ...extra },
  });

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // BH-148: per-IP limit first (cheap, stops floods before the auth call).
    const ip = clientIp(req);
    const ipLimit = await checkRateLimit(
      `geocoding:ip:${ip}`,
      GEOCODING_IP_LIMIT.limit,
      GEOCODING_IP_LIMIT.windowSeconds,
    );
    if (!ipLimit.allowed) {
      return json({ error: 'Too many requests', code: 'rate_limited' }, 429, {
        'Retry-After': String(ipLimit.retryAfter),
      });
    }

    // BH-148: a Supabase session is required (anonymous sessions are fine).
    const auth = await requireUser(req, (t) => supabase.auth.getUser(t), 'GEOCODING');
    if ('response' in auth) return auth.response;

    const userLimit = await checkRateLimit(
      `geocoding:user:${auth.user.id}`,
      GEOCODING_USER_LIMIT.limit,
      GEOCODING_USER_LIMIT.windowSeconds,
    );
    if (!userLimit.allowed) {
      return json({ error: 'Too many requests', code: 'rate_limited' }, 429, {
        'Retry-After': String(userLimit.retryAfter),
      });
    }

    const body = await req.json().catch(() => ({}));
    const checked = checkGeocodingQuery(body?.query);
    if (!checked.ok) {
      return json({ error: 'Invalid query', code: checked.code }, 400);
    }
    const normalizedQuery = checked.normalized;

    // 1. Check cache first
    const { data: cached, error: selectError } = await supabase
      .from('geocoding_cache')
      .select('response_json')
      .eq('query', normalizedQuery)
      .maybeSingle();

    if (selectError) {
      console.error('[GEOCODING] cache read failed', { code: selectError.code });
    }

    if (cached) {
      // No query text in logs: it is the user's location (BH-150).
      console.log('[GEOCODING] cache hit');
      return json(cached.response_json);
    }

    console.log('[GEOCODING] cache miss, querying Nominatim');

    // 2. Fetch from OpenStreetMap Nominatim
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(normalizedQuery + ', United Kingdom')}&format=json&countrycodes=gb&limit=1&addressdetails=1`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'GridSense/1.0 (production geocoding proxy)' },
    });

    if (!res.ok) {
      throw new Error(`Nominatim request failed: ${res.status}`);
    }

    const data = await res.json();

    // 3. Cache real results only. Empty or junk answers are not stored, so
    // made-up queries can't fill the table (BH-148).
    if (isCacheableResult(data)) {
      const { error: insertError } = await supabase.from('geocoding_cache').upsert({
        query: normalizedQuery,
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon),
        response_json: data,
        created_at: new Date().toISOString(),
      });
      if (insertError) {
        console.error('[GEOCODING] cache write failed', { code: insertError.code });
      }
    }

    return json(Array.isArray(data) ? data : []);
  } catch (e) {
    return safeErrorResponse(
      { code: 'geocoding_failed', error: 'Geocoding failed', status: 500, context: 'GEOCODING' },
      e,
    );
  }
});
