import type { CommentaryTone } from '@/lib/tone';

/** BH-30: regional figures are NESO forecasts of power made in the region, so
 * never say "right now" about them. Copy: MISLEAD-COPY.md BH-30. */
export function zeroCarbonBadgeText(isRegional: boolean, tone: CommentaryTone): string {
  if (!isRegional) return 'GB grid: 0 g this half hour';
  return tone === 'plain'
    ? 'NESO forecast: 0 g here this half hour'
    : 'Forecast: 0 g here this half hour';
}
