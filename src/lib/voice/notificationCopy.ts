/**
 * Local notification copy (this device). Number first, joke second, no em
 * dashes, times in Europe/London. Titles stay under ~40 characters.
 * Cheeky only adds a flavour line to the body; titles, numbers, times and
 * thresholds are the same in both tones.
 */
import { formatLondonTime } from '@/lib/londonTime';
import type { CommentaryTone } from '@/lib/tone';

export const UNIT = 'gCO₂/kWh';

export interface NotificationText {
  title: string;
  body: string;
}

/** Background check: the current half hour is under the user's clean alert. */
export function liveCleanNotification(n: number, threshold: number, tone: CommentaryTone): NotificationText {
  return {
    title: `Clean grid now: ${n} ${UNIT}`,
    body:
      tone === 'cheeky'
        ? `That's under your ${threshold} ${UNIT} alert. The grid's showing off.`
        : `That's under your ${threshold} ${UNIT} alert. A good time for big loads.`,
  };
}

/** Scheduled: the forecast drops under the user's clean alert at `start`. */
export function cleanWindowNotification(
  start: Date,
  n: number,
  threshold: number,
  tone: CommentaryTone,
): NotificationText {
  const base = `${n} ${UNIT} forecast, under your ${threshold} ${UNIT} alert.`;
  return {
    title: `Clean window from ${formatLondonTime(start)}`,
    body: tone === 'cheeky' ? `${base} The washing's been waiting for this.` : `${base} A good time for big loads.`,
  };
}

/** Scheduled: the forecast rises over the user's high alert at `start`. */
export function highWindowNotification(
  start: Date,
  n: number,
  threshold: number,
  tone: CommentaryTone,
): NotificationText {
  const base = `${n} ${UNIT} forecast, over your ${threshold} ${UNIT} alert.`;
  return {
    title: `Dirtier grid from ${formatLondonTime(start)}`,
    body: tone === 'cheeky' ? `${base} If something can wait, let it.` : `${base} Worth delaying big loads if you can.`,
  };
}

export const DAILY_OUTLOOK_TITLE = "Today's grid outlook";

/** Body for the daily outlook. All figures come from the forecast slots for the day. */
export function dailyOutlookBody(opts: {
  avg: number;
  cleanHours: number;
  threshold: number;
  best: { start: Date; end: Date; hours: number } | null;
}): string {
  const { avg, cleanHours, threshold, best } = opts;
  const hours = cleanHours === 1 ? '1 hour' : `${cleanHours} hours`;
  const clean =
    cleanHours > 0
      ? `${hours} under your ${threshold} ${UNIT} alert.`
      : `No half hours under your ${threshold} ${UNIT} alert today.`;
  const window = best
    ? ` Cleanest stretch: ${formatLondonTime(best.start)} to ${formatLondonTime(best.end)}.`
    : '';
  return `Average forecast today: ${avg} ${UNIT}. ${clean}${window}`;
}

export const NO_DAILY_FORECAST_BODY = "Today's forecast isn't in yet. Open GridSense to check.";

export const TEST_NOTIFICATION: NotificationText = {
  title: 'GridSense test',
  body: 'Notifications are working.',
};
