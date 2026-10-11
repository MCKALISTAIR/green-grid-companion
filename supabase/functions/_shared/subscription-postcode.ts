/**
 * Postcode handling for push-subscriptions.
 *
 * Since #52 the app only keeps the outward code ("SW1A", "EH1"), plus "GB" for
 * the GB-average (national) mode. A full postcode is never required. If an
 * older client still sends one, only its outward code is stored.
 *
 * Pure (no Deno APIs) so Vitest can test it. Mirrors src/lib/postcode.ts.
 */

const FULL_RE = /^([A-Z]{1,2}\d[A-Z\d]?)\s*(\d[A-Z]{2})$/i;
const OUTWARD_RE = /^[A-Z]{1,2}\d[A-Z\d]?$/i;
export const NATIONAL_POSTCODE = 'GB';

/**
 * Value to store for a subscription's location, or null if it isn't one we accept.
 * "sw1a" → "SW1A", "SW1A 1AA" → "SW1A", "gb" → "GB", "Scotland"/"" → null.
 */
export function normalizeSubscriptionPostcode(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const v = input.trim();
  if (!v || v.length > 10) return null;
  if (v.toUpperCase() === NATIONAL_POSTCODE) return NATIONAL_POSTCODE;
  const full = v.match(FULL_RE);
  if (full) return full[1].toUpperCase();
  if (OUTWARD_RE.test(v)) return v.toUpperCase();
  return null;
}
