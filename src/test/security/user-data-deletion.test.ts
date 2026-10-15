import { describe, it, expect } from 'vitest';
import {
  deleteOctopusUsageData,
  type UserDataClient,
} from '../../../supabase/functions/_shared/user-data.ts';
import {
  isDeadPushToken,
  removeDeadPushTokens,
} from '../../../supabase/functions/_shared/push-cleanup.ts';

function fakeClient(opts: { meters: string[]; failOn?: string }) {
  const calls: string[] = [];
  const result = (table: string) =>
    Promise.resolve({ error: opts.failOn === table ? { message: 'boom' } : null });
  const client: UserDataClient = {
    from(table) {
      return {
        select: () => ({
          eq: () => Promise.resolve({ data: opts.meters.map((mpan) => ({ mpan })), error: null }),
        }),
        delete: () => ({
          eq: (col, val) => {
            calls.push(`delete ${table} ${col}=${val}`);
            return result(table);
          },
          in: (col, vals) => {
            calls.push(`delete ${table} ${col} in ${vals.join(',')}`);
            return result(table);
          },
        }),
      };
    },
  };
  return { client, calls };
}

describe('deleteOctopusUsageData (disconnect + account delete)', () => {
  it('deletes readings, footprint and dispatches before the meters', async () => {
    const { client, calls } = fakeClient({ meters: ['M1', 'M2'] });
    const r = await deleteOctopusUsageData(client, 'u1');
    expect(r).toEqual({ mpans: 2, errors: [] });
    expect(calls).toEqual([
      'delete octopus_intelligent_dispatches user_id=u1',
      'delete carbon_footprint mpan in M1,M2',
      'delete octopus_consumption mpan in M1,M2',
      'delete octopus_meters user_id=u1',
    ]);
  });

  it('still deletes dispatches when there are no meters', async () => {
    const { client, calls } = fakeClient({ meters: [] });
    await deleteOctopusUsageData(client, 'u1');
    expect(calls).toEqual([
      'delete octopus_intelligent_dispatches user_id=u1',
      'delete octopus_meters user_id=u1',
    ]);
  });

  it('keeps the meters (so readings stay findable) if a reading delete fails', async () => {
    const { client, calls } = fakeClient({ meters: ['M1'], failOn: 'octopus_consumption' });
    const r = await deleteOctopusUsageData(client, 'u1');
    expect(r.errors[0]).toMatch(/octopus_consumption/);
    expect(calls).not.toContain('delete octopus_meters user_id=u1');
  });
});

describe('dead push tokens', () => {
  it('only treats permanent errors as dead', () => {
    expect(isDeadPushToken('apns', 410, '{"reason":"Unregistered"}')).toBe(true);
    expect(isDeadPushToken('apns', 400, '{"reason":"BadDeviceToken"}')).toBe(false);
    expect(
      isDeadPushToken(
        'fcm',
        404,
        '{"error":{"status":"NOT_FOUND","details":[{"errorCode":"UNREGISTERED"}]}}',
      ),
    ).toBe(true);
    expect(isDeadPushToken('fcm', 500, 'UNREGISTERED')).toBe(false);
  });

  it('deletes unique dead tokens and never throws', async () => {
    const seen: string[][] = [];
    const quiet = { info: () => {}, error: () => {} };
    expect(
      await removeDeadPushTokens(
        ['a', 'a', 'b'],
        async (t) => {
          seen.push(t);
          return { error: null };
        },
        quiet,
      ),
    ).toBe(2);
    expect(seen).toEqual([['a', 'b']]);
    expect(await removeDeadPushTokens([], async () => ({ error: null }), quiet)).toBe(0);
    expect(
      await removeDeadPushTokens(
        ['a'],
        async () => {
          throw new Error('x');
        },
        quiet,
      ),
    ).toBe(0);
  });
});
