import { format, formatDistanceToNow } from 'date-fns';

/** BH-127: a meter with no reading newer than this is treated as stalled. */
export const OCTOPUS_STALE_AFTER_MS = 48 * 60 * 60 * 1000;

export interface OctopusFreshness {
  /** Newest half-hour we hold for any of the user's meters, or null if none. */
  newest: Date | null;
  /** True when we hold readings but the newest is older than 48 hours. */
  stale: boolean;
  /** e.g. "30 Jul, 23:30", in the device's time zone. */
  newestLabel: string | null;
  /** e.g. "3 months ago". */
  newestAgo: string | null;
}

/**
 * How fresh the user's Octopus data is, from get-status `latest_consumption`
 * (newest interval_start). Uses the newest reading, not last_sync_at, because
 * last_sync_at can move without any new readings arriving.
 */
export function octopusFreshness(
  latestConsumption: string | null | undefined,
  now: Date = new Date(),
): OctopusFreshness {
  const ms = latestConsumption ? Date.parse(latestConsumption) : NaN;
  if (!Number.isFinite(ms)) {
    return { newest: null, stale: false, newestLabel: null, newestAgo: null };
  }
  const newest = new Date(ms);
  return {
    newest,
    stale: now.getTime() - ms > OCTOPUS_STALE_AFTER_MS,
    newestLabel: format(newest, 'd MMM, HH:mm'),
    newestAgo: formatDistanceToNow(newest, { addSuffix: true }),
  };
}
