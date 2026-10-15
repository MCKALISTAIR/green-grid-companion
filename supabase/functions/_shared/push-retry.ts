/**
 * Retry helper for a single push delivery.
 *
 * Retries only when the provider did not accept the message: a network error
 * before any response, HTTP 429, or a 5xx. Any other status (2xx success, or a
 * 4xx such as a dead token / bad request) is final. The caller passes the same
 * request every attempt; for APNs that includes a fixed `apns-id`, so Apple
 * treats a retry of an already-accepted message as the same notification.
 */
export type AttemptResult =
  | { kind: 'ok' }
  | { kind: 'http'; status: number; text: string; retryAfterSec?: number }
  | { kind: 'network'; error: unknown };

export interface RetryOptions {
  maxAttempts?: number; // total attempts, default 3
  baseDelayMs?: number; // 500 → 500, 1000, 2000…
  maxDelayMs?: number; // cap, default 5000
  sleep?: (ms: number) => Promise<void>;
}

export const isRetryableStatus = (status: number) => status === 429 || status >= 500;

export async function sendWithRetry(
  attempt: () => Promise<AttemptResult>,
  opts: RetryOptions = {},
): Promise<{ result: AttemptResult; attempts: number }> {
  const maxAttempts = opts.maxAttempts ?? 3;
  const base = opts.baseDelayMs ?? 500;
  const cap = opts.maxDelayMs ?? 5000;
  const sleep = opts.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));

  let result: AttemptResult = { kind: 'network', error: new Error('not attempted') };
  for (let i = 1; i <= maxAttempts; i++) {
    try {
      result = await attempt();
    } catch (error) {
      result = { kind: 'network', error };
    }
    const retryable =
      result.kind === 'network' || (result.kind === 'http' && isRetryableStatus(result.status));
    if (!retryable || i === maxAttempts) return { result, attempts: i };
    const backoff = Math.min(cap, base * 2 ** (i - 1));
    const hinted =
      result.kind === 'http' && result.retryAfterSec
        ? Math.min(cap, result.retryAfterSec * 1000)
        : 0;
    await sleep(Math.max(backoff, hinted));
  }
  return { result, attempts: maxAttempts };
}

export function parseRetryAfter(value: string | null): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}
