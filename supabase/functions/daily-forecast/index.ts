import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

import { corsHeaders } from '../_shared/cors.ts';

interface ForecastData {
  from: string;
  to: string;
  intensity: {
    forecast: number;
    index: string;
  };
}

interface PushSubscription {
  id: string;
  device_token: string;
  postcode: string;
  daily_forecast_enabled: boolean;
  daily_forecast_time: string;
  platform: string;
}

function getIntensityEmoji(index: string): string {
  const emojis: Record<string, string> = {
    'very low': '🌿',
    'low': '🍃',
    'moderate': '☁️',
    'high': '🏭',
    'very high': '💨',
  };
  return emojis[index] || '⚡';
}

/**
 * Calculates the UK timezone offset (0 for GMT, 1 for BST)
 * BST runs from the last Sunday in March at 1:00 UTC to the last Sunday in October at 1:00 UTC
 */
function getUKOffset(date: Date): number {
  const year = date.getUTCFullYear();

  // Last Sunday in March at 1:00 UTC
  const marchLastSunday = new Date(Date.UTC(year, 2, 31, 1, 0, 0));
  marchLastSunday.setUTCDate(31 - marchLastSunday.getUTCDay());

  // Last Sunday in October at 1:00 UTC  
  const octoberLastSunday = new Date(Date.UTC(year, 9, 31, 1, 0, 0));
  octoberLastSunday.setUTCDate(31 - octoberLastSunday.getUTCDay());

  return (date >= marchLastSunday && date < octoberLastSunday) ? 1 : 0;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current time in UK timezone
    const now = new Date();
    const ukOffset = getUKOffset(now);
    const ukHour = (now.getUTCHours() + ukOffset) % 24;
    const ukMinute = now.getUTCMinutes();
    const currentHour = ukHour.toString().padStart(2, '0');

    // Get subscriptions that should receive daily forecast this hour
    const { data: allSubscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('daily_forecast_enabled', true)
      .gte('daily_forecast_time', `${currentHour}:00`)
      .lt('daily_forecast_time', `${currentHour}:59`);

    if (subError) {
      throw subError;
    }

    // Filter to only include subscriptions where the scheduled minute has passed
    const subscriptions = allSubscriptions?.filter(sub => {
      const [, minute] = sub.daily_forecast_time.split(':');
      return parseInt(minute) <= ukMinute;
    }) || [];

    const notifications: Array<{ token: string; title: string; body: string }> = [];

    // Fetch today's forecast
    const forecastResponse = await fetch('https://api.carbonintensity.org.uk/intensity/date');
    if (!forecastResponse.ok) {
      throw new Error('Failed to fetch forecast data');
    }

    const forecastData = await forecastResponse.json();
    const forecasts: ForecastData[] = forecastData.data || [];

    // Calculate stats
    let totalIntensity = 0;
    let greenSlots = 0;
    let bestTime: ForecastData | null = null;
    let worstTime: ForecastData | null = null;

    for (const forecast of forecasts) {
      totalIntensity += forecast.intensity.forecast;
      const idx = forecast.intensity.index.toLowerCase();
      if (idx === 'low' || idx === 'very low') {
        greenSlots++;
      }
      if (!bestTime || forecast.intensity.forecast < bestTime.intensity.forecast) {
        bestTime = forecast;
      }
      if (!worstTime || forecast.intensity.forecast > worstTime.intensity.forecast) {
        worstTime = forecast;
      }
    }

    const avgIntensity = Math.round(totalIntensity / forecasts.length);
    const greenHours = Math.round(greenSlots / 2);

    // Generate notification for each subscription
    for (const sub of subscriptions as PushSubscription[]) {
      const emoji = avgIntensity < 100 ? '🌿' : avgIntensity < 200 ? '☁️' : '🏭';
      const bestFmt = bestTime ? new Date(bestTime.from).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : 'N/A';
      const worstFmt = worstTime ? new Date(worstTime.from).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : 'N/A';

      notifications.push({
        token: sub.device_token,
        title: `${emoji} Today's Carbon Forecast`,
        body: [
          `Today's Average: ${avgIntensity}g CO₂/kWh`,
          `${greenHours}h of green energy expected 🌿`,
          `Best: ${bestFmt} (${bestTime?.intensity.forecast}g)`,
          `Worst: ${worstFmt} (${worstTime?.intensity.forecast}g)`
        ].join(' · '),
      });
    }

    console.log(`Sending ${notifications.length} daily forecast notifications`);

    return new Response(
      JSON.stringify({
        success: true,
        ukTime: `${currentHour}:${ukMinute.toString().padStart(2, '0')}`,
        isDST: ukOffset === 1,
        checked: allSubscriptions?.length || 0,
        filtered: subscriptions.length,
        notifications: notifications.length,
        avgIntensity,
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
