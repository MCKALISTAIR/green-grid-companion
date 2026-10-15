import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { sendPushNotifications } from '../_shared/push.ts';
import { nextHighState, nextLowState } from './alert-state.ts';
import {
  verifySchedulerRequest,
  cronAuthErrorResponse,
  createSchedulerSecretProvider,
  fetchSchedulerSecret,
  type SchedulerSecretRpcClient,
} from '../_shared/cron-auth.ts';
import { createKeyLoader, backfillLegacyCredentials } from '../_shared/octopus-credentials.ts';
import {
  fetchNationalIntensity,
  toIntensityReading,
  type IntensityReading,
} from '../_shared/intensity-reading.ts';

interface CarbonIntensityResponse {
  data: Array<{
    data: Array<{
      shortname: string;
      intensity: {
        forecast: number;
        index: string;
      };
    }>;
  }>;
}

interface PushSubscription {
  id: string;
  device_token: string;
  postcode: string;
  low_intensity_enabled: boolean;
  low_intensity_threshold: number;
  high_intensity_enabled: boolean;
  high_intensity_threshold: number;
  daily_forecast_enabled: boolean;
  daily_forecast_time: string;
  platform: string;
  last_intensity_state: string | null; // 'above' | 'below' | null
  last_high_intensity_state: string | null; // 'above' | 'below' | null
  is_sandbox: boolean;
}

// Scheduler secret lives in the database (see 20261003120000 migration);
// read with the service role and cached per instance.
const getSchedulerSecret = createSchedulerSecretProvider(() =>
  fetchSchedulerSecret(
    createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    ) as unknown as SchedulerSecretRpcClient,
  ),
);

// Used to encrypt any remaining legacy plaintext Octopus API keys (see below).
const getCredentialKey = createKeyLoader(() => Deno.env.get('OCTOPUS_CREDENTIALS_KEY'));

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Scheduler-only endpoint: require the shared cron secret.
  const cronAuth = await verifySchedulerRequest(req, getSchedulerSecret);
  if (!cronAuth.ok) {
    return cronAuthErrorResponse(cronAuth, corsHeaders);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch current carbon intensity for all UK regions
    const carbonResponse = await fetch('https://api.carbonintensity.org.uk/regional');
    if (!carbonResponse.ok) {
      throw new Error('Failed to fetch carbon intensity data');
    }

    const carbonData: CarbonIntensityResponse = await carbonResponse.json();
    const regions = carbonData.data[0]?.data || [];

    // Create a map of postcode prefix to intensity
    // Only real, well-formed readings go in; a region with missing data is left
    // out (and then falls back to the national reading, or is skipped).
    const intensityByRegion = new Map<string, IntensityReading>();
    for (const region of regions) {
      const reading = toIntensityReading(region?.intensity);
      if (region?.shortname && reading) {
        intensityByRegion.set(region.shortname.toLowerCase(), reading);
      } else {
        console.warn(
          `[INTENSITY] Ignoring region with invalid data: ${region?.shortname ?? 'unknown'}`,
        );
      }
    }

    // Get all subscriptions that have low OR high intensity alerts enabled
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .or('low_intensity_enabled.eq.true,high_intensity_enabled.eq.true');

    if (subError) {
      throw subError;
    }

    const notifications: Array<{
      token: string;
      title: string;
      body: string;
      platform: string;
      isSandbox?: boolean;
    }> = [];
    const stateUpdates: Array<{ id: string; low_state?: string; high_state?: string }> = [];

    // Cache for postcode-to-region lookups to avoid redundant searches
    const postcodeCache = new Map<string, IntensityReading | null>();
    // undefined = not fetched yet; null = fetch failed (don't retry per subscription).
    let nationalIntensityCache: IntensityReading | null | undefined = undefined;
    let skippedNoData = 0;

    // Helper function to get region intensity with caching
    const getRegionIntensity = async (postcode: string): Promise<IntensityReading | null> => {
      const postcodeLower = postcode.toLowerCase();

      // Check cache first
      if (postcodeCache.has(postcodeLower)) {
        return postcodeCache.get(postcodeLower) ?? null;
      }

      // Try exact match
      let regionIntensity: IntensityReading | null | undefined =
        intensityByRegion.get(postcodeLower);

      // If no exact match, try to find by first letter(s)
      if (!regionIntensity) {
        for (const [key, value] of intensityByRegion) {
          if (postcodeLower.startsWith(key) || key.startsWith(postcodeLower)) {
            regionIntensity = value;
            break;
          }
        }
      }

      // Default to national if no region match. Never invent a number: if the
      // national reading is unavailable, return null and the caller skips.
      if (!regionIntensity) {
        if (nationalIntensityCache === undefined) {
          nationalIntensityCache = await fetchNationalIntensity();
        }
        regionIntensity = nationalIntensityCache;
      }

      // Cache the result
      postcodeCache.set(postcodeLower, regionIntensity ?? null);
      return regionIntensity ?? null;
    };

    // Check each subscription
    for (const sub of subscriptions as PushSubscription[]) {
      // Get region intensity (with caching)
      const regionIntensity = await getRegionIntensity(sub.postcode);
      if (!regionIntensity) {
        // No trustworthy reading: send nothing and leave alert state unchanged
        // so the next run (every 30 min) re-evaluates with real data.
        skippedNoData++;
        console.warn(`[INTENSITY] No valid reading for subscription ${sub.id}; skipping`);
        continue;
      }

      // === LOW INTENSITY ALERTS ===
      if (sub.low_intensity_enabled) {
        const previousState = sub.last_intensity_state;
        const currentState = nextLowState(
          regionIntensity.intensity,
          sub.low_intensity_threshold,
          previousState,
        );

        if (currentState !== previousState) {
          if (currentState === 'below') {
            notifications.push({
              token: sub.device_token,
              title: `${regionIntensity.intensity} gCO₂/kWh. Grid's looking clean`,
              body: `That's at or under your ${sub.low_intensity_threshold} gCO₂/kWh alert (${regionIntensity.index}). A good time for the big loads.`,
              platform: sub.platform,
              isSandbox: sub.is_sandbox,
            });
          } else if (currentState === 'above' && previousState === 'below') {
            notifications.push({
              token: sub.device_token,
              title: `Clean spell over: ${regionIntensity.intensity} gCO₂/kWh`,
              body: `That's back over your ${sub.low_intensity_threshold} gCO₂/kWh alert (${regionIntensity.index}). Big loads can wait for the next clean spell.`,
              platform: sub.platform,
              isSandbox: sub.is_sandbox,
            });
          }
          stateUpdates.push({ id: sub.id, low_state: currentState });
        }
      }

      // === HIGH INTENSITY ALERTS ===
      if (sub.high_intensity_enabled) {
        const previousHighState = sub.last_high_intensity_state;
        const currentHighState = nextHighState(
          regionIntensity.intensity,
          sub.high_intensity_threshold,
          previousHighState,
        );

        if (currentHighState !== previousHighState) {
          if (currentHighState === 'above') {
            notifications.push({
              token: sub.device_token,
              title: `${regionIntensity.intensity} gCO₂/kWh. Grid's gone grumpy`,
              body: `That's at or past your ${sub.high_intensity_threshold} gCO₂/kWh alert (${regionIntensity.index}). If something can wait, let it.`,
              platform: sub.platform,
              isSandbox: sub.is_sandbox,
            });
          } else if (currentHighState === 'below' && previousHighState === 'above') {
            notifications.push({
              token: sub.device_token,
              title: `${regionIntensity.intensity} gCO₂/kWh. Grid's cheering up`,
              body: `That's back under your ${sub.high_intensity_threshold} gCO₂/kWh alert (${regionIntensity.index}).`,
              platform: sub.platform,
              isSandbox: sub.is_sandbox,
            });
          }
          stateUpdates.push({ id: sub.id, high_state: currentHighState });
        }
      }
    }

    // Batch update all state changes in parallel
    // Group updates by subscription id
    const updateMap = new Map<string, { low_state?: string; high_state?: string }>();
    for (const update of stateUpdates) {
      const existing = updateMap.get(update.id) || {};
      if (update.low_state) existing.low_state = update.low_state;
      if (update.high_state) existing.high_state = update.high_state;
      updateMap.set(update.id, existing);
    }

    await Promise.all(
      Array.from(updateMap.entries()).map(([id, states]) => {
        const updateData: Record<string, string> = {};
        if (states.low_state) updateData.last_intensity_state = states.low_state;
        if (states.high_state) updateData.last_high_intensity_state = states.high_state;
        return supabase.from('push_subscriptions').update(updateData).eq('id', id);
      }),
    );

    console.log(
      `Checked ${subscriptions?.length || 0} subscriptions, ${stateUpdates.length} state changes, ${notifications.length} notifications to send, ${skippedNoData} skipped (no valid intensity data)`,
    );

    // Actually deliver the push notifications to APNs/FCM
    try {
      await sendPushNotifications(notifications);
    } catch (e) {
      console.error('[PUSH] Error sending push notifications:', e);
    }

    // Piggyback: encrypt any legacy plaintext Octopus API keys left from before
    // the security migration. Idempotent, a single cheap query once done, and
    // never fails this run (skips quietly if the key/migration isn't there yet).
    let legacyCredentials: unknown = null;
    try {
      legacyCredentials = await backfillLegacyCredentials(supabase, getCredentialKey);
    } catch (e) {
      console.error('[CREDENTIALS] Legacy key backfill failed:', e);
    }

    return new Response(
      JSON.stringify({
        success: true,
        checked: subscriptions?.length || 0,
        stateChanges: stateUpdates.length,
        notifications: notifications.length,
        skipped_no_data: skippedNoData,
        legacy_credentials: legacyCredentials,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
