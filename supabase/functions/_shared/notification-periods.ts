// Period keys + "already sent for this period" guard for scheduled push jobs.
//
// Each scheduled job claims (job_name, period_key, subscription_id) rows in
// public.scheduled_notification_log BEFORE sending. The table's primary key
// makes the claim atomic: a duplicate cron run (or a replayed request) gets
// no rows back for subscriptions that were already claimed, so nobody is
// notified twice for the same period. Delivery is therefore at-most-once.
//
// Runtime-agnostic so it can be unit tested from Vitest.

export type ScheduledJobName = 'daily-forecast' | 'weekly-digest' | 'monthly-report';

/** UK calendar date (YYYY-MM-DD) for `now`, given the UK UTC offset in hours (0 or 1). */
export function ukDatePeriodKey(now: Date, ukOffsetHours: number): string {
  const uk = new Date(now.getTime() + ukOffsetHours * 60 * 60 * 1000);
  return uk.toISOString().slice(0, 10);
}

/** ISO-8601 week key (e.g. "2026-W40") for the UTC date of `now`. */
export function isoWeekPeriodKey(now: Date): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dayNum = d.getUTCDay() || 7; // Mon=1..Sun=7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum); // nearest Thursday
  const isoYear = d.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${isoYear}-W${String(week).padStart(2, '0')}`;
}

/** Month key (YYYY-MM) for a 0-based month index. */
export function monthPeriodKey(year: number, monthIndex: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
}

// Minimal structural type for the supabase-js query builder we use, so this
// module does not depend on the esm.sh import (keeps it testable in Node).
export interface NotificationLogClient {
  from(table: string): {
    upsert(
      rows: Array<Record<string, unknown>>,
      options: { onConflict: string; ignoreDuplicates: boolean },
    ): {
      select(
        columns: string,
      ): PromiseLike<{ data: Array<{ subscription_id: string }> | null; error: unknown }>;
    };
  };
}

/**
 * Atomically claim the given subscriptions for (job, period). Returns the set
 * of subscription ids that were newly claimed (i.e. not already sent). On a DB
 * error this fails closed and returns an empty set, so a broken log table can
 * never cause duplicate sends.
 */
export async function claimSubscriptionsForPeriod(
  supabase: NotificationLogClient,
  job: ScheduledJobName,
  periodKey: string,
  subscriptionIds: string[],
): Promise<Set<string>> {
  const unique = [...new Set(subscriptionIds.filter(Boolean))];
  if (unique.length === 0) return new Set();

  const { data, error } = await supabase
    .from('scheduled_notification_log')
    .upsert(
      unique.map((id) => ({ job_name: job, period_key: periodKey, subscription_id: id })),
      { onConflict: 'job_name,period_key,subscription_id', ignoreDuplicates: true },
    )
    .select('subscription_id');

  if (error) {
    console.error(
      `[IDEMPOTENCY] Failed to claim ${job} ${periodKey}; skipping sends to avoid duplicates`,
      error,
    );
    return new Set();
  }

  return new Set((data || []).map((r) => r.subscription_id));
}
