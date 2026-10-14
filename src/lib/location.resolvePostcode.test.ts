import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolvePostcode, clearPostcodeLookupCache } from './location';

const ok = (lat: number, lon: number) =>
  new Response(JSON.stringify({ status: 200, result: { latitude: lat, longitude: lon } }), {
    status: 200,
  });
const notFound = () =>
  new Response(JSON.stringify({ status: 404, error: 'Invalid postcode' }), { status: 404 });

describe('resolvePostcode', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    clearPostcodeLookupCache();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('uses /outcodes/ for a partial postcode like SW1A (no /postcodes/ 404)', async () => {
    fetchMock.mockResolvedValue(ok(51.5, -0.13));
    expect(await resolvePostcode('SW1A')).toEqual({ lat: 51.5, lon: -0.13 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.postcodes.io/outcodes/SW1A');
  });

  it('uses /postcodes/ for a full postcode', async () => {
    fetchMock.mockResolvedValue(ok(51.501, -0.141));
    expect(await resolvePostcode('sw1a 1aa')).toEqual({ lat: 51.501, lon: -0.141 });
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.postcodes.io/postcodes/SW1A1AA');
  });

  it('falls back to the outward code when a full postcode is unknown', async () => {
    fetchMock.mockResolvedValueOnce(notFound()).mockResolvedValueOnce(ok(51.5, -0.13));
    expect(await resolvePostcode('SW1A 9ZZ')).toEqual({ lat: 51.5, lon: -0.13 });
    expect(fetchMock.mock.calls[1][0]).toBe('https://api.postcodes.io/outcodes/SW1A');
  });

  it('maps broad areas and region names to a representative outcode', async () => {
    fetchMock.mockResolvedValue(ok(55.95, -3.19));
    expect(await resolvePostcode('EH')).toEqual({ lat: 55.95, lon: -3.19 });
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.postcodes.io/outcodes/EH1');
    await resolvePostcode('Scotland');
    expect(fetchMock.mock.calls.map((c) => c[0])).not.toContain(
      'https://api.postcodes.io/postcodes/EH',
    );
  });

  it('de-duplicates concurrent lookups for the same postcode', async () => {
    fetchMock.mockResolvedValue(ok(51.5, -0.13));
    await Promise.all([resolvePostcode('SW1A'), resolvePostcode('sw1a')]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
