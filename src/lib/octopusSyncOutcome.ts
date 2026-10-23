/**
 * Decides which Octopus sync toast to show (BH-91, Design call on #180).
 *
 * The octopus-energy function reports one result per meter. A result means
 * "your Octopus link has expired" when:
 *   - error is 'octopus_http_401' or 'octopus_http_403' (Octopus rejected the
 *     user's key; http_status is Octopus's own status), or
 *   - error is 'no_credentials' or 'credentials_unavailable' (no stored key,
 *     or the stored key can't be decrypted).
 * The in-app actions refuse up front when the key is missing or unreadable:
 * HTTP 400 with code 'credentials_unavailable' (older deploys: only the
 * message 'Octopus Energy credentials not configured' / 'Missing credentials').
 *
 * Anything else that failed (Octopus 5xx/429, network, bad JSON, a DB write,
 * NESO intensity, footprint writes) is the general failure line. Credentials
 * win when both happen, because only the user can fix them.
 *
 * Calculation results (MeterCalcResult) carry NESO's status, not Octopus's,
 * so they never map to credentials.
 */
import type { CommentaryTone } from '@/lib/tone';
import { OCTOPUS_SYNC_COPY, toneBody } from '@/lib/voice/errorStatesCopy';

export type SyncOutcome = 'ok' | 'credentials' | 'failed';

interface MeterLike {
  ok?: boolean;
  http_status?: number;
  error?: string;
  footprint_ok?: boolean;
}

interface RunLike {
  success?: boolean;
  meters?: MeterLike[];
}

/** sync-consumption returns a RunLike; full-sync returns { success, sync, calculation }. */
export interface SyncResponseLike extends RunLike {
  sync?: RunLike;
  calculation?: RunLike;
}

const CREDENTIAL_ERRORS = new Set([
  'octopus_http_401',
  'octopus_http_403',
  'no_credentials',
  'credentials_unavailable',
]);

const CREDENTIAL_MESSAGES = new Set([
  'Octopus Energy credentials not configured',
  'Missing credentials',
]);

export function isCredentialMeterError(m: MeterLike): boolean {
  if (m.ok !== false || !m.error) return false;
  return CREDENTIAL_ERRORS.has(m.error);
}

/** Outcome of a 2xx response from sync-consumption or full-sync. */
export function syncOutcome(data: SyncResponseLike | null | undefined): SyncOutcome {
  if (!data) return 'failed';
  const syncMeters = data.sync?.meters ?? data.meters ?? [];
  if (syncMeters.some(isCredentialMeterError)) return 'credentials';
  if (data.success === false) return 'failed';
  if (data.sync?.success === false || data.calculation?.success === false) return 'failed';
  return 'ok';
}

/** Outcome of a non-2xx response (the parsed JSON body, if any). */
export function syncErrorOutcome(body: unknown): SyncOutcome {
  if (body && typeof body === 'object') {
    const b = body as { code?: unknown; error?: unknown };
    if (b.code === 'credentials_unavailable') return 'credentials';
    if (typeof b.error === 'string' && CREDENTIAL_MESSAGES.has(b.error)) return 'credentials';
  }
  return 'failed';
}

/** Toast text for a failed outcome, in the user's tone. */
export function syncFailureMessage(
  outcome: Exclude<SyncOutcome, 'ok'>,
  tone: CommentaryTone,
): string {
  return toneBody(
    outcome === 'credentials' ? OCTOPUS_SYNC_COPY.credentials : OCTOPUS_SYNC_COPY.failed,
    tone,
  );
}

/**
 * Best-effort read of a supabase-js FunctionsHttpError body (error.context is
 * the Response). Returns null if there is no readable JSON body.
 */
export async function readFunctionErrorBody(error: unknown): Promise<unknown> {
  const ctx = (error as { context?: unknown } | null)?.context;
  if (!ctx || typeof (ctx as Response).json !== 'function') return null;
  try {
    const res = ctx as Response;
    return await (typeof res.clone === 'function' ? res.clone() : res).json();
  } catch {
    return null;
  }
}
