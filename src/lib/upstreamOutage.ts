/**
 * Decide whether a failed grid load is NESO's fault. The "on their side, not
 * your phone" copy is only honest when our own API answers and NESO returned
 * a 5xx or timed out; anything else gets the generic copy.
 */
import { RequestTimeoutError } from '@/lib/carbonApi';

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://klwezcjmlrdwvvzisdtd.supabase.co';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

/** NESO answered with a 5xx, or didn't answer in time. */
export function isUpstreamFailure(error: unknown): boolean {
  if (error instanceof RequestTimeoutError) return true;
  const msg = error instanceof Error ? error.message : String(error ?? '');
  return /: 5\d\d\b/.test(msg) || /timed out/i.test(msg);
}

/** True when our own backend answers (auth health), within 4 s. */
export async function isOwnApiReachable(fetchFn: typeof fetch = fetch): Promise<boolean> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4000);
  try {
    const res = await fetchFn(`${SUPABASE_URL}/auth/v1/health`, {
      headers: SUPABASE_KEY ? { apikey: SUPABASE_KEY } : undefined,
      signal: ctrl.signal,
      cache: 'no-store',
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/** 'outage' only if the device is online, NESO failed upstream, and our API answers. */
export async function classifyGridFailure(
  error: unknown,
  opts: { online?: boolean; fetchFn?: typeof fetch } = {},
): Promise<'outage' | 'generic'> {
  const online = opts.online ?? (typeof navigator === 'undefined' ? true : navigator.onLine);
  if (!online || !isUpstreamFailure(error)) return 'generic';
  return (await isOwnApiReachable(opts.fetchFn)) ? 'outage' : 'generic';
}
