import { describe, expect, it } from 'vitest';
import { needsCompactBadge } from './useHeroTopRowFit';

describe('needsCompactBadge', () => {
  it('keeps the full pill when the row and pill fit with an 8px gap', () => {
    // 390 wide: row 16..200, full pill 110 wide ending at 374.
    expect(needsCompactBadge(16, 184, 374, 110)).toBe(false);
  });
  it('collapses when the full pill would touch the row', () => {
    // 320 wide: row 16..262 (North West England + GB-average dot).
    expect(needsCompactBadge(16, 246, 304, 110)).toBe(true);
  });
  it('collapses at exactly less than the gap', () => {
    expect(needsCompactBadge(0, 100, 217, 110)).toBe(true);
    expect(needsCompactBadge(0, 100, 218, 110)).toBe(false);
  });
});
