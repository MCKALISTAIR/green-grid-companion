/**
 * Validated carbon-intensity readings for server-side notifications.
 *
 * Push alerts must only ever quote a real NESO figure. If a value is missing or
 * malformed, callers get null and must skip sending (never substitute a default
 * like 200 / 'moderate').
 */

export interface IntensityReading {
  intensity: number;
  index: string;
}

const VALID_INDEXES = new Set(['very low', 'low', 'moderate', 'high', 'very high']);

/**
 * Returns a reading only if a usable intensity number and index are present.
 * Prefers NESO's published `actual` when the current half-hour has one;
 * otherwise uses `forecast` (regional endpoints usually only publish forecast).
 */
export function toIntensityReading(raw: unknown): IntensityReading | null {
  if (!raw || typeof raw !== 'object') return null;
  const { forecast, actual, index } = raw as {
    forecast?: unknown;
    actual?: unknown;
    index?: unknown;
  };
  const value = [actual, forecast].find(
    (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0,
  ) as number | undefined;
  if (value === undefined) return null;
  if (typeof index !== 'string' || !VALID_INDEXES.has(index.toLowerCase())) return null;
  return { intensity: Math.round(value), index: index.toLowerCase() };
}

/** Parse the body of GET https://api.carbonintensity.org.uk/intensity. */
export function parseNationalIntensity(json: unknown): IntensityReading | null {
  const data = (json as { data?: Array<{ intensity?: unknown }> } | null)?.data;
  if (!Array.isArray(data) || data.length === 0) return null;
  return toIntensityReading(data[0]?.intensity);
}

/**
 * Fetch the current national reading. Returns null (and logs) on any HTTP,
 * network or shape problem so the caller can skip notifications.
 */
export async function fetchNationalIntensity(
  fetchFn: typeof fetch = fetch,
  log: (message: string, detail?: unknown) => void = console.warn,
): Promise<IntensityReading | null> {
  try {
    const response = await fetchFn('https://api.carbonintensity.org.uk/intensity');
    if (!response.ok) {
      log(
        `[INTENSITY] National fetch failed with HTTP ${response.status}; skipping national-fallback alerts`,
      );
      return null;
    }
    const reading = parseNationalIntensity(await response.json());
    if (!reading)
      log(
        '[INTENSITY] National response had no valid forecast/index; skipping national-fallback alerts',
      );
    return reading;
  } catch (error) {
    log('[INTENSITY] National fetch threw; skipping national-fallback alerts', error);
    return null;
  }
}
