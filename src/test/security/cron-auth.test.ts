import { describe, it, expect } from 'vitest';
import {
  verifyCronRequest,
  timingSafeEqual,
  cronAuthErrorResponse,
  CRON_SECRET_HEADER,
} from '../../../supabase/functions/_shared/cron-auth.ts';

const SECRET = 'a'.repeat(16) + '0123456789abcdef0123456789abcdef';

function req(headers: Record<string, string> = {}) {
  return new Request('https://example.supabase.co/functions/v1/daily-forecast', { method: 'POST', headers });
}

describe('verifyCronRequest', () => {
  it('rejects every request when CRON_SECRET is not configured (fails closed)', async () => {
    for (const configured of [undefined, null, '']) {
      const r = await verifyCronRequest(req({ [CRON_SECRET_HEADER]: 'anything' }), configured);
      expect(r).toEqual({ ok: false, status: 500, error: expect.any(String) });
    }
  });

  it('rejects when the configured secret is too short', async () => {
    const r = await verifyCronRequest(req({ [CRON_SECRET_HEADER]: 'short' }), 'short');
    expect(r).toEqual({ ok: false, status: 500, error: expect.any(String) });
  });

  it('rejects a request with no secret header (e.g. anon key only)', async () => {
    const r = await verifyCronRequest(
      req({ Authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.anon.key', apikey: 'anon' }),
      SECRET,
    );
    expect(r).toEqual({ ok: false, status: 401, error: 'Unauthorized' });
  });

  it('rejects a wrong secret, including prefixes and different lengths', async () => {
    for (const wrong of [SECRET.slice(0, -1), SECRET + 'x', SECRET.toUpperCase(), 'nope']) {
      const r = await verifyCronRequest(req({ [CRON_SECRET_HEADER]: wrong }), SECRET);
      expect(r).toEqual({ ok: false, status: 401, error: 'Unauthorized' });
    }
  });

  it('accepts the correct secret', async () => {
    const r = await verifyCronRequest(req({ [CRON_SECRET_HEADER]: SECRET }), SECRET);
    expect(r).toEqual({ ok: true });
  });

  it('does not accept the secret via Authorization header', async () => {
    const r = await verifyCronRequest(req({ Authorization: `Bearer ${SECRET}` }), SECRET);
    expect(r.ok).toBe(false);
  });
});

describe('timingSafeEqual', () => {
  it('compares strings correctly', async () => {
    expect(await timingSafeEqual('abc', 'abc')).toBe(true);
    expect(await timingSafeEqual('abc', 'abd')).toBe(false);
    expect(await timingSafeEqual('abc', 'abcd')).toBe(false);
    expect(await timingSafeEqual('', '')).toBe(true);
  });
});

describe('cronAuthErrorResponse', () => {
  it('returns a JSON response with the right status and no secret material', async () => {
    const res = cronAuthErrorResponse({ ok: false, status: 401, error: 'Unauthorized' }, { 'X-Test': '1' });
    expect(res.status).toBe(401);
    expect(res.headers.get('Content-Type')).toBe('application/json');
    expect(res.headers.get('X-Test')).toBe('1');
    expect(await res.json()).toEqual({ error: 'Unauthorized' });
  });
});
