// Shared-secret authentication for scheduler-only (pg_cron) endpoints.
//
// The secret is generated inside the database by the security-hardening
// migration (stored in Supabase Vault as `cron_secret`, or in
// private.scheduler_secret if Vault is unavailable). Nobody has to copy it
// anywhere:
//  - the pg_cron jobs read it via public.get_scheduler_secret() and send it in
//    the `x-cron-secret` header;
//  - edge functions read it via the same RPC using the service role (the RPC is
//    executable by service_role only) and compare in constant time.
//
// This module is runtime-agnostic (Web Crypto only) so it can be unit tested
// from Vitest as well as used from Deno edge functions.

export const CRON_SECRET_HEADER = 'x-cron-secret';

/** Minimum accepted length for the scheduler secret (the migration generates 64 hex chars). */
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

export type CronAuthResult = { ok: true } | { ok: false; status: 401 | 500 | 503; error: string };

/**
 * Verify that a request came from the scheduler. Fails closed: if the server
 * has no (or a too-short) secret, every request is rejected.
 */
export async function verifyCronRequest(
  req: Request,
  expectedSecret: string | undefined | null,
): Promise<CronAuthResult> {
  if (!expectedSecret || expectedSecret.length < MIN_CRON_SECRET_LENGTH) {
    console.error(
      '[CRON AUTH] Scheduler secret is missing or too short; rejecting scheduler request',
    );
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

// ---------------------------------------------------------------------------
// Secret loading (from the database, via a service_role-only RPC)
// ---------------------------------------------------------------------------

export interface SchedulerSecretRpcClient {
  rpc(fn: string): PromiseLike<{ data: unknown; error: unknown }>;
}

/** Fetch the scheduler secret with the service-role client. Throws if the RPC is missing (migration not applied). */
export async function fetchSchedulerSecret(
  client: SchedulerSecretRpcClient,
): Promise<string | null> {
  const { data, error } = await client.rpc('get_scheduler_secret');
  if (error) throw error;
  return typeof data === 'string' && data.length > 0 ? data : null;
}

/**
 * Cache the secret per function instance (default 5 minutes) so unauthenticated
 * probes don't each cost a database round trip. Failures are not cached.
 */
export function createSchedulerSecretProvider(
  fetcher: () => Promise<string | null>,
  options: { ttlMs?: number; now?: () => number } = {},
): () => Promise<string | null> {
  const ttlMs = options.ttlMs ?? 5 * 60 * 1000;
  const now = options.now ?? Date.now;
  let cached: { value: string; at: number } | null = null;
  let inflight: Promise<string | null> | null = null;

  return () => {
    if (cached && now() - cached.at < ttlMs) return Promise.resolve(cached.value);
    if (!inflight) {
      inflight = fetcher()
        .then((value) => {
          if (value) cached = { value, at: now() };
          return value;
        })
        .finally(() => {
          inflight = null;
        });
    }
    return inflight;
  };
}

/**
 * Authenticate a scheduler request against the database-held secret.
 * - no header            -> 401 (without touching the database)
 * - secret unavailable   -> 503 (e.g. deployed before the migration was applied); fails closed, never throws
 * - wrong / right secret -> 401 / ok
 */
export async function verifySchedulerRequest(
  req: Request,
  getSecret: () => Promise<string | null>,
): Promise<CronAuthResult> {
  if (!req.headers.get(CRON_SECRET_HEADER)) {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }

  let secret: string | null = null;
  try {
    secret = await getSecret();
  } catch (err) {
    console.error(
      '[CRON AUTH] Could not load scheduler secret (has the security migration been applied?)',
      err,
    );
  }
  if (!secret) {
    return { ok: false, status: 503, error: 'Scheduler authentication not ready' };
  }

  return verifyCronRequest(req, secret);
}
