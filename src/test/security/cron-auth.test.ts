import { describe, it, expect, vi } from 'vitest';
import {
  verifyCronRequest,
  timingSafeEqual,
  cronAuthErrorResponse,
  CRON_SECRET_HEADER,
  verifySchedulerRequest,
  createSchedulerSecretProvider,
  fetchSchedulerSecret,
} from '../../../supabase/functions/_shared/cron-auth.ts';

const SECRET = 'a'.repeat(16) + '0123456789abcdef0123456789abcdef';

function req(headers: Record<string, string> = {}) {
  return new Request('https://example.supabase.co/functions/v1/daily-forecast', {
    method: 'POST',
    headers,
  });
}

describe('verifyCronRequest', () => {
  it('rejects every request when the secret is not available (fails closed)', async () => {
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
    const res = cronAuthErrorResponse(
      { ok: false, status: 401, error: 'Unauthorized' },
      { 'X-Test': '1' },
    );
    expect(res.status).toBe(401);
    expect(res.headers.get('Content-Type')).toBe('application/json');
    expect(res.headers.get('X-Test')).toBe('1');
    expect(await res.json()).toEqual({ error: 'Unauthorized' });
  });
});

describe('verifySchedulerRequest (secret loaded from the database)', () => {
  it('rejects a request without the header without touching the database', async () => {
    const getSecret = vi.fn();
    expect(await verifySchedulerRequest(req({ apikey: 'anon' }), getSecret)).toEqual({
      ok: false,
      status: 401,
      error: 'Unauthorized',
    });
    expect(getSecret).not.toHaveBeenCalled();
  });

  it('fails closed with 503 (no throw) when the secret cannot be loaded, e.g. before the migration', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const missingRpc = vi
      .fn()
      .mockRejectedValue({ code: 'PGRST202', message: 'function not found' });
    expect(await verifySchedulerRequest(req({ [CRON_SECRET_HEADER]: SECRET }), missingRpc)).toEqual(
      { ok: false, status: 503, error: expect.any(String) },
    );
    expect(
      await verifySchedulerRequest(req({ [CRON_SECRET_HEADER]: SECRET }), async () => null),
    ).toMatchObject({ ok: false, status: 503 });
    spy.mockRestore();
  });

  it('accepts the right secret and rejects a wrong one', async () => {
    const getSecret = async () => SECRET;
    expect(await verifySchedulerRequest(req({ [CRON_SECRET_HEADER]: SECRET }), getSecret)).toEqual({
      ok: true,
    });
    expect(
      await verifySchedulerRequest(req({ [CRON_SECRET_HEADER]: 'x'.repeat(64) }), getSecret),
    ).toMatchObject({ ok: false, status: 401 });
  });
});

describe('fetchSchedulerSecret / createSchedulerSecretProvider', () => {
  it('calls the get_scheduler_secret RPC and throws on RPC errors', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: SECRET, error: null });
    expect(await fetchSchedulerSecret({ rpc })).toBe(SECRET);
    expect(rpc).toHaveBeenCalledWith('get_scheduler_secret');
    await expect(
      fetchSchedulerSecret({
        rpc: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST202' } }),
      }),
    ).rejects.toEqual({ code: 'PGRST202' });
    expect(
      await fetchSchedulerSecret({ rpc: vi.fn().mockResolvedValue({ data: '', error: null }) }),
    ).toBeNull();
  });

  it('caches successes for the TTL, does not cache failures, and dedupes concurrent loads', async () => {
    let t = 0;
    const fetcher = vi
      .fn()
      .mockRejectedValueOnce(new Error('not migrated yet'))
      .mockResolvedValue(SECRET);
    const get = createSchedulerSecretProvider(fetcher, { ttlMs: 1000, now: () => t });
    await expect(get()).rejects.toThrow('not migrated yet');
    const [a, b] = await Promise.all([get(), get()]);
    expect([a, b]).toEqual([SECRET, SECRET]);
    expect(fetcher).toHaveBeenCalledTimes(2);
    t = 999;
    await get();
    expect(fetcher).toHaveBeenCalledTimes(2);
    t = 2000;
    await get();
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
});
