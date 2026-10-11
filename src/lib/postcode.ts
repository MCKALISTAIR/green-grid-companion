/**
 * Postcode helpers for first launch and location storage.
 *
 * GridSense only needs the outward code (the first half, e.g. "SW1A") to find a
 * grid region, so that's all we keep. 'GB' is the national (GB average) mode,
 * and region names ("Scotland", "England", "Wales") pass through unchanged.
 */

/** Stored "postcode" for the GB-average (national) mode. useCarbonData already treats it as national. */
export const NATIONAL_POSTCODE = 'GB';

const FULL_RE = /^([A-Z]{1,2}\d[A-Z\d]?)\s*(\d[A-Z]{2})$/i;
const OUTWARD_RE = /^[A-Z]{1,2}\d[A-Z\d]?$/i;

/** True for a full GB postcode ("SW1A 1AA", "sw1a1aa") or an outward code ("SW1A"). */
export function isValidPostcode(input: string): boolean {
  const v = input.trim();
  return FULL_RE.test(v) || OUTWARD_RE.test(v);
}

/**
 * Outward code for a postcode, with or without the space:
 * "SW1A 1AA" → "SW1A", "SW1A1AA" → "SW1A", "eh1" → "EH1".
 * Anything that isn't a postcode (e.g. 'GB', 'Scotland') comes back trimmed and unchanged.
 */
export function toOutwardCode(input: string): string {
  const v = input.trim();
  const full = v.match(FULL_RE);
  if (full) return full[1].toUpperCase();
  if (OUTWARD_RE.test(v)) return v.toUpperCase();
  return v;
}

/** Northern Ireland (BT) postcodes. The Carbon Intensity API only covers Great Britain. */
export function isNorthernIrelandPostcode(input: string): boolean {
  return /^BT\d/i.test(input.trim());
}

export function isNationalMode(postcode: string | null | undefined): boolean {
  return (postcode ?? '').trim().toUpperCase() === NATIONAL_POSTCODE;
}
