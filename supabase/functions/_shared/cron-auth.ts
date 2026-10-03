// Shared-secret authentication for scheduler-only (pg_cron) endpoints.
//
// The cron jobs defined in supabase/migrations send the secret in the
// `x-cron-secret` header. The value is stored in Supabase Vault (name:
// `cron_secret`) on the database side and in the `CRON_SECRET` edge function
// secret on the function side. Both must hold the same value.
//
// This module is runtime-agnostic (Web Crypto only) so it can be unit tested
// from Vitest as well as used from Deno edge functions.

export const CRON_SECRET_HEADER = 'x-cron-secret';

/** Minimum accepted length for CRON_SECRET (e.g. `openssl rand -hex 32` = 64 chars). */
export const MIN_CRON_SECRET_LENGTH = 32;

/**
 * Constant-time string comparison. Both inputs are hashed with SHA-256 first so
 * the comparison runs over fixed-length buffers and does not leak the length
 * of the expected secret.
 */
export async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder();
  const [ha, hb] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(a)),
    crypto.subtle.digest('SHA-256', enc.encode(b)),
  ]);
  const va = new Uint8Array(ha);
  const vb = new Uint8Array(hb);
  let diff = 0;
  for (let i = 0; i < va.length; i++) {
    diff |= va[i] ^ vb[i];
  }
  return diff === 0;
}

export type CronAuthResult =
  | { ok: true }
  | { ok: false; status: 401 | 500; error: string };

/**
 * Verify that a request came from the scheduler. Fails closed: if the server
 * has no (or a too-short) CRON_SECRET configured, every request is rejected.
 */
export async function verifyCronRequest(
  req: Request,
  expectedSecret: string | undefined | null,
): Promise<CronAuthResult> {
  if (!expectedSecret || expectedSecret.length < MIN_CRON_SECRET_LENGTH) {
    console.error('[CRON AUTH] CRON_SECRET is not configured (or too short); rejecting scheduler request');
    return { ok: false, status: 500, error: 'Scheduler authentication is not configured' };
  }

  const provided = req.headers.get(CRON_SECRET_HEADER);
  if (!provided) {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }

  if (!(await timingSafeEqual(provided, expectedSecret))) {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }

  return { ok: true };
}

/** Build the JSON error response for a failed cron auth check. */
export function cronAuthErrorResponse(
  result: Extract<CronAuthResult, { ok: false }>,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify({ error: result.error }), {
    status: result.status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}
