/** Indicator travel at which a release refreshes (~110pt of finger travel). */
export const PTR_THRESHOLD = 72;
/** Max indicator travel. */
export const PTR_MAX = 120;
/** Where the indicator rests while refreshing. */
export const PTR_HOLD = 56;

/**
 * Resistance curve, shape from the motion spec (§2.4): d = k·dy / (1 + dy/600), capped.
 * The spec's k = 0.55 would need ~167pt of finger travel to reach 72pt, which
 * contradicts its own "~110pt finger" target; k = 0.775 puts the line at 110pt.
 */
const PTR_K = 0.775;
export function ptrResistance(dy: number): number {
  if (dy <= 0) return 0;
  return Math.min(PTR_MAX, (PTR_K * dy) / (1 + dy / 600));
}
