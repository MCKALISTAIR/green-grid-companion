/**
 * Copy for the spec v1.0 home, day sheet, Planner and History (spec §10).
 * Tone-specific lines (band lines, Now-or-wait tails) live in the voice
 * modules from #49 (conditionLabels.ts, voice/nowOrWaitVoice.ts); these
 * strings are the same in both tones unless named Cheeky/Plain.
 */
import type { ForecastData } from '@/lib/carbonApi';

export type Band = ForecastData['intensity']['index'];

export function bandLabel(band: Band | null | undefined): string {
  if (!band) return '';
  return band[0].toUpperCase() + band.slice(1);
}

export const COPY = {
  basis: 'Based on a 3-hour load, like a wash cycle or the dishwasher.',
  chartTitle: 'Next 24 hours',
  chartSubtitle: (region: string) => `${region} forecast \u00b7 drag to explore`,
  chartCaption: 'Shaded: the cleanest 3-hour start in the next 18 hours, same as Now or wait.',
  chartZero: 'Zero carbon for the whole forecast.',
  chartSteady: (n: number) => `Steady at ${n} for the whole forecast.`,
  chartNoWindow: 'No best window to shade: every half hour is the same.',
  chartRunsTo: (t: string) => `Forecast runs to ${t}.`,
  credit: 'Carbon data: NESO Carbon Intensity API (CC BY 4.0). Forecasts and estimates, not advice.',
  zeroBadge: 'Zero-carbon power right now',
  info: "This is your region's forecast for this half hour, in grams of CO\u2082 per kWh. NESO updates it every 30 minutes.",
  loadingCheeky: 'Checking your grid\u2026',
  loadingPlain: 'Loading grid data\u2026',
  offlineCached: (t: string) => `You're offline. Showing the last figures we saved, from ${t}.`,
  offlineNoCache: "You're offline. We'll fetch your number when you're back.",
  serviceError: "Can't reach the grid data",
  tryAgain: 'Try again',
  stale: (t: string) => `From ${t}. Pull down to refresh.`,
  sameHalfHour: (t: string) => `Same half hour, same number. Next update around ${t}.`,
  updating: 'Updating\u2026',
} as const;
