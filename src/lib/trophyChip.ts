/**
 * "New badge" pill (hero-v2 §4, approved 15 Oct 2026): shown top-right on Home
 * only while an unseen badge exists, with a 10px dot on the Rank tab. Opening
 * the Trophy Room or the Rank tab marks badges seen and clears both. No expiry.
 * The seen-at time is in the Preferences store (see MIGRATED_KEYS).
 */
import { useEffect, useState } from 'react';
import { appStorage } from '@/lib/appStorage';

export const TROPHY_SEEN_KEY = 'gridsense-trophy-seen-at';
const ACHIEVEMENTS_KEY = 'gridgreen-achievements-v1';
const EVENT = 'gridsense-badges-changed';
/** Routes that count as having seen your badges. */
export const BADGE_SEEN_PATHS = ['/achievements', '/map'];

type Unlock = { unlocked: boolean; unlockedAt?: string };

/** How many unlocked badges are newer than the last Trophy Room visit. */
export function countUnseenBadges(achievements: Unlock[], seenAt: string | null): number {
  const seen = seenAt ? Date.parse(seenAt) : NaN;
  return achievements
    .filter((a) => a.unlocked && a.unlockedAt)
    .map((a) => Date.parse(a.unlockedAt as string))
    .filter(Number.isFinite)
    .filter((t) => !(Number.isFinite(seen) && seen >= t)).length;
}

export function hasUnseenBadge(achievements: Unlock[], seenAt: string | null): boolean {
  return countUnseenBadges(achievements, seenAt) > 0;
}

export function getTrophySeenAt(): string | null {
  return appStorage.getItem(TROPHY_SEEN_KEY);
}

function readUnseenCount(): number {
  try {
    const raw = appStorage.getItem(ACHIEVEMENTS_KEY);
    return countUnseenBadges(raw ? (JSON.parse(raw) as Unlock[]) : [], getTrophySeenAt());
  } catch {
    return 0;
  }
}

export function markBadgesSeen(now: Date = new Date()): void {
  appStorage.setItem(TROPHY_SEEN_KEY, now.toISOString());
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVENT));
}

/** Tell listeners a badge unlocked (called from useAchievements). */
export function notifyBadgesChanged(): void {
  // Deferred: callers run inside a setState updater, which mustn't update others.
  if (typeof window !== 'undefined') queueMicrotask(() => window.dispatchEvent(new Event(EVENT)));
}

/** Live "is there an unseen badge?" for the pill and the Rank-tab dot. */
export function useUnseenBadge(): boolean {
  return useUnseenBadgeCount() > 0;
}

/** Live count of unseen badges (the compact pill's count dot). */
export function useUnseenBadgeCount(): number {
  const [unseen, setUnseen] = useState(readUnseenCount);
  useEffect(() => {
    const update = () => setUnseen(readUnseenCount());
    window.addEventListener(EVENT, update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener(EVENT, update);
      window.removeEventListener('storage', update);
    };
  }, []);
  return unseen;
}
