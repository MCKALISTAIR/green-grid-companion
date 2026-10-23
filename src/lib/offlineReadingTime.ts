import { useSyncExternalStore } from 'react';
import { CARBON_QUERY_ROOTS } from '@/lib/voice/statesCopy';

/**
 * BH-88: the offline pill says how old the figure is, so it needs the
 * reading's own time (NESO's `from`), never when the app saved it.
 *
 * Home publishes the time of the reading its hero shows (useCarbonData's
 * `lastUpdated`). It is kept after Home unmounts, so other screens show the
 * same time. Before Home has shown a reading this session, the pill falls
 * back to `cachedReadingAt`.
 */
let heroReadingAt: number | null = null;
const listeners = new Set<() => void>();

export function setHeroReadingAt(at: number | null): void {
  if (heroReadingAt === at) return;
  heroReadingAt = at;
  listeners.forEach((l) => l());
}

export function useHeroReadingAt(): number | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
    () => heroReadingAt,
    () => null,
  );
}

function parse(from: unknown): number | null {
  if (typeof from !== 'string') return null;
  const t = Date.parse(from);
  return Number.isFinite(t) ? t : null;
}

/**
 * The newest reading time held in the cached carbon queries: `from` of the
 * national reading, the first slot of a regional reading, or the latest
 * forecast slot that had started when that forecast was saved. Save times
 * (`dataUpdatedAt`) are only used to pick the forecast slot, never shown.
 */
export interface CachedQueryLike {
  queryKey: readonly unknown[];
  state: { data: unknown; dataUpdatedAt: number };
}

export function cachedReadingAt(queries: readonly CachedQueryLike[]): number | null {
  let latest: number | null = null;
  const consider = (t: number | null) => {
    if (t !== null && (latest === null || t > latest)) latest = t;
  };
  for (const q of queries) {
    const root = String(q.queryKey[0]);
    const data = q.state.data as unknown;
    if (!CARBON_QUERY_ROOTS.has(root) || data == null) continue;
    if (root === 'forecast') {
      if (!Array.isArray(data)) continue;
      for (const slot of data as { from?: unknown }[]) {
        const t = parse(slot?.from);
        if (t !== null && t <= q.state.dataUpdatedAt) consider(t);
      }
    } else if (Array.isArray(data)) {
      // ['regional', 'all'] is the region list, not a reading.
      continue;
    } else if (root === 'regional') {
      const rows = (data as { data?: { from?: unknown }[] }).data;
      if (Array.isArray(rows)) consider(parse(rows[0]?.from));
    } else {
      consider(parse((data as { from?: unknown }).from));
    }
  }
  return latest;
}
