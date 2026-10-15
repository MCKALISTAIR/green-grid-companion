import { describe, expect, it } from 'vitest';
import { shouldShowTrophyChip } from './trophyChip';

const now = new Date('2026-10-15T20:00:00Z');
const at = (h: number) => new Date(now.getTime() - h * 3600000).toISOString();

describe('shouldShowTrophyChip', () => {
  it('hidden with no badges', () => {
    expect(shouldShowTrophyChip([{ unlocked: false }], null, now)).toBe(false);
  });
  it('shown for a new, unseen badge', () => {
    expect(shouldShowTrophyChip([{ unlocked: true, unlockedAt: at(2) }], null, now)).toBe(true);
  });
  it('hidden after the Trophy Room was visited', () => {
    expect(shouldShowTrophyChip([{ unlocked: true, unlockedAt: at(2) }], at(1), now)).toBe(false);
  });
  it('shown again for a badge unlocked after the last visit', () => {
    expect(
      shouldShowTrophyChip(
        [
          { unlocked: true, unlockedAt: at(48) },
          { unlocked: true, unlockedAt: at(1) },
        ],
        at(24),
        now,
      ),
    ).toBe(true);
  });
  it('hidden after 3 days even if never visited', () => {
    expect(shouldShowTrophyChip([{ unlocked: true, unlockedAt: at(73) }], null, now)).toBe(false);
  });
});
