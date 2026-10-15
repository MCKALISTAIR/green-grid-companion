import { describe, it, expect, vi } from 'vitest';
import {
  createAlertReadingResolver,
  parseRegionalPostcodeIntensity,
  alertPlaceLabel,
} from '../../../supabase/functions/_shared/alert-reading.ts';

const regional = (shortname: string, forecast: number, index = 'low') => ({
  data: [{ regionid: 11, shortname, data: [{ intensity: { forecast, index } }] }],
});
const national = (actual: number, index = 'moderate') => ({
  data: [{ intensity: { forecast: actual, actual, index } }],
});
const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

function router(routes: Record<string, () => Response | Promise<Response>>) {
  return vi.fn(async (url: string | URL | Request) => {
    const u = String(url);
    for (const [frag, make] of Object.entries(routes)) if (u.includes(frag)) return make();
    throw new Error(`unexpected fetch ${u}`);
  }) as unknown as typeof fetch & ReturnType<typeof vi.fn>;
}

describe('push alert readings (BH-02)', () => {
  it('uses NESO’s own outcode → region reading, not a first-letter guess', async () => {
    const f = router({ '/regional/postcode/EX4': () => ok(regional('South West England', 88)) });
    const r = await createAlertReadingResolver(f, () => {})('EX4');
    expect(r).toEqual({
      intensity: 88,
      index: 'low',
      scope: 'regional',
      regionName: 'South West England',
    });
    expect(alertPlaceLabel(r!)).toBe('South West England');
  });

  it.each([
    ['HTTP 500', () => new Response('x', { status: 500 })],
    ['HTTP 429', () => new Response('x', { status: 429 })],
    ['malformed', () => ok({ data: [] })],
    ['network error', () => Promise.reject(new TypeError('fetch failed'))],
  ])('regional read fails (%s) → null, and the national figure is never used', async (_n, fail) => {
    const f = router({
      '/regional/postcode/': fail as () => Response,
      '/intensity': () => ok(national(150)),
    });
    const r = await createAlertReadingResolver(f, () => {})('SW1A');
    expect(r).toBeNull();
    expect(f.mock.calls.some(([u]) => String(u).endsWith('/intensity'))).toBe(false);
  });

  it('GB-average subscribers get the national reading, labelled as the GB average', async () => {
    const f = router({ '/intensity': () => ok(national(150)) });
    const r = await createAlertReadingResolver(f, () => {})('GB');
    expect(r).toMatchObject({ intensity: 150, scope: 'national' });
    expect(alertPlaceLabel(r!)).toBe('GB average');
  });

  it('caches per outward code within a run (full postcodes collapse to the outcode)', async () => {
    const f = router({
      '/regional/postcode/M1': () => ok(regional('North West England', 120, 'moderate')),
    });
    const resolve = createAlertReadingResolver(f, () => {});
    await resolve('M1');
    await resolve('m1 1ae');
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('skips unusable postcodes without fetching', async () => {
    const f = router({});
    expect(await createAlertReadingResolver(f, () => {})('Scotland')).toBeNull();
    expect(f).not.toHaveBeenCalled();
  });

  it('parser rejects missing shortname or bad intensity', () => {
    expect(
      parseRegionalPostcodeIntensity({
        data: [{ data: [{ intensity: { forecast: 1, index: 'low' } }] }],
      }),
    ).toBeNull();
    expect(parseRegionalPostcodeIntensity(regional('London', -1))).toBeNull();
  });
});
