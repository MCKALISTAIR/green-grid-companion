import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
  daily_forecast_enabled: boolean;
  daily_forecast_time: string;
  platform: string;
  last_intensity_state: string | null; // 'above' | 'below' | null
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
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

    // Get all subscriptions that have low intensity alerts enabled
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('low_intensity_enabled', true);

    if (subError) {
      throw subError;
    }

    const notifications: Array<{ token: string; title: string; body: string }> = [];
    const stateUpdates: Array<{ id: string; state: string }> = [];

    // Check each subscription
    for (const sub of subscriptions as PushSubscription[]) {
      // Find matching region for postcode
      const postcodeLower = sub.postcode.toLowerCase();
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
        const nationalResponse = await fetch('https://api.carbonintensity.org.uk/intensity');
        const nationalData = await nationalResponse.json();
        regionIntensity = {
          intensity: nationalData.data[0]?.intensity?.forecast || 200,
          index: nationalData.data[0]?.intensity?.index || 'moderate',
        };
      }

      // Determine current state relative to threshold
      const currentState = regionIntensity.intensity <= sub.low_intensity_threshold ? 'below' : 'above';
      const previousState = sub.last_intensity_state;

      // Only notify on state TRANSITIONS (or first check)
      if (currentState !== previousState) {
        if (currentState === 'below') {
          // Intensity just dropped below threshold — good time to load shift
          notifications.push({
            token: sub.device_token,
            title: '⚡ Low Carbon — Start Load Shifting!',
            body: `Carbon intensity dropped to ${regionIntensity.intensity}g CO₂/kWh (${regionIntensity.index}). Great time to charge your EV or run appliances!`,
          });
        } else if (currentState === 'above' && previousState === 'below') {
          // Intensity just climbed above threshold — stop load shifting
          notifications.push({
            token: sub.device_token,
            title: '📈 Carbon Rising — Load Shifting Window Closed',
            body: `Carbon intensity is now ${regionIntensity.intensity}g CO₂/kWh (${regionIntensity.index}). Consider pausing non-essential usage until it drops again.`,
          });
        }

        // Track state update
        stateUpdates.push({ id: sub.id, state: currentState });
      }
    }

    // Batch update all state changes
    for (const update of stateUpdates) {
      await supabase
        .from('push_subscriptions')
        .update({ last_intensity_state: update.state })
        .eq('id', update.id);
    }

    console.log(`Checked ${subscriptions?.length || 0} subscriptions, ${stateUpdates.length} state changes, ${notifications.length} notifications to send`);

    return new Response(
      JSON.stringify({
        success: true,
        checked: subscriptions?.length || 0,
        stateChanges: stateUpdates.length,
        notifications: notifications.length,
        debug: notifications,
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
