import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { sendPushNotifications } from '../_shared/push.ts';
import { formatUKTime, isTomorrowUK } from '../_shared/uk-time.ts';
import {
  verifySchedulerRequest,
  cronAuthErrorResponse,
  createSchedulerSecretProvider,
  fetchSchedulerSecret,
  type SchedulerSecretRpcClient,
} from '../_shared/cron-auth.ts';
import {
  claimSubscriptionsForPeriod,
  type NotificationLogClient,
} from '../_shared/notification-periods.ts';
import { greenWindow, usableForecast } from '../_shared/forecast-window.ts';
import { londonWallClock, selectDueSubscriptions } from '../_shared/daily-forecast-schedule.ts';

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

  return date >= marchLastSunday && date < octoberLastSunday ? 1 : 0;
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

    // BH-69/70: cron runs every 15 min; pick subscriptions whose London wall
    // time has passed (first run at or after it), with per-day claims below.
    const now = new Date();
    const ukOffset = getUKOffset(now);
    const wall = londonWallClock(now);

    const { data: allSubscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('daily_forecast_enabled', true);

    if (subError) {
      throw subError;
    }

    const dueBySlot = selectDueSubscriptions((allSubscriptions || []) as PushSubscription[], now);
    const subscriptions = dueBySlot.map((d) => d.sub);

    const notifications: Array<{
      token: string;
      title: string;
      body: string;
      platform: string;
      isSandbox?: boolean;
    }> = [];

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
    const todayForecasts: ForecastData[] = usableForecast(todayData.data || []);

    let tomorrowForecasts: ForecastData[] = [];
    if (tomorrowRes.ok) {
      const tomorrowData = await tomorrowRes.json();
      tomorrowForecasts = tomorrowData.data || [];
    }

    // All forecasts for stats, but only future slots for best/worst windows
    const allForecasts = [...todayForecasts, ...tomorrowForecasts];
    const futureForecasts = usableForecast(allForecasts).filter((f) => new Date(f.to) > now);

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

    const avgIntensity =
      todayForecasts.length > 0 ? Math.round(totalIntensity / todayForecasts.length) : 0;
    const greenHours = greenSlots / 2;

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

    // BH-33: format each slot in Europe/London (per-slot offset, DST-safe).
    const isTomorrowSlot = (isoStr: string) => isTomorrowUK(isoStr, now);

    // Idempotency: claim each subscription for its slot's London date before
    // sending, so a repeated hour (25 Oct) or replayed run never sends twice.
    const periodKey = wall.date;
    const byPeriod = new Map<string, string[]>();
    for (const d of dueBySlot) {
      byPeriod.set(d.periodKey, [...(byPeriod.get(d.periodKey) ?? []), d.sub.id]);
    }
    const claimed = new Set<string>();
    for (const [key, ids] of byPeriod) {
      const got = await claimSubscriptionsForPeriod(
        supabase as unknown as NotificationLogClient,
        'daily-forecast',
        key,
        ids,
      );
      got.forEach((id) => claimed.add(id));
    }
    const dueSubscriptions = subscriptions.filter((s) => claimed.has(s.id));
    console.log(
      `Daily forecast ${periodKey}: ${dueSubscriptions.length} due, ${subscriptions.length - dueSubscriptions.length} already sent`,
    );

    // Generate notification for each subscription
    for (const sub of dueSubscriptions) {
      // Find the best consecutive green window (contiguous slots at or below best intensity + 20g tolerance)
      let bestWindowStart = bestTime?.from || '';
      let bestWindowEnd = bestTime?.to || '';
      if (bestTime) {
        const window = greenWindow(futureForecasts, bestTime);
        bestWindowStart = window?.from ?? bestWindowStart;
        bestWindowEnd = window?.to ?? bestWindowEnd;
      }

      const bestStartFmt = formatUKTime(bestWindowStart);
      const bestEndFmt = formatUKTime(bestWindowEnd);
      const bestDurationH =
        (new Date(bestWindowEnd).getTime() - new Date(bestWindowStart).getTime()) /
        (1000 * 60 * 60);
      const bestLabel = bestTime && isTomorrowSlot(bestWindowStart) ? ', tomorrow' : '';
      const worstFmt = worstTime ? formatUKTime(worstTime.from) : 'N/A';
      const worstLabel = worstTime && isTomorrowSlot(worstTime.from) ? ' (tomorrow)' : '';

      notifications.push({
        token: sub.device_token,
        title: `Today's grid outlook`,
        body: [
          `Average forecast today: ${avgIntensity} gCO₂/kWh.`,
          `${greenHours === 1 ? '1 hour' : `${greenHours} hours`} forecast low or very low.`,
          `Best window: ${bestStartFmt} to ${bestEndFmt} (${bestDurationH}h${bestLabel}).`,
          worstTime
            ? `Dirtiest: ${worstFmt}${worstLabel} (${worstTime.intensity.forecast} gCO₂/kWh).`
            : '',
        ]
          .filter(Boolean)
          .join(' '),
        platform: sub.platform,
        isSandbox: sub.is_sandbox,
      });
    }

    console.log(`Sending ${notifications.length} daily forecast notifications`);

    // Actually deliver the push notifications to APNs/FCM
    try {
      await sendPushNotifications(notifications);
    } catch (e) {
      console.error('[PUSH] Error sending push notifications:', e);
    }

    return new Response(
      JSON.stringify({
        success: true,
        ukTime: `${String(Math.floor(wall.minutes / 60)).padStart(2, '0')}:${String(wall.minutes % 60).padStart(2, '0')}`,
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
