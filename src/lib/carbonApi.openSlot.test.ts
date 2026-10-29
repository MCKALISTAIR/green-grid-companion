import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getAllRegions,
  getCurrentIntensity,
  getGenerationMix,
  getRegionalIntensityById,
  pickOpenSlot,
} from '@/lib/carbonApi';

// BH-136: NESO's "current" endpoints serve the last finished half hour.
const NOW = Date.parse('2026-10-29T20:52:00Z');
const prev = { from: '2026-10-29T20:00Z', to: '2026-10-29T20:30Z' };
const open = { from: '2026-10-29T20:30Z', to: '2026-10-29T21:00Z' };
const mix = [{ fuel: 'gas', perc: 52.3 }];

const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status }));

function mockFetch(routes: Record<string, () => Promise<Response>>) {
  const f = vi.fn((url: string) => {
    const path = String(url).replace('https://api.carbonintensity.org.uk', '');
    for (const [k, v] of Object.entries(routes)) if (path === k || path.startsWith(k)) return v();
    return json({ error: 'unrouted ' + path }, 404);
  });
  vi.stubGlobal('fetch', f);
  return f;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('pickOpenSlot', () => {
  it('picks the half hour containing now, not the first one', () => {
    expect(pickOpenSlot([prev, open], NOW)).toBe(open);
  });
  it('falls back to the first slot, and to undefined for nothing', () => {
    expect(pickOpenSlot([prev], NOW)).toBe(prev);
    expect(pickOpenSlot([], NOW)).toBeUndefined();
    expect(pickOpenSlot(undefined, NOW)).toBeUndefined();
  });
});

describe('live readings ask NESO for the open half hour', () => {
  it('national: uses /intensity/{now}/{+30} and returns the open slot', async () => {
    vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
    const f = mockFetch({
      '/intensity/2026-10-29T20:52Z/2026-10-29T21:22Z': () =>
        json({ data: [{ ...open, intensity: { forecast: 218, actual: null, index: 'high' } }] }),
      '/intensity': () =>
        json({ data: [{ ...prev, intensity: { forecast: 217, actual: 215, index: 'high' } }] }),
    });
    const r = await getCurrentIntensity();
    expect(r.from).toBe(open.from);
    expect(r.intensity.forecast).toBe(218);
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('national: falls back to /intensity when the timed call fails', async () => {
    vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
    mockFetch({
      '/intensity/2026': () => json({}, 400),
      '/intensity': () =>
        json({ data: [{ ...prev, intensity: { forecast: 217, actual: 215, index: 'high' } }] }),
    });
    const r = await getCurrentIntensity();
    expect(r.from).toBe(prev.from);
  });

  it('regional: reshapes /regional/intensity/{now}/{+30}/regionid/{id}', async () => {
    vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
    mockFetch({
      '/regional/intensity/2026-10-29T20:52Z/2026-10-29T21:22Z/regionid/13': () =>
        json({
          data: {
            regionid: 13,
            dnoregion: 'UKPN London',
            shortname: 'London',
            data: [
              { ...open, intensity: { forecast: 272, index: 'very high' }, generationmix: mix },
            ],
          },
        }),
    });
    const r = await getRegionalIntensityById(13);
    expect(r.shortname).toBe('London');
    expect(r.data).toHaveLength(1);
    expect(r.data[0].from).toBe(open.from);
    expect(r.data[0].intensity.forecast).toBe(272);
  });

  it('generation and region list use the open slot too', async () => {
    vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
    mockFetch({
      '/generation/2026-10-29T20:52Z/2026-10-29T21:22Z': () =>
        json({ data: [{ ...open, generationmix: mix }] }),
      '/regional/intensity/2026-10-29T20:52Z/2026-10-29T21:22Z': () =>
        json({
          data: [
            {
              ...open,
              regions: [
                {
                  regionid: 1,
                  dnoregion: 'x',
                  shortname: 'North Scotland',
                  intensity: { forecast: 0, index: 'very low' },
                  generationmix: mix,
                },
              ],
            },
          ],
        }),
    });
    expect(await getGenerationMix()).toEqual(mix);
    const regions = await getAllRegions();
    expect(regions[0].shortname).toBe('North Scotland');
  });
});

describe('halfHourStart (return-refetch boundary check)', () => {
  it('floors to :00 / :30 UTC', async () => {
    const { halfHourStart } = await import('@/hooks/useCarbonData');
    expect(new Date(halfHourStart(NOW)).toISOString()).toBe('2026-10-29T20:30:00.000Z');
    expect(halfHourStart(Date.parse('2026-10-29T20:29:59Z'))).toBeLessThan(
      halfHourStart(Date.parse('2026-10-29T20:30:00Z')),
    );
  });
});
