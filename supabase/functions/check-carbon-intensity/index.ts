import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { sendPushNotifications } from '../_shared/push.ts';
import { verifyCronRequest, cronAuthErrorResponse } from '../_shared/cron-auth.ts';

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

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Scheduler-only endpoint: require the shared cron secret.
  const cronAuth = await verifyCronRequest(req, Deno.env.get('CRON_SECRET'));
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
    const intensityByRegion = new Map<string, { intensity: number; index: string }>();
    for (const region of regions) {
      intensityByRegion.set(region.shortname.toLowerCase(), {
        intensity: region.intensity.forecast,
        index: region.intensity.index,
      });
    }

    // Get all subscriptions that have low OR high intensity alerts enabled
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .or('low_intensity_enabled.eq.true,high_intensity_enabled.eq.true');

    if (subError) {
      throw subError;
    }

    const notifications: Array<{ token: string; title: string; body: string; platform: string; isSandbox?: boolean }> = [];
    const stateUpdates: Array<{ id: string; low_state?: string; high_state?: string }> = [];

    // Cache for postcode-to-region lookups to avoid redundant searches
    const postcodeCache = new Map<string, { intensity: number; index: string }>();
    let nationalIntensityCache: { intensity: number; index: string } | null = null;

    // Helper function to get region intensity with caching
    const getRegionIntensity = async (postcode: string) => {
      const postcodeLower = postcode.toLowerCase();

      // Check cache first
      if (postcodeCache.has(postcodeLower)) {
        return postcodeCache.get(postcodeLower)!;
      }

      // Try exact match
      let regionIntensity = intensityByRegion.get(postcodeLower);

      // If no exact match, try to find by first letter(s)
      if (!regionIntensity) {
        for (const [key, value] of intensityByRegion) {
          if (postcodeLower.startsWith(key) || key.startsWith(postcodeLower)) {
            regionIntensity = value;
            break;
          }
        }
      }

      // Default to national if no region match
      if (!regionIntensity) {
        if (!nationalIntensityCache) {
          const nationalResponse = await fetch('https://api.carbonintensity.org.uk/intensity');
          const nationalData = await nationalResponse.json();
          nationalIntensityCache = {
            intensity: nationalData.data[0]?.intensity?.forecast || 200,
            index: nationalData.data[0]?.intensity?.index || 'moderate',
          };
        }
        regionIntensity = nationalIntensityCache;
      }

      // Cache the result
      postcodeCache.set(postcodeLower, regionIntensity);
      return regionIntensity;
    };

    // Check each subscription
    for (const sub of subscriptions as PushSubscription[]) {
      // Get region intensity (with caching)
      const regionIntensity = await getRegionIntensity(sub.postcode);

      // === LOW INTENSITY ALERTS ===
      if (sub.low_intensity_enabled) {
        const currentState = regionIntensity.intensity <= sub.low_intensity_threshold ? 'below' : 'above';
        const previousState = sub.last_intensity_state;

        if (currentState !== previousState) {
          if (currentState === 'below') {
            notifications.push({
              token: sub.device_token,
              title: '⚡ Low Carbon — Start Load Shifting!',
              body: `Carbon intensity dropped to ${regionIntensity.intensity}g CO₂/kWh (${regionIntensity.index}). Great time to charge your EV or run appliances!`,
              platform: sub.platform,
              isSandbox: sub.is_sandbox,
            });
          } else if (currentState === 'above' && previousState === 'below') {
            notifications.push({
              token: sub.device_token,
              title: '📈 Carbon Rising — Load Shifting Window Closed',
              body: `Carbon intensity is now ${regionIntensity.intensity}g CO₂/kWh (${regionIntensity.index}). Consider pausing non-essential usage until it drops again.`,
              platform: sub.platform,
              isSandbox: sub.is_sandbox,
            });
          }
          stateUpdates.push({ id: sub.id, low_state: currentState });
        }
      }

      // === HIGH INTENSITY ALERTS ===
      if (sub.high_intensity_enabled) {
        const currentHighState = regionIntensity.intensity >= sub.high_intensity_threshold ? 'above' : 'below';
        const previousHighState = sub.last_high_intensity_state;

        if (currentHighState !== previousHighState) {
          if (currentHighState === 'above') {
            notifications.push({
              token: sub.device_token,
              title: '🔴 High Carbon — Reduce Usage!',
              body: `Carbon intensity rose to ${regionIntensity.intensity}g CO₂/kWh (${regionIntensity.index}). Consider delaying heavy appliance use until the grid is cleaner.`,
              platform: sub.platform,
              isSandbox: sub.is_sandbox,
            });
          } else if (currentHighState === 'below' && previousHighState === 'above') {
            notifications.push({
              token: sub.device_token,
              title: '🟢 Carbon Dropping — High Intensity Period Over',
              body: `Carbon intensity is now ${regionIntensity.intensity}g CO₂/kWh (${regionIntensity.index}). The grid is getting cleaner again.`,
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
        return supabase
          .from('push_subscriptions')
          .update(updateData)
          .eq('id', id);
      })
    );

    console.log(`Checked ${subscriptions?.length || 0} subscriptions, ${stateUpdates.length} state changes, ${notifications.length} notifications to send`);

    // Actually deliver the push notifications to APNs/FCM
    try {
      await sendPushNotifications(notifications);
    } catch (e) {
      console.error("[PUSH] Error sending push notifications:", e);
    }

    return new Response(
      JSON.stringify({
        success: true,
        checked: subscriptions?.length || 0,
        stateChanges: stateUpdates.length,
        notifications: notifications.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
