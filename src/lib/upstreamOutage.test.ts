import { describe, it, expect, vi } from 'vitest';
import { classifyGridFailure, isUpstreamFailure } from '@/lib/upstreamOutage';
import { RequestTimeoutError } from '@/lib/carbonApi';

const ok = (() => Promise.resolve(new Response('{}', { status: 200 }))) as unknown as typeof fetch;
const down = (() => Promise.reject(new TypeError('Failed to fetch'))) as unknown as typeof fetch;

describe('NESO outage copy only when it is really NESO', () => {
  it('5xx and timeouts are upstream; 429, 404, bad data and network errors are not', () => {
    expect(isUpstreamFailure(new Error('Failed to fetch national intensity: 503'))).toBe(true);
    expect(isUpstreamFailure(new RequestTimeoutError())).toBe(true);
    expect(isUpstreamFailure(new Error('Too many requests (national intensity: 429)'))).toBe(false);
    expect(isUpstreamFailure(new Error('Failed to fetch regional data: 404'))).toBe(false);
    expect(isUpstreamFailure(new Error('Bad data from national intensity'))).toBe(false);
    expect(isUpstreamFailure(new TypeError('Failed to fetch'))).toBe(false);
  });

  it('outage: online, NESO 5xx, our API answers', async () => {
    const e = new Error('Failed to fetch national intensity: 500');
    expect(await classifyGridFailure(e, { online: true, fetchFn: ok })).toBe('outage');
  });

  it('generic when our own API is unreachable too (it is probably the connection)', async () => {
    const e = new Error('Failed to fetch national intensity: 500');
    expect(await classifyGridFailure(e, { online: true, fetchFn: down })).toBe('generic');
  });

  it('generic when offline, without even checking', async () => {
    const f = vi.fn(ok) as unknown as typeof fetch;
    expect(
      await classifyGridFailure(new RequestTimeoutError(), { online: false, fetchFn: f }),
    ).toBe('generic');
    expect(f).not.toHaveBeenCalled();
  });

  it('generic for non-upstream failures', async () => {
    expect(
      await classifyGridFailure(new Error('Bad data from national intensity'), {
        online: true,
        fetchFn: ok,
      }),
    ).toBe('generic');
  });
});
