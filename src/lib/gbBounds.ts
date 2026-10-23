/**
 * Rough Great Britain bounding box (incl. Shetland, Scilly, NI's longitude is
 * excluded by the west edge only loosely). Used only to tell "outside GB" from
 * "postcodes.io found nothing nearby": inside the box with no postcode is a
 * plain failure, never the outside-GB message.
 */
export function isRoughlyInGreatBritain(lat: number, lon: number): boolean {
  return lat >= 49.8 && lat <= 60.95 && lon >= -8.7 && lon <= 1.8;
}
