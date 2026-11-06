/**
 * History "Trend" card: start vs end of the selected range.
 *
 * Flat threshold: a change of at most max(1 g, 2% of the start value) is "about
 * the same". Forecasts are whole grams, so 1 g is the smallest step and pure
 * rounding noise at low intensities (13 → 12 g is not "improving"). At typical
 * intensities (150–300 g) 2% (3–6 g) is well inside the regional forecast's
 * half-hour jitter, so it isn't a real direction either. Using whichever is
 * larger keeps both ends honest.
 */
export type HistoryTrend = 'improving' | 'worsening' | 'flat';

export const FLAT_ABS_G = 1;
export const FLAT_REL = 0.02;

export function classifyHistoryTrend(startVal: number, endVal: number): HistoryTrend {
  const delta = endVal - startVal;
  const tolerance = Math.max(FLAT_ABS_G, Math.abs(startVal) * FLAT_REL);
  if (Math.abs(delta) <= tolerance) return 'flat';
  return delta < 0 ? 'improving' : 'worsening';
}

/** Copy for Design review (GridSense Design owns voice). */
export function historyTrendCopy(trend: HistoryTrend, range: '24h' | '7d'): string {
  if (trend === 'flat')
    return range === '7d'
      ? 'About the same as the start of the week'
      : 'About the same as the start of the day';
  return trend === 'improving' ? 'Lower than at the start' : 'Higher than at the start';
}
