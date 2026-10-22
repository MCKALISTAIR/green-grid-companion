/**
 * Which carbon-intensity reading a push alert may quote for a subscriber.
 *
 * Rules (BH-02):
 * - Regional subscribers (an outward code like "EX4") get NESO's reading for
 *   that outward code (/regional/postcode/{outcode}), which is NESO's own
 *   outcode → region mapping. Never a first-letter guess.
 * - If that regional read fails, return null: the caller sends nothing and
 *   leaves alert state alone. Never substitute the national figure as if it
 *   were the user's region.
 * - Subscribers in GB-average mode ("GB") get the national reading, labelled
 *   as the GB average.
 *
 * Pure apart from the injected fetch, so Vitest can test it.
 */
import {
  fetchNationalIntensity,
  toIntensityReading,
  type IntensityReading,
} from './intensity-reading.ts';
import { NATIONAL_POSTCODE, normalizeSubscriptionPostcode } from './subscription-postcode.ts';

export interface AlertReading extends IntensityReading {
  scope: 'regional' | 'national';
  /** NESO region shortname for regional readings, e.g. "South West England". */
  regionName?: string;
}

type Log = (message: string, detail?: unknown) => void;

/** Parse GET /regional/postcode/{outcode}: { data: [{ shortname, data: [{ intensity }] }] }. */
export function parseRegionalPostcodeIntensity(
  json: unknown,
): { reading: IntensityReading; regionName: string } | null {
  const region = (
    json as { data?: Array<{ shortname?: unknown; data?: Array<{ intensity?: unknown }> }> }
  )?.data?.[0];
  if (!region || typeof region.shortname !== 'string' || !region.shortname.trim()) return null;
  const reading = toIntensityReading(region.data?.[0]?.intensity);
  if (!reading) return null;
  return { reading, regionName: region.shortname.trim() };
}

export async function fetchRegionalIntensityForOutcode(
  outcode: string,
  fetchFn: typeof fetch = fetch,
  log: Log = console.warn,
): Promise<{ reading: IntensityReading; regionName: string } | null> {
  try {
    const response = await fetchFn(
      `https://api.carbonintensity.org.uk/regional/postcode/${encodeURIComponent(outcode)}`,
    );
    if (!response.ok) {
      log(
        `[INTENSITY] Regional fetch for ${outcode} failed with HTTP ${response.status}; skipping`,
      );
      return null;
    }
    const parsed = parseRegionalPostcodeIntensity(await response.json());
    if (!parsed)
      log(`[INTENSITY] Regional reading for ${outcode} was missing or malformed; skipping`);
    return parsed;
  } catch (error) {
    log(`[INTENSITY] Regional fetch for ${outcode} threw; skipping`, error);
    return null;
  }
}

/**
 * Channel Islands (GY, JE), Isle of Man (IM), Northern Ireland (BT) and forces
 * (BFPO) addresses are not on the GB grid. Older app builds could save these,
 * and NESO's lookup has mapped GY1 to South Scotland, so never alert on them
 * with another region's figure: skip.
 */
export function isOffGridOutcode(key: string): boolean {
  const v = key.trim();
  return /^(GY|JE|IM|BT)\d/i.test(v) || /^BFPO\s*\d/i.test(v);
}

/**
 * Returns a per-run resolver (cached per outward code, and the national
 * reading fetched at most once). null = no trustworthy reading: skip.
 */
export function createAlertReadingResolver(
  fetchFn: typeof fetch = fetch,
  log: Log = console.warn,
): (postcode: string) => Promise<AlertReading | null> {
  const cache = new Map<string, Promise<AlertReading | null>>();
  return (postcode: string) => {
    if (isOffGridOutcode(postcode)) {
      log(`[INTENSITY] Subscription postcode is not on the GB grid (GY/JE/IM/BT/BFPO); skipping`);
      return Promise.resolve(null);
    }
    const key = normalizeSubscriptionPostcode(postcode);
    if (!key) {
      log(`[INTENSITY] Unusable subscription postcode; skipping`);
      return Promise.resolve(null);
    }
    if (isOffGridOutcode(key)) {
      log(`[INTENSITY] ${key} is not on the GB grid (GY/JE/IM/BT/BFPO); skipping`);
      return Promise.resolve(null);
    }
    let pending = cache.get(key);
    if (!pending) {
      pending =
        key === NATIONAL_POSTCODE
          ? fetchNationalIntensity(fetchFn, log).then((r) =>
              r ? { ...r, scope: 'national' as const } : null,
            )
          : fetchRegionalIntensityForOutcode(key, fetchFn, log).then((r) =>
              r ? { ...r.reading, scope: 'regional' as const, regionName: r.regionName } : null,
            );
      cache.set(key, pending);
    }
    return pending;
  };
}

/** Where the number is from, for the start of an alert title. */
export function alertPlaceLabel(reading: AlertReading): string {
  return reading.scope === 'national' ? 'GB average' : (reading.regionName ?? 'Your region');
}
