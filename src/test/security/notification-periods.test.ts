import { describe, it, expect, vi } from 'vitest';
import {
  ukDatePeriodKey,
  isoWeekPeriodKey,
  monthPeriodKey,
  claimSubscriptionsForPeriod,
  type NotificationLogClient,
} from '../../../supabase/functions/_shared/notification-periods.ts';

describe('period keys', () => {
  it('computes ISO week keys, including year boundaries', () => {
    expect(isoWeekPeriodKey(new Date('2026-10-03T09:00:00Z'))).toBe('2026-W40');
    expect(isoWeekPeriodKey(new Date('2026-10-04T09:00:00Z'))).toBe('2026-W40'); // Sunday run
    expect(isoWeekPeriodKey(new Date('2021-01-03T09:00:00Z'))).toBe('2020-W53');
    expect(isoWeekPeriodKey(new Date('2024-12-30T09:00:00Z'))).toBe('2025-W01');
  });

  it('computes the UK calendar date across midnight in BST', () => {
    // 23:30 UTC on 3 Oct is 00:30 BST on 4 Oct
    expect(ukDatePeriodKey(new Date('2026-10-03T23:30:00Z'), 1)).toBe('2026-10-04');
    expect(ukDatePeriodKey(new Date('2026-12-03T23:30:00Z'), 0)).toBe('2026-12-03');
  });

  it('computes month keys from 0-based months', () => {
    expect(monthPeriodKey(2026, 8)).toBe('2026-09');
    expect(monthPeriodKey(2025, 11)).toBe('2025-12');
  });
});

function mockClient(result: { data: Array<{ subscription_id: string }> | null; error: unknown }) {
  const select = vi.fn().mockResolvedValue(result);
  const upsert = vi.fn().mockReturnValue({ select });
  const from = vi.fn().mockReturnValue({ upsert });
  return { client: { from } as unknown as NotificationLogClient, from, upsert, select };
}

describe('claimSubscriptionsForPeriod (already-sent guard)', () => {
  it('only returns subscriptions newly claimed for this period', async () => {
    const { client, from, upsert } = mockClient({ data: [{ subscription_id: 'b' }], error: null });
    const claimed = await claimSubscriptionsForPeriod(client, 'weekly-digest', '2026-W40', [
      'a',
      'b',
      'b',
    ]);
    expect(from).toHaveBeenCalledWith('scheduled_notification_log');
    expect(upsert).toHaveBeenCalledWith(
      [
        { job_name: 'weekly-digest', period_key: '2026-W40', subscription_id: 'a' },
        { job_name: 'weekly-digest', period_key: '2026-W40', subscription_id: 'b' },
      ],
      { onConflict: 'job_name,period_key,subscription_id', ignoreDuplicates: true },
    );
    expect([...claimed]).toEqual(['b']);
  });

  it('fails closed (sends nothing) if the log cannot be written', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { client } = mockClient({ data: null, error: { message: 'boom' } });
    const claimed = await claimSubscriptionsForPeriod(client, 'daily-forecast', '2026-10-03', [
      'a',
    ]);
    expect(claimed.size).toBe(0);
    spy.mockRestore();
  });

  it('does not hit the database when there is nothing to claim', async () => {
    const { client, from } = mockClient({ data: [], error: null });
    expect((await claimSubscriptionsForPeriod(client, 'monthly-report', '2026-09', [])).size).toBe(
      0,
    );
    expect(from).not.toHaveBeenCalled();
  });
});
