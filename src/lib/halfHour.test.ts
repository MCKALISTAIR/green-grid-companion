import { describe, it, expect } from 'vitest';
import { halfHourKey, halfHourKeyToIso, normaliseHalfHour } from './halfHour';
import * as deno from '../../supabase/functions/_shared/half-hour.ts';

// BH-91: NESO, the DB and Octopus spell the same half-hour three ways.
const SAME_SLOT = ['2026-07-30T22:30Z', '2026-07-30T22:30:00+00:00', '2026-07-30T23:30:00+01:00'];

const CASES: Array<string | Date | number | null | undefined> = [
  ...SAME_SLOT,
  '2026-07-30T22:30:00.000Z',
  '2026-07-30T22:59:59Z',
  '2026-10-25T01:00:00+01:00',
  '2026-10-25T01:30:00+01:00',
  '2026-10-25T01:00:00Z',
  '2026-10-25T01:30:00Z',
  '2026-03-29T00:30:00Z',
  '2026-03-29T02:00:00+01:00',
  '2026-10-25T01:30:00', // no zone: rejected
  'nope',
  '',
  null,
  undefined,
  new Date('2026-10-25T01:00:00Z'),
  Date.UTC(2026, 9, 25, 1, 15),
];

describe('halfHourKey (src mirror)', () => {
  it('gives NESO "Z", DB "+00:00" and Octopus "+01:00" the same key', () => {
    const keys = SAME_SLOT.map(halfHourKey);
    expect(new Set(keys).size).toBe(1);
    expect(normaliseHalfHour(SAME_SLOT[2])).toBe('2026-07-30T22:30:00.000Z');
  });

  it('maps the repeated 01:00-02:00 hour on 25 Oct 2026 to four distinct UTC half-hours', () => {
    const isos = [
      '2026-10-25T01:00:00+01:00',
      '2026-10-25T01:30:00+01:00',
      '2026-10-25T01:00:00Z',
      '2026-10-25T01:30:00Z',
    ].map(normaliseHalfHour);
    expect(isos).toEqual([
      '2026-10-25T00:00:00.000Z',
      '2026-10-25T00:30:00.000Z',
      '2026-10-25T01:00:00.000Z',
      '2026-10-25T01:30:00.000Z',
    ]);
  });

  it('keeps BST/GMT boundary slots adjacent (29 Mar and 25 Oct 2026)', () => {
    expect(halfHourKey('2026-03-29T02:00:00+01:00')! - halfHourKey('2026-03-29T00:30:00Z')!).toBe(
      1,
    );
    expect(halfHourKey('2026-10-25T01:00:00Z')! - halfHourKey('2026-10-25T01:30:00+01:00')!).toBe(
      1,
    );
  });

  it('rejects zoneless strings rather than guessing the device zone', () => {
    expect(halfHourKey('2026-10-25T01:30:00')).toBeNull();
  });

  it('round-trips', () => {
    const k = halfHourKey('2026-10-25T01:30:00Z')!;
    expect(halfHourKey(halfHourKeyToIso(k))).toBe(k);
  });

  it('agrees with the Deno copy in supabase/functions/_shared/half-hour.ts', () => {
    for (const c of CASES) {
      expect(halfHourKey(c)).toBe(deno.halfHourKey(c));
      expect(normaliseHalfHour(c)).toBe(deno.normaliseHalfHour(c));
    }
    expect(deno.HALF_HOUR_MS).toBe(30 * 60 * 1000);
  });
});
