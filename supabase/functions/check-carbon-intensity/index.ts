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

    // Check each subscription
    for (const sub of subscriptions as PushSubscription[]) {
      // Find matching region for postcode
      // Try exact match first, then first letter(s)
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
        // Fetch national data
        const nationalResponse = await fetch('https://api.carbonintensity.org.uk/intensity');
        const nationalData = await nationalResponse.json();
        regionIntensity = {
          intensity: nationalData.data[0]?.intensity?.forecast || 200,
          index: nationalData.data[0]?.intensity?.index || 'moderate',
        };
      }

      // Check if intensity is below threshold
      if (regionIntensity.intensity <= sub.low_intensity_threshold) {
        notifications.push({
          token: sub.device_token,
          title: '⚡ Low Carbon Alert!',
          body: `Carbon intensity is ${regionIntensity.intensity}g CO₂/kWh (${regionIntensity.index}). Great time to charge your EV or run appliances!`,
        });
      }
    }

    // Return the notifications that should be sent
    // In a production app, you would integrate with APNs/FCM here
    // For now, we return the list of notifications to be sent
    console.log(`Found ${notifications.length} notifications to send`);

    return new Response(
      JSON.stringify({
        success: true,
        checked: subscriptions?.length || 0,
        notifications: notifications.length,
        // In production, you'd actually send these via APNs/FCM
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
