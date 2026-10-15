/**
 * Parse one half-hour from the NESO Carbon Intensity API for footprint maths.
 *
 * Returns null (caller skips that half-hour) when the API gave no usable number
 * or band, instead of inventing 0 gCO2/kWh or a 'moderate' band. A skipped
 * half-hour simply has no footprint row until a later sync finds real data.
 */
export interface IntensityPoint {
  intensity: number;
  index: string;
}

const BANDS = new Set(['very low', 'low', 'moderate', 'high', 'very high']);

export function parseIntensityPoint(item: unknown): IntensityPoint | null {
  const raw = (
    item as { intensity?: { actual?: unknown; forecast?: unknown; index?: unknown } } | null
  )?.intensity;
  if (!raw) return null;
  const value = [raw.actual, raw.forecast].find(
    (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0,
  ) as number | undefined;
  const index = typeof raw.index === 'string' ? raw.index.toLowerCase() : null;
  if (value === undefined || !index || !BANDS.has(index)) return null;
  return { intensity: value, index };
}
