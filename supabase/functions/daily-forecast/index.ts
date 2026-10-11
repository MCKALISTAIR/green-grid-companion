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
import { claimSubscriptionsForPeriod, ukDatePeriodKey, type NotificationLogClient } from '../_shared/notification-periods.ts';

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
  is_sandbox: boolean;
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

    const notifications: Array<{ token: string; title: string; body: string; platform: string; isSandbox?: boolean }> = [];

    // Fetch today's and tomorrow's forecast so we always have future windows
    const tomorrow = new Date(now);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);

    const [todayRes, tomorrowRes] = await Promise.all([
      fetch('https://api.carbonintensity.org.uk/intensity/date'),
      fetch(`https://api.carbonintensity.org.uk/intensity/date/${tomorrowStr}`),
    ]);

    if (!todayRes.ok) {
      throw new Error('Failed to fetch today forecast data');
    }

    const todayData = await todayRes.json();
    const todayForecasts: ForecastData[] = todayData.data || [];

    let tomorrowForecasts: ForecastData[] = [];
    if (tomorrowRes.ok) {
      const tomorrowData = await tomorrowRes.json();
      tomorrowForecasts = tomorrowData.data || [];
    }

    // All forecasts for stats, but only future slots for best/worst windows
    const allForecasts = [...todayForecasts, ...tomorrowForecasts];
    const futureForecasts = allForecasts.filter(f => new Date(f.to) > now);

    // Calculate today's overall stats (for context)
    let totalIntensity = 0;
    let greenSlots = 0;
    for (const forecast of todayForecasts) {
      totalIntensity += forecast.intensity.forecast;
      const idx = forecast.intensity.index.toLowerCase();
      if (idx === 'low' || idx === 'very low') {
        greenSlots++;
      }
    }

    const avgIntensity = todayForecasts.length > 0
      ? Math.round(totalIntensity / todayForecasts.length)
      : 0;
    const greenHours = Math.round(greenSlots / 2);

    // Find best/worst from FUTURE slots only
    let bestTime: ForecastData | null = null;
    let worstTime: ForecastData | null = null;

    for (const forecast of futureForecasts) {
      if (!bestTime || forecast.intensity.forecast < bestTime.intensity.forecast) {
        bestTime = forecast;
      }
      if (!worstTime || forecast.intensity.forecast > worstTime.intensity.forecast) {
        worstTime = forecast;
      }
    }

    // Helper: format time in UK timezone and add "tomorrow" if needed
    function formatUKTime(isoStr: string): string {
      const d = new Date(isoStr);
      const ukH = (d.getUTCHours() + ukOffset) % 24;
      const ukM = d.getUTCMinutes();
      return `${ukH.toString().padStart(2, '0')}:${ukM.toString().padStart(2, '0')}`;
    }

    function isTomorrowSlot(isoStr: string): boolean {
      const d = new Date(isoStr);
      // Adjust to UK date
      const ukDate = new Date(d.getTime() + ukOffset * 60 * 60 * 1000);
      const nowUK = new Date(now.getTime() + ukOffset * 60 * 60 * 1000);
      return ukDate.getUTCDate() !== nowUK.getUTCDate()
        || ukDate.getUTCMonth() !== nowUK.getUTCMonth();
    }

    // Idempotency: claim each subscription for today's UK date before sending
    // so a duplicate/replayed run never sends the same outlook twice.
    const periodKey = ukDatePeriodKey(now, ukOffset);
    const claimed = await claimSubscriptionsForPeriod(
      supabase as unknown as NotificationLogClient,
      'daily-forecast',
      periodKey,
      (subscriptions as PushSubscription[]).map((s) => s.id),
    );
    const dueSubscriptions = (subscriptions as PushSubscription[]).filter((s) => claimed.has(s.id));
    console.log(`Daily forecast ${periodKey}: ${dueSubscriptions.length} due, ${subscriptions.length - dueSubscriptions.length} already sent`);

    // Generate notification for each subscription
    for (const sub of dueSubscriptions) {
      const emoji = avgIntensity < 100 ? '🌿' : avgIntensity < 200 ? '☁️' : '🏭';

      // Find the best consecutive green window (contiguous slots at or below best intensity + 20g tolerance)
      let bestWindowStart = bestTime?.from || '';
      let bestWindowEnd = bestTime?.to || '';
      if (bestTime && futureForecasts.length > 0) {
        const threshold = bestTime.intensity.forecast + 20;
        const bestIdx = futureForecasts.indexOf(bestTime);
        let startIdx = bestIdx;
        let endIdx = bestIdx;
        // Expand backward while adjacent and within threshold
        while (startIdx > 0 && futureForecasts[startIdx - 1].intensity.forecast <= threshold) {
          startIdx--;
        }
        // Expand forward while adjacent and within threshold
        while (endIdx < futureForecasts.length - 1 && futureForecasts[endIdx + 1].intensity.forecast <= threshold) {
          endIdx++;
        }
        bestWindowStart = futureForecasts[startIdx].from;
        bestWindowEnd = futureForecasts[endIdx].to;
      }

      const bestStartFmt = formatUKTime(bestWindowStart);
      const bestEndFmt = formatUKTime(bestWindowEnd);
      const bestDurationH = Math.round((new Date(bestWindowEnd).getTime() - new Date(bestWindowStart).getTime()) / (1000 * 60 * 60));
      const bestLabel = bestTime && isTomorrowSlot(bestWindowStart) ? ', tomorrow' : '';
      const worstFmt = worstTime ? formatUKTime(worstTime.from) : 'N/A';
      const worstLabel = worstTime && isTomorrowSlot(worstTime.from) ? ' (tomorrow)' : '';

      notifications.push({
        token: sub.device_token,
        title: `🌅 Daily Energy Outlook`,
        body: [
          `Today's average: ${avgIntensity}g CO₂/kWh.`,
          `${greenHours}h of green energy expected 🌿`,
          `Best window: ${bestStartFmt}–${bestEndFmt} (${bestDurationH}h${bestLabel})`,
          worstTime ? `· Worst: ${worstFmt}${worstLabel} (${worstTime.intensity.forecast}g CO₂/kWh)` : ''
        ].filter(Boolean).join(' '),
        platform: sub.platform,
        isSandbox: sub.is_sandbox,
      });
    }

    console.log(`Sending ${notifications.length} daily forecast notifications`);

    // Actually deliver the push notifications to APNs/FCM
    try {
      await sendPushNotifications(notifications);
    } catch (e) {
      console.error("[PUSH] Error sending push notifications:", e);
    }

    return new Response(
      JSON.stringify({
        success: true,
        ukTime: `${currentHour}:${ukMinute.toString().padStart(2, '0')}`,
        isDST: ukOffset === 1,
        checked: allSubscriptions?.length || 0,
        filtered: subscriptions.length,
        period: periodKey,
        already_sent: subscriptions.length - dueSubscriptions.length,
        notifications: notifications.length,
        avgIntensity,
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
