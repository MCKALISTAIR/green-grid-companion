import { describe, expect, it } from 'vitest';
import {
  formatLondonDateTime,
  formatLondonDayMonth,
  formatLondonSlotSpoken,
  formatLondonSlotTime,
  londonRepeatedZone,
  isRepeatedLondonTime,
  londonDateKey,
  londonDayBounds,
  londonMidnight,
  nextDateKey,
  pickedDateKey,
} from '@/lib/londonTime';

// Results must not depend on the machine zone; also run with TZ=America/New_York (see PR).
describe('London day bounds (BH-68)', () => {
  it('ordinary BST and GMT days', () => {
    expect(londonDayBounds('2026-10-01')).toEqual({
      from: new Date('2026-09-30T23:00:00.000Z'),
      to: new Date('2026-10-01T22:59:59.999Z'),
    });
    expect(londonMidnight('2026-12-01').toISOString()).toBe('2026-12-01T00:00:00.000Z');
  });

  it('25 Oct 2026 (fall back) is 25 hours', () => {
    const { from, to } = londonDayBounds('2026-10-25');
    expect(from.toISOString()).toBe('2026-10-24T23:00:00.000Z');
    expect(to.toISOString()).toBe('2026-10-25T23:59:59.999Z');
    expect(to.getTime() + 1 - from.getTime()).toBe(25 * 3600_000);
  });

  it('28 Mar 2027 (spring forward) is 23 hours', () => {
    const { from, to } = londonDayBounds('2027-03-28');
    expect(from.toISOString()).toBe('2027-03-28T00:00:00.000Z');
    expect(to.toISOString()).toBe('2027-03-28T22:59:59.999Z');
    expect(to.getTime() + 1 - from.getTime()).toBe(23 * 3600_000);
  });

  it('day keys step across clock changes and month ends', () => {
    expect(nextDateKey('2026-10-25')).toBe('2026-10-26');
    expect(nextDateKey('2027-03-28')).toBe('2027-03-29');
    expect(nextDateKey('2026-12-31')).toBe('2027-01-01');
    expect(pickedDateKey(new Date(2026, 9, 1))).toBe('2026-10-01');
  });

  it('midnight rollover uses the UK date', () => {
    expect(londonDateKey(new Date('2026-10-24T22:59:00Z'))).toBe('2026-10-24');
    expect(londonDateKey(new Date('2026-10-24T23:00:00Z'))).toBe('2026-10-25');
  });
});

describe('repeated 01:00 / 01:30 on 25 Oct 2026 (BH-72)', () => {
  it('tags the first pass BST and the second GMT', () => {
    expect(formatLondonSlotTime(new Date('2026-10-25T00:00:00Z'))).toBe('01:00 BST');
    expect(formatLondonSlotTime(new Date('2026-10-25T00:30:00Z'))).toBe('01:30 BST');
    expect(formatLondonSlotTime(new Date('2026-10-24T23:30:00Z'))).toBe('00:30');
    expect(formatLondonSlotTime(new Date('2026-10-25T01:00:00Z'))).toBe('01:00 GMT');
    expect(formatLondonSlotTime(new Date('2026-10-25T01:30:00Z'))).toBe('01:30 GMT');
    expect(formatLondonSlotTime(new Date('2026-10-25T02:00:00Z'))).toBe('02:00');
  });

  it('only the repeated hour is flagged, never on spring-forward day', () => {
    const flagged: string[] = [];
    for (
      let t = Date.parse('2027-03-27T23:00:00Z');
      t < Date.parse('2027-03-29T00:00:00Z');
      t += 1800_000
    ) {
      if (isRepeatedLondonTime(new Date(t))) flagged.push(new Date(t).toISOString());
    }
    expect(flagged).toEqual([]);
    expect(isRepeatedLondonTime(new Date('2026-10-25T01:59:00Z'))).toBe(true);
    expect(isRepeatedLondonTime(new Date('2026-10-25T02:00:00Z'))).toBe(false);
  });

  it('spoken labels say which side of the change', () => {
    expect(formatLondonSlotSpoken(new Date('2026-10-25T00:00:00Z'))).toBe(
      '1 am BST, before the clocks went back',
    );
    expect(formatLondonSlotSpoken(new Date('2026-10-25T00:30:00Z'))).toBe(
      '1:30 am BST, before the clocks went back',
    );
    expect(formatLondonSlotSpoken(new Date('2026-10-25T01:00:00Z'))).toBe(
      '1 am GMT, after the clocks went back',
    );
    expect(formatLondonSlotSpoken(new Date('2026-10-25T01:30:00Z'))).toBe(
      '1:30 am GMT, after the clocks went back',
    );
    expect(formatLondonSlotSpoken(new Date('2026-10-25T02:00:00Z'))).toBe('02:00');
  });

  it('no tag anywhere on spring-forward day 28 Mar 2027', () => {
    for (
      let t = Date.parse('2027-03-27T23:00:00Z');
      t < Date.parse('2027-03-28T23:00:00Z');
      t += 1800_000
    ) {
      expect(londonRepeatedZone(new Date(t))).toBeNull();
    }
  });

  it('table and day labels', () => {
    expect(formatLondonDateTime(new Date('2026-10-25T01:30:00Z'))).toBe('25 Oct 2026, 01:30 GMT');
    expect(formatLondonDateTime(new Date('2026-10-24T23:30:00Z'))).toBe('25 Oct 2026, 00:30');
    expect(formatLondonDayMonth(new Date('2026-10-04T23:30:00Z'))).toBe('05 Oct');
  });
});
