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

export function hasUnseenBadge(achievements: Unlock[], seenAt: string | null): boolean {
  const newest = achievements
    .filter((a) => a.unlocked && a.unlockedAt)
    .map((a) => Date.parse(a.unlockedAt as string))
    .filter(Number.isFinite)
    .sort((a, b) => b - a)[0];
  if (newest === undefined) return false;
  const seen = seenAt ? Date.parse(seenAt) : NaN;
  return !(Number.isFinite(seen) && seen >= newest);
}

export function getTrophySeenAt(): string | null {
  return appStorage.getItem(TROPHY_SEEN_KEY);
}

function readUnseen(): boolean {
  try {
    const raw = appStorage.getItem(ACHIEVEMENTS_KEY);
    return hasUnseenBadge(raw ? (JSON.parse(raw) as Unlock[]) : [], getTrophySeenAt());
  } catch {
    return false;
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
  const [unseen, setUnseen] = useState(readUnseen);
  useEffect(() => {
    const update = () => setUnseen(readUnseen());
    window.addEventListener(EVENT, update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener(EVENT, update);
      window.removeEventListener('storage', update);
    };
  }, []);
  return unseen;
}
