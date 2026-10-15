/**
 * Home trophy chip: only shown while there's a badge you haven't seen yet, for
 * up to TROPHY_CHIP_DAYS after it unlocked, and hidden once you've visited the
 * Trophy Room since then (Alistair, 15 Oct 2026). The Trophy Room stays reachable
 * from Settings > Badges.
 */
import { appStorage } from '@/lib/appStorage';

export const TROPHY_SEEN_KEY = 'gridsense-trophy-seen-at';
export const TROPHY_CHIP_DAYS = 3;

type Unlock = { unlocked: boolean; unlockedAt?: string };

export function shouldShowTrophyChip(
  achievements: Unlock[],
  seenAt: string | null,
  now: Date = new Date(),
): boolean {
  const newest = achievements
    .filter((a) => a.unlocked && a.unlockedAt)
    .map((a) => Date.parse(a.unlockedAt as string))
    .filter(Number.isFinite)
    .sort((a, b) => b - a)[0];
  if (newest === undefined) return false;
  if (now.getTime() - newest > TROPHY_CHIP_DAYS * 86400000) return false;
  const seen = seenAt ? Date.parse(seenAt) : NaN;
  return !(Number.isFinite(seen) && seen >= newest);
}

export function getTrophySeenAt(): string | null {
  return appStorage.getItem(TROPHY_SEEN_KEY);
}

export function markTrophyRoomSeen(now: Date = new Date()): void {
  appStorage.setItem(TROPHY_SEEN_KEY, now.toISOString());
}
