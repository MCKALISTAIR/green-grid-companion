/**
 * Strip location data from anything sent to Sentry (errors, breadcrumbs and,
 * after consent, transactions).
 *
 * GridSense requests carry the user's location in URLs, e.g.
 *   api.carbonintensity.org.uk/regional/postcode/EH1
 *   api.postcodes.io/postcodes?lon=-3.19&lat=55.95, api.postcodes.io/outcodes/EH1
 *   api.open-meteo.com/v1/forecast?latitude=55.95&longitude=-3.19
 * and error messages can quote them. Everything below is replaced with a
 * placeholder before the event leaves the device.
 */
import type { Breadcrumb, Event } from '@sentry/react';

export const REDACTED = '[redacted]';

// Query params that carry coordinates or a postcode (full or outward).
const LOCATION_PARAM =
  /((?:^|[?&;])(?:lat|latitude|lon|lng|long|longitude|postcode|postal_?code|outcode|q|query)=)[^&#\s"']*/gi;
// A path segment after an endpoint that takes a postcode or outward code.
const POSTCODE_PATH =
  /(\/(?:postcode|postcodes|outcode|outcodes|regional\/postcode)\/)[^/?#\s"']+/gi;
// Coordinates as a path segment (e.g. /55.9533/-3.1883) or a "lat,lon" pair.
const COORD_PAIR = /-?\d{1,3}\.\d{2,}\s*(?:,|%2C|\/)\s*-?\d{1,3}\.\d{2,}/gi;
const COORD_SEGMENT = /\/-?\d{1,3}\.\d{3,}(?=[/?#\s"']|$)/g;
// A full UK postcode anywhere (with a space, %20, + or nothing between halves).
const FULL_POSTCODE = /\b[A-Z]{1,2}\d[A-Z\d]?(?:\s|%20|\+)*\d[A-Z]{2}\b/gi;

// BH-146: sign-in tokens, OAuth codes and other secrets in URLs or text.
// Covers ?k=v / #k=v / &k=v, "k":"v" (JSON) and k: v forms.
const SECRET_KEYS =
  'access_token|refresh_token|provider_token|provider_refresh_token|id_token|token|code|code_verifier|client_secret|secret|api_?key|apikey|password|authorization';
const SECRET_PARAM = new RegExp(`((?:^|[?&#;])(?:${SECRET_KEYS})=)[^&#\\s"']*`, 'gi');
const SECRET_JSON = new RegExp(`("(?:${SECRET_KEYS})"\\s*:\\s*")[^"]*`, 'gi');
// JWTs (Supabase access tokens) and Octopus API keys wherever they appear.
const JWT = /\beyJ[\w-]{5,}\.[\w-]{5,}\.[\w-]*/g;
const OCTOPUS_KEY = /\bsk_(?:live|test)_[A-Za-z0-9]+/g;
const BEARER = /(\bBearer\s+)[^\s"',]+/gi;
/** Object keys whose values are always secret, whatever they contain. */
const SECRET_KEY_NAME =
  /^(?:access_token|refresh_token|provider_token|provider_refresh_token|id_token|code_verifier|client_secret|secret|api_?key|apikey|password|authorization)$/i;

export function redactSecrets(text: string): string {
  return text
    .replace(SECRET_PARAM, `$1${REDACTED}`)
    .replace(SECRET_JSON, `$1${REDACTED}`)
    .replace(BEARER, `$1${REDACTED}`)
    .replace(JWT, REDACTED)
    .replace(OCTOPUS_KEY, REDACTED);
}

/** Location (postcodes, coordinates) and secrets (tokens, keys) removed. */
export function redactLocation(text: string): string {
  return redactSecrets(text)
    .replace(LOCATION_PARAM, `$1${REDACTED}`)
    .replace(POSTCODE_PATH, `$1${REDACTED}`)
    .replace(COORD_PAIR, REDACTED)
    .replace(COORD_SEGMENT, `/${REDACTED}`)
    .replace(FULL_POSTCODE, REDACTED);
}

const MAX_DEPTH = 8;

function deepMap<T>(value: T, fn: (s: string) => string, depth: number): T {
  if (typeof value === 'string') return fn(value) as unknown as T;
  if (depth > MAX_DEPTH || value === null || typeof value !== 'object') return value;
  if (value instanceof Error)
    return { name: value.name, message: fn(value.message) } as unknown as T;
  if (Array.isArray(value)) return value.map((v) => deepMap(v, fn, depth + 1)) as unknown as T;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>))
    out[k] = SECRET_KEY_NAME.test(k) && v != null ? REDACTED : deepMap(v, fn, depth + 1);
  return out as T;
}

/** Returns a deep copy with every string passed through redactLocation. */
export function redactDeep<T>(value: T, depth = 0): T {
  return deepMap(value, redactLocation, depth);
}

/** Deep copy with tokens and keys removed (location kept), for console logs. */
export function redactSecretsDeep<T>(value: T): T {
  return deepMap(value, redactSecrets, 0);
}

export function scrubBreadcrumb(crumb: Breadcrumb): Breadcrumb {
  return redactDeep(crumb);
}

/** Message, exception text, request, breadcrumbs, tags, extra, contexts, transaction name. */
export function scrubEvent<E extends Event>(event: E): E {
  const e = { ...event };
  if (e.message) e.message = redactLocation(e.message);
  if (e.transaction) e.transaction = redactLocation(e.transaction);
  if (e.exception) e.exception = redactDeep(e.exception);
  if (e.request) e.request = redactDeep(e.request);
  if (e.breadcrumbs) e.breadcrumbs = redactDeep(e.breadcrumbs);
  if (e.tags) e.tags = redactDeep(e.tags);
  if (e.extra) e.extra = redactDeep(e.extra);
  if (e.contexts) e.contexts = redactDeep(e.contexts);
  if (e.spans) e.spans = redactDeep(e.spans);
  // Never attach a user, even if some code sets one later.
  delete e.user;
  return e;
}
