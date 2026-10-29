/**
 * BH-148: input rules for the geocoding proxy.
 *
 * The proxy now needs a Supabase session (anonymous is fine), is rate limited
 * per user and per IP, and only caches real results, so a script can't fill
 * geocoding_cache or burn GridSense's Nominatim allowance (1 req/s policy).
 */

export const GEOCODING_MAX_QUERY_LENGTH = 100;
/** Per signed-in (or anonymous) user. */
export const GEOCODING_USER_LIMIT = { limit: 30, windowSeconds: 60 };
/** Per IP, across all users behind it. */
export const GEOCODING_IP_LIMIT = { limit: 60, windowSeconds: 60 };

// Letters (incl. accents), digits, spaces and common place-name punctuation.
const ALLOWED = /^[\p{L}\p{N} .,'()&/-]+$/u;

export type QueryCheck = { ok: true; normalized: string } | { ok: false; code: string };

export function checkGeocodingQuery(raw: unknown): QueryCheck {
  if (typeof raw !== 'string') return { ok: false, code: 'query_required' };
  const trimmed = raw.trim().replace(/\s+/g, ' ');
  if (trimmed.length < 2) return { ok: false, code: 'query_required' };
  if (trimmed.length > GEOCODING_MAX_QUERY_LENGTH) return { ok: false, code: 'query_too_long' };
  if (!ALLOWED.test(trimmed)) return { ok: false, code: 'query_invalid' };
  return { ok: true, normalized: trimmed.toLowerCase() };
}

/** Only cache a non-empty Nominatim answer with usable coordinates. */
export function isCacheableResult(data: unknown): data is Array<{ lat: string; lon: string }> {
  if (!Array.isArray(data) || data.length === 0) return false;
  const first = data[0] as { lat?: unknown; lon?: unknown };
  const lat = Number(first?.lat);
  const lon = Number(first?.lon);
  return Number.isFinite(lat) && Number.isFinite(lon);
}

export function clientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}
