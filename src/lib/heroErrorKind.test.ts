import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  getCurrentIntensity,
  getRegionalIntensity,
  isNesoRequestFailure,
  RequestTimeoutError,
} from '@/lib/carbonApi';
import { heroErrorTitle } from '@/lib/voice/errorStatesCopy';

// Design ruling on #177 (BH-80): "NESO isn't answering" only when the Carbon
// Intensity API request itself fails (timeout, network error, 5xx); any other
// failure gets "No reading right now"; offline still says "Offline".
const NESO = "NESO isn't answering";
const NEUTRAL = 'No reading right now';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const heroFor = (error: unknown, isOffline = false) =>
  heroErrorTitle(isOffline, isNesoRequestFailure(error));

describe('hero title by failure kind', () => {
  it('timeout: NESO', async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () =>
              reject(new DOMException('aborted', 'AbortError')),
            );
          }),
      ),
    );
    const p = getCurrentIntensity().catch((e) => e);
    await vi.advanceTimersByTimeAsync(10_001);
    const err = await p;
    expect(err).toBeInstanceOf(RequestTimeoutError);
    expect(heroFor(err)).toBe(NESO);
  });

  it('network error to the host: NESO', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const err = await getCurrentIntensity().catch((e) => e);
    // Type and message are unchanged; only tagged.
    expect(err).toBeInstanceOf(TypeError);
    expect(err.message).toBe('Failed to fetch');
    expect(heroFor(err)).toBe(NESO);
  });

  it.each([500, 502, 503, 504])('HTTP %s: NESO', async (status) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('down', { status })));
    const err = await getCurrentIntensity().catch((e) => e);
    expect(err.message).toBe(`Failed to fetch national intensity: ${status}`);
    expect(heroFor(err)).toBe(NESO);
  });

  it('parse error (200 with a bad body): neutral', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('<html>', { status: 200 })),
    );
    const err = await getCurrentIntensity().catch((e) => e);
    expect(err).toBeInstanceOf(Error);
    expect(heroFor(err)).toBe(NEUTRAL);
  });

  it('parse error (200 with the wrong shape): neutral', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ data: [] }), { status: 200 })),
    );
    const err = await getCurrentIntensity().catch((e) => e);
    expect(err.message).toBe('Bad data from national intensity');
    expect(heroFor(err)).toBe(NEUTRAL);
  });

  it('postcode lookup error (HTTP 400): neutral', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('{"error":"Invalid postcode"}', { status: 400 })),
    );
    const err = await getRegionalIntensity('ZZ9 9ZZ').catch((e) => e);
    expect(heroFor(err)).toBe(NEUTRAL);
  });

  it('rate limit (HTTP 429) is not an outage: neutral', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 429 })));
    const err = await getCurrentIntensity().catch((e) => e);
    expect(heroFor(err)).toBe(NEUTRAL);
  });

  it('our own bug (a plain Error, or no error at all): neutral', () => {
    expect(heroFor(new Error('undefined is not a function'))).toBe(NEUTRAL);
    expect(heroFor(null)).toBe(NEUTRAL);
  });

  it("the caller cancelling the request isn't tagged", async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('aborted', 'AbortError')));
    const controller = new AbortController();
    controller.abort();
    const err = await getCurrentIntensity(controller.signal).catch((e) => e);
    expect(isNesoRequestFailure(err)).toBe(false);
  });

  it('offline: "Offline", whatever the error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const err = await getCurrentIntensity().catch((e) => e);
    expect(heroFor(err, true)).toBe('Offline');
    expect(heroFor(new Error('Bad data from national intensity'), true)).toBe('Offline');
    expect(heroFor(null, true)).toBe('Offline');
  });
});
