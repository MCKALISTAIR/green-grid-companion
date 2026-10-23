/**
 * Half-hour slot keys for matching readings across APIs (BH-91).
 *
 * The same half-hour arrives in three spellings:
 *   NESO Carbon Intensity  "2026-07-30T22:30Z"           (UTC, no seconds)
 *   Postgres timestamptz   "2026-07-30T22:30:00+00:00"   (via PostgREST)
 *   Octopus consumption    "2026-07-30T23:30:00+01:00"   (UK local offset, +01:00 in BST)
 * Comparing those strings never matches, so every path keys on the instant
 * instead: floor(epoch ms / 30 min). UTC half-hours are unambiguous, so the
 * repeated 01:00-02:00 hour on a clock-change night maps to distinct keys.
 *
 * MIRROR of supabase/functions/_shared/half-hour.ts (the Deno copy). Keep the two
 * in step: src/lib/halfHour.test.ts checks they agree. Keep this file
 * dependency-free.
 */

export const HALF_HOUR_MS = 30 * 60 * 1000;

// An explicit zone is required: a bare "2026-10-25T01:30:00" would be read in
// the server's local zone, which is exactly the ambiguity we are removing.
const ISO_WITH_ZONE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})$/i;

/** Epoch half-hour index for an instant, or null when it can't be read safely. */
export function halfHourKey(value: string | Date | number | null | undefined): number | null {
  let ms: number;
  if (typeof value === 'string') {
    const s = value.trim();
    if (!ISO_WITH_ZONE.test(s)) return null;
    ms = Date.parse(s);
  } else if (value instanceof Date) {
    ms = value.getTime();
  } else if (typeof value === 'number') {
    ms = value;
  } else {
    return null;
  }
  return Number.isFinite(ms) ? Math.floor(ms / HALF_HOUR_MS) : null;
}

/** Canonical UTC ISO string for a half-hour key, e.g. "2026-07-30T22:30:00.000Z". */
export function halfHourKeyToIso(key: number): string {
  return new Date(key * HALF_HOUR_MS).toISOString();
}

/** Canonical UTC ISO for any accepted input, or null. */
export function normaliseHalfHour(value: string | Date | number | null | undefined): string | null {
  const key = halfHourKey(value);
  return key === null ? null : halfHourKeyToIso(key);
}
