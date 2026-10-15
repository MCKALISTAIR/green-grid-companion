import { describe, expect, it } from 'vitest';
import {
  formatLondonLongDate,
  formatLondonShortDay,
  formatLondonShortWeekday,
  formatLondonTime,
  londonDayLabel,
} from '@/lib/londonTime';

// These run the same whatever TZ the test machine uses: labels are pinned to UK time.
describe('London-pinned forecast labels', () => {
  it('shows UK clock time across the 25 Oct 2026 BST->GMT change', () => {
    expect(formatLondonTime(new Date('2026-10-25T00:30:00Z'))).toBe('01:30'); // BST
    expect(formatLondonTime(new Date('2026-10-25T01:30:00Z'))).toBe('01:30'); // GMT
    expect(formatLondonTime(new Date('2026-10-25T02:00:00Z'))).toBe('02:00');
  });

  it('uses the UK calendar day for day labels near midnight', () => {
    const now = new Date('2026-10-15T12:00:00Z');
    expect(londonDayLabel(new Date('2026-10-15T23:30:00Z'), now)).toBe('tomorrow'); // 00:30 BST on 16th
    expect(formatLondonShortDay(new Date('2026-10-24T23:30:00Z'))).toBe('Sun 25');
    expect(formatLondonShortWeekday(new Date('2026-10-24T23:30:00Z'))).toBe('Sun');
    expect(formatLondonLongDate(new Date('2026-10-24T23:30:00Z'))).toBe('Sunday, 25 Oct');
  });
});
