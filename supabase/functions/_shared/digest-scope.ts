/**
 * BH-26: scope digest footprint data to the subscriber's own meter(s).
 * carbon_footprint rows are keyed by MPAN; octopus_meters maps user_id -> mpan.
 * Anonymous subscribers (no user_id) and users without a meter get no rows.
 */
export interface MeterLink {
  user_id: string;
  mpan: string;
}

export interface ScopedSubscription {
  user_id?: string | null;
}

export function mpansByUser(meters: MeterLink[] | null | undefined): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  for (const m of meters ?? []) {
    if (!m?.user_id || !m?.mpan) continue;
    if (!out.has(m.user_id)) out.set(m.user_id, new Set());
    out.get(m.user_id)!.add(m.mpan);
  }
  return out;
}

export function rowsForSubscriber<R extends { mpan: string }>(
  sub: ScopedSubscription,
  byUser: Map<string, Set<string>>,
  rows: R[] | null | undefined,
): R[] {
  if (!sub.user_id) return [];
  const mpans = byUser.get(sub.user_id);
  if (!mpans || mpans.size === 0) return [];
  return (rows ?? []).filter((r) => mpans.has(r.mpan));
}

/** Unique user ids of the subscriptions, for the octopus_meters lookup. */
export function subscriberUserIds(subs: ScopedSubscription[]): string[] {
  return [...new Set(subs.map((s) => s.user_id).filter((u): u is string => !!u))];
}
