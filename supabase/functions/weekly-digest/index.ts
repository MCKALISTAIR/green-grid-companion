import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { sendPushNotifications } from '../_shared/push.ts';
import {
  verifySchedulerRequest,
  cronAuthErrorResponse,
  createSchedulerSecretProvider,
  fetchSchedulerSecret,
  type SchedulerSecretRpcClient,
} from '../_shared/cron-auth.ts';
import { claimSubscriptionsForPeriod, isoWeekPeriodKey, type NotificationLogClient } from '../_shared/notification-periods.ts';

interface FootprintRecord {
  interval_start: string;
  interval_end: string;
  consumption_kwh: number;
  intensity_gco2_kwh: number;
  carbon_g: number;
  intensity_index: string;
  mpan: string;
}

interface PushSubscription {
  id: string;
  device_token: string;
  postcode: string;
  weekly_digest_enabled: boolean;
  weekly_digest_day: number;
  platform: string;
  is_sandbox: boolean;
}

interface ForecastSlot {
  from: string;
  to: string;
  intensity: {
    forecast: number;
    actual: number | null;
    index: string;
  };
}

function getDayName(day: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[day] || 'Sunday';
}

function getIntensityEmoji(avgIntensity: number): string {
  if (avgIntensity < 100) return '🌿';
  if (avgIntensity < 150) return '🍃';
  if (avgIntensity < 200) return '☁️';
  if (avgIntensity < 250) return '🏭';
  return '💨';
}

// Scheduler secret lives in the database (see 20261003120000 migration);
// read with the service role and cached per instance.
const getSchedulerSecret = createSchedulerSecretProvider(() =>
  fetchSchedulerSecret(
    createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!) as unknown as SchedulerSecretRpcClient,
  ));

Deno.serve(async (req) => {
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

    // Get current day of week (0 = Sunday, 6 = Saturday)
    const now = new Date();
    const currentDay = now.getUTCDay();

    console.log(`Weekly Digest - Running for day ${currentDay} (${getDayName(currentDay)})`);

    // Get subscriptions that should receive weekly digest today
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('weekly_digest_enabled', true)
      .eq('weekly_digest_day', currentDay);

    if (subError) {
      console.error('Error fetching subscriptions:', subError);
      throw subError;
    }

    console.log(`Found ${subscriptions?.length || 0} subscriptions for weekly digest`);

    // Calculate date range for last 7 days
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    // Fetch footprint data for the past week
    const { data: footprint, error: footprintError } = await supabase
      .from('carbon_footprint')
      .select('*')
      .gte('interval_start', weekAgo.toISOString())
      .order('interval_start', { ascending: true });

    if (footprintError) {
      console.error('Error fetching footprint:', footprintError);
    }

    // Calculate weekly stats
    let totalCarbonG = 0;
    let totalKwh = 0;
    let totalIntensity = 0;
    const byIndex: Record<string, { count: number; carbon_g: number; kwh: number }> = {};

    for (const record of (footprint || []) as FootprintRecord[]) {
      totalCarbonG += Number(record.carbon_g);
      totalKwh += Number(record.consumption_kwh);
      totalIntensity += record.intensity_gco2_kwh;

      const idx = record.intensity_index;
      if (!byIndex[idx]) {
        byIndex[idx] = { count: 0, carbon_g: 0, kwh: 0 };
      }
      byIndex[idx].count++;
      byIndex[idx].carbon_g += Number(record.carbon_g);
      byIndex[idx].kwh += Number(record.consumption_kwh);
    }

    const avgIntensity = footprint?.length ? Math.round(totalIntensity / footprint.length) : 0;
    const totalCarbonKg = totalCarbonG / 1000;

    // Find best usage times from historical data
    const hourlyUsage: Record<number, { count: number; avgIntensity: number }> = {};
    for (const record of (footprint || []) as FootprintRecord[]) {
      const hour = new Date(record.interval_start).getUTCHours();
      if (!hourlyUsage[hour]) {
        hourlyUsage[hour] = { count: 0, avgIntensity: 0 };
      }
      hourlyUsage[hour].count++;
      hourlyUsage[hour].avgIntensity += record.intensity_gco2_kwh;
    }

    // Find the hour with lowest average intensity
    let bestHour = 0;
    let bestAvg = Infinity;
    for (const [hour, data] of Object.entries(hourlyUsage)) {
      const avg = data.avgIntensity / data.count;
      if (avg < bestAvg) {
        bestAvg = avg;
        bestHour = parseInt(hour);
      }
    }

    // Fetch this week's forecast for best times
    const forecastResponse = await fetch('https://api.carbonintensity.org.uk/intensity/date');
    let bestTimeToday = 'N/A';

    if (forecastResponse.ok) {
      const forecastData = await forecastResponse.json();
      const forecasts: ForecastSlot[] = forecastData.data || [];

      let lowestForecast: ForecastSlot | null = null;
      for (const slot of forecasts) {
        if (!lowestForecast || slot.intensity.forecast < lowestForecast.intensity.forecast) {
          lowestForecast = slot;
        }
      }

      if (lowestForecast) {
        bestTimeToday = new Date(lowestForecast.from).toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit'
        });
      }
    }

    // Calculate green energy percentage
    const greenCount = (byIndex['very low']?.count || 0) + (byIndex['low']?.count || 0);
    const totalCount = footprint?.length || 1;
    const greenPercentage = Math.round((greenCount / totalCount) * 100);

    const notifications: Array<{ token: string; title: string; body: string; platform: string; isSandbox?: boolean }> = [];

    // Idempotency: claim each subscription for this ISO week before sending so
    // a duplicate/replayed run never sends the same digest twice.
    const periodKey = isoWeekPeriodKey(now);
    const allSubs = (subscriptions || []) as PushSubscription[];
    const claimed = await claimSubscriptionsForPeriod(
      supabase as unknown as NotificationLogClient,
      'weekly-digest',
      periodKey,
      allSubs.map((s) => s.id),
    );
    const dueSubscriptions = allSubs.filter((s) => claimed.has(s.id));
    console.log(`Weekly digest ${periodKey}: ${dueSubscriptions.length} due, ${allSubs.length - dueSubscriptions.length} already sent`);

    // Generate notification for each subscription
    for (const sub of dueSubscriptions) {
      const emoji = getIntensityEmoji(avgIntensity);

      let body: string;
      if (footprint && footprint.length > 0) {
        body = `📊 This week: ${totalCarbonKg.toFixed(1)}kg CO₂ from ${totalKwh.toFixed(1)}kWh. ` +
          `${greenPercentage}% green energy! ` +
          `💡 Best time today: ${bestTimeToday}`;
      } else {
        body = `💡 Best time to use energy today: ${bestTimeToday}. ` +
          `Link your Octopus meter for personalized insights!`;
      }

      notifications.push({
        token: sub.device_token,
        title: `${emoji} Your Weekly Carbon Digest`,
        body,
        platform: sub.platform,
        isSandbox: sub.is_sandbox,
      });
    }

    console.log(`Generated ${notifications.length} weekly digest notifications`);
    console.log(`Stats: ${totalCarbonKg.toFixed(2)}kg CO₂, ${totalKwh.toFixed(2)}kWh, ${greenPercentage}% green`);

    // Actually deliver the push notifications to APNs/FCM
    try {
      await sendPushNotifications(notifications);
    } catch (e) {
      console.error("[PUSH] Error sending push notifications:", e);
    }

    return new Response(
      JSON.stringify({
        success: true,
        day: currentDay,
        dayName: getDayName(currentDay),
        period: periodKey,
        subscriptions_checked: subscriptions?.length || 0,
        already_sent: allSubs.length - dueSubscriptions.length,
        notifications_generated: notifications.length,
        weekly_stats: {
          total_carbon_kg: totalCarbonKg,
          total_kwh: totalKwh,
          avg_intensity: avgIntensity,
          green_percentage: greenPercentage,
          best_hour: `${bestHour.toString().padStart(2, '0')}:00`,
          best_time_today: bestTimeToday,
          footprint_records: footprint?.length || 0,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Weekly Digest Error:', error);
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
