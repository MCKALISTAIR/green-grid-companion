import { UK_REGIONS } from '@/lib/carbonApi';

/**
 * Region name for a stored location value, or undefined when the app can't be
 * sure and must ask the Carbon Intensity API (/regional/postcode/{outcode}).
 *
 * Accepts region names ("GB", "Scotland"), bare postcode areas ("SW", "M") and
 * outward/full postcodes ("EX4", "SW1A 1AA"). Only an EXACT postcode-area match
 * counts: the area is the leading letters, so "EX4" has area "EX" and does not
 * match London's "E". Never guess from a first letter.
 */
export function regionNameForPostcode(postcode: string | null | undefined): string | undefined {
  const value = (postcode || '').trim();
  if (!value) return undefined;
  const byName = UK_REGIONS.find((r) => r.postcode.toLowerCase() === value.toLowerCase());
  if (byName) return byName.name;
  const area = value.toUpperCase().match(/^[A-Z]{1,2}(?=\d|$|\s)/)?.[0];
  if (!area) return undefined;
  return UK_REGIONS.find((r) => r.postcode === area)?.name;
}
