/**
 * Octopus linking (PR-O1): input normalising, format checks, and reading the
 * answers from the existing save-credentials and get-meters calls.
 *
 * Client-only. The requests themselves are unchanged. get-meters answers HTTP
 * 200 with an English `error` string when Octopus refuses
 * (supabase/functions/octopus-energy/index.ts, get-meters), so we match on the
 * stable prefixes. src/lib/octopusLink.test.ts pins them against the function
 * source. A proper `code` field is item N1 in the brief (needs Alistair).
 */
import { OCTOPUS_BANNER_COPY, OCTOPUS_FIELD_ERRORS } from '@/lib/voice/octopusLinkCopy';

export const ACCOUNT_NUMBER_PATTERN = /^A-[A-Z0-9]{8}$/i;
export const API_KEY_PATTERN = /^sk_live_[a-zA-Z0-9]{20,}$/;
const ACCOUNT_MAX = 20;
const API_KEY_MAX = 100;

/** Trim, keep letters, numbers and dashes, uppercase; `A12AB34CD` becomes `A-12AB34CD`. */
export function normaliseAccountNumber(raw: string): string {
  const cleaned = raw
    .trim()
    .replace(/[^a-zA-Z0-9-]/g, '')
    .toUpperCase();
  return /^A[A-Z0-9]{8}$/.test(cleaned) ? `A-${cleaned.slice(1)}` : cleaned;
}

/** Same sanitiser as before: letters, numbers and underscores only. */
export function sanitiseApiKey(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_]/g, '');
}

export function accountNumberError(value: string): string | undefined {
  const v = value.trim();
  if (!v) return OCTOPUS_FIELD_ERRORS.accountEmpty;
  if (v.length > ACCOUNT_MAX || !ACCOUNT_NUMBER_PATTERN.test(v))
    return OCTOPUS_FIELD_ERRORS.accountFormat;
  return undefined;
}

export function apiKeyError(value: string): string | undefined {
  const v = value.trim();
  if (!v) return OCTOPUS_FIELD_ERRORS.keyEmpty;
  if (v.length > API_KEY_MAX || !API_KEY_PATTERN.test(v)) return OCTOPUS_FIELD_ERRORS.keyFormat;
  return undefined;
}

export interface LinkedMeter {
  mpan: string;
  serial_number?: string;
  meter_type?: string;
}

export type LinkFailureReason =
  | 'wrong_key'
  | 'wrong_account'
  | 'octopus_refused'
  | 'octopus_down'
  | 'no_meter'
  | 'meter_taken'
  | 'rate_limited'
  | 'save_failed'
  | 'no_session'
  | 'offline'
  | 'unknown';

export type LinkField = 'accountNumber' | 'apiKey';

/**
 * Result of a linking attempt. `ok` with the meters, or not ok with a reason
 * (and the field it belongs to, for wrong key or wrong account number).
 * A flat shape: the app's tsconfig isn't strict, so union narrowing on `ok` doesn't work.
 */
export interface LinkResult {
  ok: boolean;
  meters?: LinkedMeter[];
  reason?: LinkFailureReason;
  field?: LinkField;
  /** Seconds, from save-credentials' 429 body. */
  retryAfter?: number;
}

/** Prefixes of the get-meters `error` strings (index.ts, get-meters). */
export const GET_METERS_PREFIX = {
  wrongKey: 'Invalid API key',
  wrongAccount: 'Account not found',
} as const;
const OCTOPUS_STATUS = /Octopus API error \((\d{3})\)/;

/** Machine codes on get-meters errors (C2-13). Matched before the message prefixes. */
export const GET_METERS_CODE = {
  wrongKey: 'invalid_api_key',
  wrongAccount: 'account_not_found',
  octopusError: 'octopus_error',
  meterTaken: 'meter_already_linked',
} as const;

function fromOctopusStatus(status: number): LinkResult | undefined {
  if (status >= 500 || status === 429) return { ok: false, reason: 'octopus_down' };
  if (status >= 400) return { ok: false, reason: 'octopus_refused' };
  return undefined;
}

/** Reads a 2xx get-meters answer: `{ meters }` or `{ error, meters: [] }`. */
export function parseGetMetersAnswer(data: unknown): LinkResult {
  const d = (data && typeof data === 'object' ? data : {}) as {
    error?: unknown;
    code?: unknown;
    octopus_status?: unknown;
    meters?: unknown;
  };
  if (typeof d.error === 'string' && d.error) {
    // Newer deploys send a code; match on it so the message text can change freely.
    if (d.code === GET_METERS_CODE.wrongKey)
      return { ok: false, reason: 'wrong_key', field: 'apiKey' };
    if (d.code === GET_METERS_CODE.wrongAccount)
      return { ok: false, reason: 'wrong_account', field: 'accountNumber' };
    if (d.code === GET_METERS_CODE.meterTaken) return { ok: false, reason: 'meter_taken' };
    if (d.code === GET_METERS_CODE.octopusError && typeof d.octopus_status === 'number') {
      return fromOctopusStatus(d.octopus_status) ?? { ok: false, reason: 'unknown' };
    }
    // Fallback for older deploys without a code: match the message prefix.
    if (d.error.startsWith(GET_METERS_PREFIX.wrongKey))
      return { ok: false, reason: 'wrong_key', field: 'apiKey' };
    if (d.error.startsWith(GET_METERS_PREFIX.wrongAccount))
      return { ok: false, reason: 'wrong_account', field: 'accountNumber' };
    const m = OCTOPUS_STATUS.exec(d.error);
    if (m) {
      const r = fromOctopusStatus(Number(m[1]));
      if (r) return r;
    }
    return { ok: false, reason: 'unknown' };
  }
  const meters = Array.isArray(d.meters) ? (d.meters as LinkedMeter[]) : [];
  if (meters.length === 0) return { ok: false, reason: 'no_meter' };
  return { ok: true, meters };
}

/** HTTP status of a supabase-js FunctionsHttpError (error.context is the Response). */
export function functionErrorStatus(error: unknown): number | undefined {
  const ctx = (error as { context?: { status?: unknown } } | null)?.context;
  return typeof ctx?.status === 'number' ? ctx.status : undefined;
}

/** Reads a failed save-credentials call. `body` is the parsed error body, if any. */
export function parseSaveFailure(
  status: number | undefined,
  body: unknown,
  offline: boolean,
): LinkResult {
  if (status === 429) {
    const ra = (body as { retry_after?: unknown } | null)?.retry_after;
    return typeof ra === 'number' && ra > 0
      ? { ok: false, reason: 'rate_limited', retryAfter: ra }
      : { ok: false, reason: 'rate_limited' };
  }
  if (status === 500 || status === 503) return { ok: false, reason: 'save_failed' };
  if (status === undefined && offline) return { ok: false, reason: 'offline' };
  return { ok: false, reason: 'unknown' };
}

/** Inline copy for a failure that belongs to one field, else undefined. */
export function fieldMessage(result: LinkResult): string | undefined {
  if (result.ok) return undefined;
  if (result.reason === 'wrong_key') return OCTOPUS_FIELD_ERRORS.wrongKey;
  if (result.reason === 'wrong_account') return OCTOPUS_FIELD_ERRORS.wrongAccount;
  return undefined;
}

/** Banner copy for a failure that isn't about one field, else undefined. */
export function bannerMessage(result: LinkResult): string | undefined {
  if (result.ok) return undefined;
  switch (result.reason) {
    case 'wrong_key':
    case 'wrong_account':
      return undefined;
    case 'octopus_refused':
      return OCTOPUS_BANNER_COPY.refused;
    case 'octopus_down':
      return OCTOPUS_BANNER_COPY.octopusDown;
    case 'no_meter':
      return OCTOPUS_BANNER_COPY.noMeter;
    case 'meter_taken':
      return OCTOPUS_BANNER_COPY.meterTaken;
    case 'rate_limited': {
      if (!result.retryAfter) return OCTOPUS_BANNER_COPY.rateLimitedUnknown;
      const minutes = Math.ceil(result.retryAfter / 60);
      return minutes === 1
        ? OCTOPUS_BANNER_COPY.rateLimitedOneMinute
        : OCTOPUS_BANNER_COPY.rateLimited(minutes);
    }
    case 'save_failed':
      return OCTOPUS_BANNER_COPY.saveFailed;
    case 'no_session':
      return OCTOPUS_BANNER_COPY.noSession;
    case 'offline':
      return OCTOPUS_BANNER_COPY.offline;
    default:
      return OCTOPUS_BANNER_COPY.unknown;
  }
}

/** Any copy for a failure (field or banner): used where there's only a toast (card Check again). */
export function linkFailureMessage(result: LinkResult): string | undefined {
  return fieldMessage(result) ?? bannerMessage(result);
}

/** Last 6 digits of an MPAN, the same masking as the Settings card. */
export function mpanEnding(mpan: string): string {
  return mpan.slice(-6);
}
