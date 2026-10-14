import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { TESLA_API_URL, AnySupabaseClient, syncTeslaProducts } from './lib.ts';

import { corsHeaders } from '../_shared/cors.ts';

// Tesla API endpoints
const TESLA_AUTH_URL = 'https://auth.tesla.com/oauth2/v3';

// Rate limiting
const rateLimitStore = new Map<string, { count: number; resetAt: number; blockedUntil?: number }>();
const RATE_LIMIT = { maxAttempts: 10, windowMs: 60000, blockDurationMs: 300000 };

function checkRateLimit(key: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (record?.blockedUntil && now < record.blockedUntil) {
    return { allowed: false, retryAfter: Math.ceil((record.blockedUntil - now) / 1000) };
  }

  if (!record || now > record.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT.windowMs });
    return { allowed: true };
  }

  if (record.count >= RATE_LIMIT.maxAttempts) {
    record.blockedUntil = now + RATE_LIMIT.blockDurationMs;
    return { allowed: false, retryAfter: Math.ceil(RATE_LIMIT.blockDurationMs / 1000) };
  }

  record.count++;
  return { allowed: true };
}

// Security event logging
function logSecurityEvent(event: {
  type: string;
  severity: string;
  details: Record<string, unknown>;
}) {
  const logMessage = `[SECURITY] ${event.type}: ${JSON.stringify({
    security_event: true,
    ...event,
    timestamp: new Date().toISOString(),
  })}`;

  if (event.severity === 'CRITICAL' || event.severity === 'HIGH') {
    console.error(logMessage);
  } else {
    console.info(logMessage);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const userAgent = req.headers.get('user-agent');

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const teslaClientId = Deno.env.get('TESLA_CLIENT_ID');
    const teslaClientSecret = Deno.env.get('TESLA_CLIENT_SECRET');

    // Check if Tesla credentials are configured
    const teslaConfigured = !!(teslaClientId && teslaClientSecret);

    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      logSecurityEvent({
        type: 'AUTH_FAILURE',
        severity: 'LOW',
        details: { ip: clientIP, reason: 'missing auth header', user_agent: userAgent },
      });
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await userClient.auth.getUser(token);

    if (claimsError || !claimsData?.user) {
      logSecurityEvent({
        type: 'AUTH_FAILURE',
        severity: 'LOW',
        details: {
          ip: clientIP,
          reason: claimsError?.message || 'invalid token',
          user_agent: userAgent,
        },
      });
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = claimsData.user.id;
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Rate limit by user
    const rateCheck = checkRateLimit(`tesla:${userId}`);
    if (!rateCheck.allowed) {
      logSecurityEvent({
        type: 'RATE_LIMIT',
        severity: 'MEDIUM',
        details: { ip: clientIP, user_id: userId, retry_after: rateCheck.retryAfter },
      });
      return new Response(JSON.stringify({ error: 'Too many requests' }), {
        status: 429,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Retry-After': String(rateCheck.retryAfter),
        },
      });
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action || new URL(req.url).searchParams.get('action');

    console.log(`Tesla action: ${action} for user: ${userId}`);

    // Handle different actions
    switch (action) {
      case 'get-status': {
        // Check if user has Tesla linked and return status
        const { data: credentials } = await serviceClient
          .from('tesla_credentials')
          .select('token_expires_at, updated_at')
          .eq('user_id', userId)
          .maybeSingle();

        const { data: vehicles } = await userClient
          .from('tesla_vehicles')
          .select('*')
          .eq('user_id', userId);

        const { data: energySites } = await userClient
          .from('tesla_energy_sites')
          .select('*')
          .eq('user_id', userId);

        const isLinked = credentials && new Date(credentials.token_expires_at) > new Date();

        return new Response(
          JSON.stringify({
            configured: teslaConfigured,
            linked: isLinked,
            vehicles: vehicles || [],
            energySites: energySites || [],
            lastSync: credentials?.updated_at || null,
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        );
      }

      case 'get-auth-url': {
        if (!teslaConfigured) {
          return new Response(
            JSON.stringify({
              error: 'Tesla integration not configured',
              message: 'Tesla API credentials have not been set up yet.',
            }),
            {
              status: 503,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            },
          );
        }

        const redirectUri = body.redirectUri;
        if (!redirectUri) {
          return new Response(JSON.stringify({ error: 'redirectUri required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Generate state for CSRF protection
        const state = crypto.randomUUID();

        const authUrl = new URL(`${TESLA_AUTH_URL}/authorize`);
        authUrl.searchParams.set('client_id', teslaClientId!);
        authUrl.searchParams.set('redirect_uri', redirectUri);
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set(
          'scope',
          'openid offline_access vehicle_device_data vehicle_charging_cmds energy_device_data',
        );
        authUrl.searchParams.set('state', state);

        return new Response(
          JSON.stringify({
            authUrl: authUrl.toString(),
            state,
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        );
      }

      case 'exchange-code': {
        if (!teslaConfigured) {
          return new Response(JSON.stringify({ error: 'Tesla integration not configured' }), {
            status: 503,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { code, redirectUri } = body;
        if (!code || !redirectUri) {
          return new Response(JSON.stringify({ error: 'code and redirectUri required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Exchange code for tokens
        const tokenResponse = await fetch(`${TESLA_AUTH_URL}/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: teslaClientId!,
            client_secret: teslaClientSecret!,
            code,
            redirect_uri: redirectUri,
          }),
        });

        if (!tokenResponse.ok) {
          const errorText = await tokenResponse.text();
          console.error('Tesla token exchange failed:', errorText);
          logSecurityEvent({
            type: 'TESLA_AUTH_FAILURE',
            severity: 'MEDIUM',
            details: { ip: clientIP, user_id: userId, error: 'token exchange failed' },
          });
          return new Response(JSON.stringify({ error: 'Failed to exchange code' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const tokens = await tokenResponse.json();
        const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

        // Store credentials
        const { error: upsertError } = await serviceClient.from('tesla_credentials').upsert(
          {
            user_id: userId,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            token_expires_at: expiresAt.toISOString(),
          },
          { onConflict: 'user_id' },
        );

        if (upsertError) {
          console.error('Failed to store Tesla credentials:', upsertError);
          return new Response(JSON.stringify({ error: 'Failed to store credentials' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        console.log(`Tesla account linked for user: ${userId}`);

        // Fetch and store products
        await syncTeslaProducts(serviceClient, userId, tokens.access_token);

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'sync-products': {
        const accessToken = await getValidAccessToken(
          serviceClient,
          userId,
          teslaClientId!,
          teslaClientSecret!,
        );
        if (!accessToken) {
          return new Response(JSON.stringify({ error: 'Tesla not linked or token expired' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        await syncTeslaProducts(serviceClient, userId, accessToken);

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get-vehicle-state': {
        const { vehicleId } = body;
        if (!vehicleId) {
          return new Response(JSON.stringify({ error: 'vehicleId required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const accessToken = await getValidAccessToken(
          serviceClient,
          userId,
          teslaClientId!,
          teslaClientSecret!,
        );
        if (!accessToken) {
          return new Response(JSON.stringify({ error: 'Tesla not linked' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const vehicleState = await fetchVehicleState(accessToken, vehicleId);

        return new Response(JSON.stringify(vehicleState), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get-energy-data': {
        const { siteId, period = 'day' } = body;
        if (!siteId) {
          return new Response(JSON.stringify({ error: 'siteId required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const accessToken = await getValidAccessToken(
          serviceClient,
          userId,
          teslaClientId!,
          teslaClientSecret!,
        );
        if (!accessToken) {
          return new Response(JSON.stringify({ error: 'Tesla not linked' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const energyData = await fetchEnergyData(accessToken, siteId, period);

        return new Response(JSON.stringify(energyData), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get-charging-stats': {
        // Get carbon savings from charging sessions
        const { data: sessions } = await userClient
          .from('tesla_charging_sessions')
          .select('*')
          .eq('user_id', userId)
          .order('started_at', { ascending: false })
          .limit(100);

        const totalEnergy =
          sessions?.reduce((sum, s) => sum + Number(s.energy_added_kwh || 0), 0) || 0;
        const totalCarbonUsed =
          sessions?.reduce((sum, s) => sum + Number(s.carbon_used_g || 0), 0) || 0;
        const totalCarbonSaved =
          sessions?.reduce((sum, s) => sum + Number(s.carbon_saved_vs_avg_g || 0), 0) || 0;

        return new Response(
          JSON.stringify({
            sessions: sessions || [],
            stats: {
              totalEnergy,
              totalCarbonUsed,
              totalCarbonSaved,
              sessionCount: sessions?.length || 0,
            },
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        );
      }

      case 'unlink': {
        // Delete all Tesla data for user
        await Promise.all([
          userClient.from('tesla_credentials').delete().eq('user_id', userId),
          userClient.from('tesla_vehicles').delete().eq('user_id', userId),
          userClient.from('tesla_energy_sites').delete().eq('user_id', userId),
        ]);

        console.log(`Tesla account unlinked for user: ${userId}`);

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Unknown action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    console.error('Tesla edge function error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Helper functions
async function getValidAccessToken(
  serviceClient: AnySupabaseClient,
  userId: string,
  clientId: string,
  clientSecret: string,
): Promise<string | null> {
  const { data: credentials } = await serviceClient
    .from('tesla_credentials')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (!credentials) return null;

  // Check if token is expired or about to expire (5 min buffer)
  const expiresAt = new Date(credentials.token_expires_at);
  const now = new Date();
  const bufferMs = 5 * 60 * 1000;

  if (expiresAt.getTime() - bufferMs > now.getTime()) {
    return credentials.access_token;
  }

  // Refresh token
  console.log(`Refreshing Tesla token for user: ${userId}`);

  const refreshResponse = await fetch(`${TESLA_AUTH_URL}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: credentials.refresh_token,
    }),
  });

  if (!refreshResponse.ok) {
    console.error('Failed to refresh Tesla token');
    return null;
  }

  const tokens = await refreshResponse.json();
  const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);

  await serviceClient
    .from('tesla_credentials')
    .update({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || credentials.refresh_token,
      token_expires_at: newExpiresAt.toISOString(),
    })
    .eq('user_id', userId);

  return tokens.access_token;
}

async function fetchVehicleState(accessToken: string, vehicleId: string) {
  try {
    const response = await fetch(`${TESLA_API_URL}/api/1/vehicles/${vehicleId}/vehicle_data`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      // Vehicle might be asleep
      if (response.status === 408) {
        return { status: 'asleep', message: 'Vehicle is sleeping' };
      }
      throw new Error(`Failed to fetch vehicle data: ${response.status}`);
    }

    const data = await response.json();
    const vehicle = data.response;

    return {
      status: 'online',
      batteryLevel: vehicle.charge_state?.battery_level,
      batteryRange: vehicle.charge_state?.battery_range,
      chargeLimit: vehicle.charge_state?.charge_limit_soc,
      chargingState: vehicle.charge_state?.charging_state,
      chargeRate: vehicle.charge_state?.charge_rate,
      timeToFullCharge: vehicle.charge_state?.time_to_full_charge,
      batteryCapacity: vehicle.vehicle_config?.battery_capacity || estimateBatteryCapacity(vehicle),
    };
  } catch (error) {
    console.error('Error fetching vehicle state:', error);
    return { status: 'error', error: String(error) };
  }
}

function estimateBatteryCapacity(vehicle: Record<string, unknown>): number {
  // Estimate based on model (rough estimates)
  const modelCode = (vehicle.vin as string)?.charAt(3);
  switch (modelCode) {
    case 'S':
      return 100; // Model S
    case '3':
      return 75; // Model 3
    case 'X':
      return 100; // Model X
    case 'Y':
      return 75; // Model Y
    default:
      return 75;
  }
}

async function fetchEnergyData(accessToken: string, siteId: string, period: string) {
  try {
    const response = await fetch(
      `${TESLA_API_URL}/api/1/energy_sites/${siteId}/calendar_history?kind=energy&period=${period}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch energy data: ${response.status}`);
    }

    const data = await response.json();
    return data.response;
  } catch (error) {
    console.error('Error fetching energy data:', error);
    return { error: String(error) };
  }
}
