import { describe, it, expect, vi, afterEach } from 'vitest';
import { checkPostcodeExists } from '@/lib/location';

const respond = (status: number, body: unknown) =>
  vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }));

afterEach(() => vi.unstubAllGlobals());

describe('checkPostcodeExists', () => {
  it('flags a made-up full postcode (ZZ99 9ZZ) as missing', async () => {
    const f = respond(404, { status: 404, error: 'Postcode not found' });
    vi.stubGlobal('fetch', f);
    expect(await checkPostcodeExists('ZZ99 9ZZ')).toBe('missing');
    expect(String(f.mock.calls[0][0])).toContain('/postcodes/ZZ999ZZ');
  });

  it('uses /outcodes/ for outward codes', async () => {
    const f = respond(200, { status: 200, result: { outcode: 'EX4' } });
    vi.stubGlobal('fetch', f);
    expect(await checkPostcodeExists('ex4')).toBe('ok');
    expect(String(f.mock.calls[0][0])).toContain('/outcodes/EX4');
  });

  it("returns 'unknown' when postcodes.io is down or unreachable", async () => {
    vi.stubGlobal('fetch', respond(503, {}));
    expect(await checkPostcodeExists('SW1A 1AA')).toBe('unknown');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    expect(await checkPostcodeExists('SW1A')).toBe('unknown');
  });
});
