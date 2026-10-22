import { describe, expect, it } from 'vitest';
import { countUnseenBadges, hasUnseenBadge } from './trophyChip';

const now = Date.parse('2026-10-15T20:00:00Z');
const at = (h: number) => new Date(now - h * 3600000).toISOString();

describe('hasUnseenBadge', () => {
  it('false with no badges', () => {
    expect(hasUnseenBadge([{ unlocked: false }], null)).toBe(false);
  });
  it('true for an unseen badge', () => {
    expect(hasUnseenBadge([{ unlocked: true, unlockedAt: at(2) }], null)).toBe(true);
  });
  it('false once seen', () => {
    expect(hasUnseenBadge([{ unlocked: true, unlockedAt: at(2) }], at(1))).toBe(false);
  });
  it('true again for a badge unlocked after the last visit', () => {
    expect(
      hasUnseenBadge(
        [
          { unlocked: true, unlockedAt: at(48) },
          { unlocked: true, unlockedAt: at(1) },
        ],
        at(24),
      ),
    ).toBe(true);
  });
  it('no expiry: an old unseen badge still counts', () => {
    expect(hasUnseenBadge([{ unlocked: true, unlockedAt: at(24 * 30) }], null)).toBe(true);
  });
});

describe('countUnseenBadges', () => {
  it('counts only badges unlocked after the last visit', () => {
    const list = [
      { unlocked: true, unlockedAt: at(5) },
      { unlocked: true, unlockedAt: at(2) },
      { unlocked: true, unlockedAt: at(1) },
      { unlocked: false },
    ];
    expect(countUnseenBadges(list, null)).toBe(3);
    expect(countUnseenBadges(list, at(3))).toBe(2);
    expect(countUnseenBadges(list, at(0))).toBe(0);
  });
});
