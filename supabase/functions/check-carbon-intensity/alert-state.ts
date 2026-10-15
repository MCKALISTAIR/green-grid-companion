/**
 * Alert state with hysteresis, so an intensity hovering around a threshold
 * doesn't flip "clean" / "over" every 30-minute run.
 *
 * Entering the alerted state uses the plain threshold (same as before).
 * Leaving it needs the reading to clear the threshold by the buffer:
 * max(HYSTERESIS_MIN_G, threshold × HYSTERESIS_FRACTION).
 */
export const HYSTERESIS_MIN_G = 10;
export const HYSTERESIS_FRACTION = 0.1;

export function hysteresisBuffer(threshold: number): number {
  return Math.max(HYSTERESIS_MIN_G, Math.round(threshold * HYSTERESIS_FRACTION));
}

/** Low alert: 'below' = at or under the user's clean threshold. */
export function nextLowState(
  intensity: number,
  threshold: number,
  previous: string | null | undefined,
): 'below' | 'above' {
  if (intensity <= threshold) return 'below';
  if (previous === 'below' && intensity <= threshold + hysteresisBuffer(threshold)) return 'below';
  return 'above';
}

/** High alert: 'above' = at or over the user's dirty threshold. */
export function nextHighState(
  intensity: number,
  threshold: number,
  previous: string | null | undefined,
): 'above' | 'below' {
  if (intensity >= threshold) return 'above';
  if (previous === 'above' && intensity >= threshold - hysteresisBuffer(threshold)) return 'above';
  return 'below';
}
