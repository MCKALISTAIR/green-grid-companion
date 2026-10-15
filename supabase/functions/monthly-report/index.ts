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
import {
  claimSubscriptionsForPeriod,
  monthPeriodKey,
  type NotificationLogClient,
} from '../_shared/notification-periods.ts';

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
  monthly_report_enabled: boolean;
  monthly_report_day: number;
  platform: string;
  is_sandbox: boolean;
}

interface WeeklyData {
  week: number;
  weekLabel: string;
  carbon_kg: number;
  kwh: number;
  avgIntensity: number;
  greenPercentage: number;
}

function getMonthName(month: number): string {
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  return months[month] || 'Unknown';
}

function getIntensityEmoji(avgIntensity: number): string {
  if (avgIntensity < 100) return '🌿';
  if (avgIntensity < 150) return '🍃';
  if (avgIntensity < 200) return '☁️';
  if (avgIntensity < 250) return '🏭';
  return '💨';
}

function getWeekOfMonth(date: Date): number {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  return Math.ceil((date.getDate() + firstDay.getDay()) / 7);
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

    // Get current date info
    const now = new Date();
    const currentDay = now.getUTCDate();
    const lastMonth = now.getUTCMonth() === 0 ? 11 : now.getUTCMonth() - 1;
    const lastMonthYear = now.getUTCMonth() === 0 ? now.getUTCFullYear() - 1 : now.getUTCFullYear();

    console.log(
      `Monthly Report - Running on day ${currentDay} for ${getMonthName(lastMonth)} ${lastMonthYear}`,
    );

    // Get subscriptions that should receive monthly report today
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('monthly_report_enabled', true)
      .eq('monthly_report_day', currentDay);

    if (subError) {
      console.error('Error fetching subscriptions:', subError);
      throw subError;
    }

    console.log(`Found ${subscriptions?.length || 0} subscriptions for monthly report`);

    // Calculate date range for last month
    const monthStart = new Date(lastMonthYear, lastMonth, 1);
    const monthEnd = new Date(lastMonthYear, lastMonth + 1, 0, 23, 59, 59);

    // Fetch footprint data for the past month
    const { data: footprint, error: footprintError } = await supabase
      .from('carbon_footprint')
      .select('*')
      .gte('interval_start', monthStart.toISOString())
      .lte('interval_start', monthEnd.toISOString())
      .order('interval_start', { ascending: true });

    if (footprintError) {
      console.error('Error fetching footprint:', footprintError);
    }

    // Calculate monthly stats
    let totalCarbonG = 0;
    let totalKwh = 0;
    let totalIntensity = 0;
    const byIndex: Record<string, { count: number; carbon_g: number; kwh: number }> = {};
    const weeklyBreakdown: Record<
      number,
      { carbon_g: number; kwh: number; intensity: number; count: number; greenCount: number }
    > = {};

    for (const record of (footprint || []) as FootprintRecord[]) {
      const recordDate = new Date(record.interval_start);
      const weekNum = getWeekOfMonth(recordDate);

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

      // Weekly breakdown
      if (!weeklyBreakdown[weekNum]) {
        weeklyBreakdown[weekNum] = { carbon_g: 0, kwh: 0, intensity: 0, count: 0, greenCount: 0 };
      }
      weeklyBreakdown[weekNum].carbon_g += Number(record.carbon_g);
      weeklyBreakdown[weekNum].kwh += Number(record.consumption_kwh);
      weeklyBreakdown[weekNum].intensity += record.intensity_gco2_kwh;
      weeklyBreakdown[weekNum].count++;
      if (idx === 'very low' || idx === 'low') {
        weeklyBreakdown[weekNum].greenCount++;
      }
    }

    const avgIntensity = footprint?.length ? Math.round(totalIntensity / footprint.length) : 0;
    const totalCarbonKg = totalCarbonG / 1000;

    // Calculate green energy percentage
    const greenCount = (byIndex['very low']?.count || 0) + (byIndex['low']?.count || 0);
    const totalCount = footprint?.length || 1;
    const greenPercentage = Math.round((greenCount / totalCount) * 100);

    // Build weekly trend data
    const weeklyData: WeeklyData[] = Object.entries(weeklyBreakdown)
      .map(([week, data]) => ({
        week: parseInt(week),
        weekLabel: `Week ${week}`,
        carbon_kg: Number((data.carbon_g / 1000).toFixed(2)),
        kwh: Number(data.kwh.toFixed(2)),
        avgIntensity: data.count > 0 ? Math.round(data.intensity / data.count) : 0,
        greenPercentage: data.count > 0 ? Math.round((data.greenCount / data.count) * 100) : 0,
      }))
      .sort((a, b) => a.week - b.week);

    // Find best and worst weeks
    let bestWeek: WeeklyData | null = null;
    let worstWeek: WeeklyData | null = null;
    for (const week of weeklyData) {
      if (!bestWeek || week.avgIntensity < bestWeek.avgIntensity) {
        bestWeek = week;
      }
      if (!worstWeek || week.avgIntensity > worstWeek.avgIntensity) {
        worstWeek = week;
      }
    }

    // Find best time of day
    const hourlyUsage: Record<number, { count: number; avgIntensity: number }> = {};
    for (const record of (footprint || []) as FootprintRecord[]) {
      const hour = new Date(record.interval_start).getUTCHours();
      if (!hourlyUsage[hour]) {
        hourlyUsage[hour] = { count: 0, avgIntensity: 0 };
      }
      hourlyUsage[hour].count++;
      hourlyUsage[hour].avgIntensity += record.intensity_gco2_kwh;
    }

    let bestHour = 0;
    let bestAvg = Infinity;
    for (const [hour, data] of Object.entries(hourlyUsage)) {
      const avg = data.avgIntensity / data.count;
      if (avg < bestAvg) {
        bestAvg = avg;
        bestHour = parseInt(hour);
      }
    }

    // Calculate month-over-month comparison (we'd need previous month data for this)
    // For now, we'll just provide the current month stats

    const notifications: Array<{
      token: string;
      title: string;
      body: string;
      platform: string;
      isSandbox?: boolean;
    }> = [];

    // Idempotency: claim each subscription for the reported month before
    // sending so a duplicate/replayed run never sends the same report twice.
    const periodKey = monthPeriodKey(lastMonthYear, lastMonth);
    const allSubs = (subscriptions || []) as PushSubscription[];
    const claimed = await claimSubscriptionsForPeriod(
      supabase as unknown as NotificationLogClient,
      'monthly-report',
      periodKey,
      allSubs.map((s) => s.id),
    );
    const dueSubscriptions = allSubs.filter((s) => claimed.has(s.id));
    console.log(
      `Monthly report ${periodKey}: ${dueSubscriptions.length} due, ${allSubs.length - dueSubscriptions.length} already sent`,
    );

    // Generate notification for each subscription
    for (const sub of dueSubscriptions) {
      const emoji = getIntensityEmoji(avgIntensity);

      let body: string;
      if (footprint && footprint.length > 0) {
        body =
          `📊 ${getMonthName(lastMonth)}: ${totalCarbonKg.toFixed(1)}kg CO₂ from ${totalKwh.toFixed(1)}kWh. ` +
          `${greenPercentage}% green! ` +
          `Best: ${bestWeek?.weekLabel || 'N/A'} (${bestWeek?.greenPercentage || 0}% green)`;
      } else {
        body =
          `📊 Your ${getMonthName(lastMonth)} report is ready! ` +
          `Link your Octopus meter for detailed carbon insights.`;
      }

      notifications.push({
        token: sub.device_token,
        title: `${emoji} ${getMonthName(lastMonth)} Carbon Report`,
        body,
        platform: sub.platform,
        isSandbox: sub.is_sandbox,
      });
    }

    console.log(`Generated ${notifications.length} monthly report notifications`);
    console.log(
      `Stats: ${totalCarbonKg.toFixed(2)}kg CO₂, ${totalKwh.toFixed(2)}kWh, ${greenPercentage}% green`,
    );

    // Actually deliver the push notifications to APNs/FCM
    try {
      await sendPushNotifications(notifications);
    } catch (e) {
      console.error('[PUSH] Error sending push notifications:', e);
    }

    return new Response(
      JSON.stringify({
        success: true,
        month: lastMonth,
        monthName: getMonthName(lastMonth),
        year: lastMonthYear,
        period: periodKey,
        subscriptions_checked: subscriptions?.length || 0,
        already_sent: allSubs.length - dueSubscriptions.length,
        notifications_generated: notifications.length,
        monthly_stats: {
          total_carbon_kg: totalCarbonKg,
          total_kwh: totalKwh,
          avg_intensity: avgIntensity,
          green_percentage: greenPercentage,
          best_hour: `${bestHour.toString().padStart(2, '0')}:00`,
          footprint_records: footprint?.length || 0,
          weekly_trend: weeklyData,
          best_week: bestWeek,
          worst_week: worstWeek,
          by_intensity: Object.entries(byIndex).map(([index, data]) => ({
            index,
            kwh: Number(data.kwh.toFixed(2)),
            carbon_kg: Number((data.carbon_g / 1000).toFixed(2)),
            percentage: Math.round((data.count / totalCount) * 100),
          })),
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('Monthly Report Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
