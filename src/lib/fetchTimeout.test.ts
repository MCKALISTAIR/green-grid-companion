import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchWithTimeout, RequestTimeoutError, getCurrentIntensity } from '@/lib/carbonApi';
import { getErrorInfo } from '@/lib/errorUtils';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const hangingFetch = () =>
  vi.fn(
    (_url: string, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () =>
          reject(new DOMException('aborted', 'AbortError')),
        );
      }),
  );

describe('fetchWithTimeout', () => {
  it('gives up with RequestTimeoutError instead of hanging', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', hangingFetch());
    const p = fetchWithTimeout('https://x.test', undefined, 1000);
    const assertion = expect(p).rejects.toBeInstanceOf(RequestTimeoutError);
    await vi.advanceTimersByTimeAsync(1001);
    await assertion;
  });

  it("passes the caller's abort through as an abort, not a timeout", async () => {
    vi.stubGlobal('fetch', hangingFetch());
    const controller = new AbortController();
    const p = fetchWithTimeout('https://x.test', controller.signal, 10_000);
    controller.abort();
    await expect(p).rejects.toHaveProperty('name', 'AbortError');
  });

  it('maps a timeout to the "took too long" copy', () => {
    expect(getErrorInfo(new RequestTimeoutError()).title).toBe('That took too long');
  });
});

describe('carbon fetchers reject bad responses with readable errors', () => {
  it.each([
    [500, 'not json', "The data service isn't answering"],
    [429, 'Too Many Requests', 'Too many refreshes'],
  ])('HTTP %s', async (status, body, title) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(body, { status })));
    const err = await getCurrentIntensity().catch((e) => e);
    expect(getErrorInfo(err).title).toBe(title);
  });

  it('empty data', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"data":[]}', { status: 200 })));
    const err = await getCurrentIntensity().catch((e) => e);
    expect(getErrorInfo(err).title).toBe('The data looks wrong');
  });

  it('malformed JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"data":', { status: 200 })));
    const err = await getCurrentIntensity().catch((e) => e);
    expect(getErrorInfo(err).title).toBe('The data looks wrong');
  });
});
