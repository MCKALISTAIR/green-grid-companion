import { describe, expect, it } from 'vitest';
import { formatLondonTime, formatLondonTimeWithDay, londonDayLabel } from './londonTime';

describe('londonTime', () => {
  it('shows BST times an hour ahead of UTC in summer', () => {
    expect(formatLondonTime(new Date('2026-10-10T13:30:00Z'))).toBe('14:30');
  });

  it('shows GMT times equal to UTC in winter', () => {
    expect(formatLondonTime(new Date('2026-12-01T13:30:00Z'))).toBe('13:30');
  });

  it('labels today, tomorrow and later days in UK time', () => {
    const now = new Date('2026-10-10T13:00:00Z');
    expect(londonDayLabel(new Date('2026-10-10T22:30:00Z'), now)).toBe('');
    // 23:30Z on the 10th is 00:30 BST on the 11th
    expect(londonDayLabel(new Date('2026-10-10T23:30:00Z'), now)).toBe('tomorrow');
    expect(londonDayLabel(new Date('2026-10-12T12:00:00Z'), now)).toBe('Monday');
    expect(formatLondonTimeWithDay(new Date('2026-10-10T23:30:00Z'), now)).toBe('00:30 tomorrow');
  });

  it('handles the clocks going back', () => {
    // 25 Oct 2026: BST ends at 01:00 UTC.
    const now = new Date('2026-10-24T20:00:00Z');
    expect(londonDayLabel(new Date('2026-10-25T12:00:00Z'), now)).toBe('tomorrow');
    expect(formatLondonTime(new Date('2026-10-25T12:00:00Z'))).toBe('12:00');
  });
});
