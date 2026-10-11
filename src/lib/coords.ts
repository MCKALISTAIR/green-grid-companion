/**
 * Coordinate privacy: round on the device before anything leaves it.
 *
 * Every outside call that carries a latitude/longitude (Open-Meteo, the weather
 * edge function, postcodes.io and Nominatim reverse lookups) goes through these
 * helpers, so only 2 decimal places (~1.1 km north–south) are ever sent. The
 * weather edge function also rounds server-side; that stays as a second line.
 */

export const COORD_DECIMALS = 2;

/** Round one coordinate to 2 dp. Non-finite input returns NaN so callers can bail out. */
export function roundCoord(value: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return NaN;
  const r = Math.round(value * 100) / 100;
  return Object.is(r, -0) ? 0 : r;
}

export function roundCoords<T extends { lat: number; lon: number }>(c: T): { lat: number; lon: number } {
  return { lat: roundCoord(c.lat), lon: roundCoord(c.lon) };
}

/** 2-dp strings for query strings ("51.51", "-0.13"). */
export function coordParams(lat: number, lon: number): { lat: string; lon: string } {
  const r = roundCoords({ lat, lon });
  return { lat: r.lat.toFixed(COORD_DECIMALS), lon: r.lon.toFixed(COORD_DECIMALS) };
}

/**
 * postcodes.io reverse lookup URL. Rounded coordinates can land up to ~800 m
 * from the real spot, and postcodes.io only searches 100 m by default, so ask
 * for the nearest postcode within its 2 km maximum.
 */
export function postcodesIoReverseUrl(lat: number, lon: number): string {
  const p = coordParams(lat, lon);
  return `https://api.postcodes.io/postcodes?lon=${p.lon}&lat=${p.lat}&radius=2000&limit=1`;
}

export function nominatimReverseUrl(lat: number, lon: number): string {
  const p = coordParams(lat, lon);
  return `https://nominatim.openstreetmap.org/reverse?lat=${p.lat}&lon=${p.lon}&format=json`;
}
