import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  londonHour,
  londonMonthBounds,
  londonWeekOfMonth,
  previousLondonMonth,
} from './london-month.ts';

const iso = (b: { start: Date; endExclusive: Date }) => [
  b.start.toISOString(),
  b.endExclusive.toISOString(),
];

Deno.test('BH-71: BST month starts at London midnight (23:00Z the day before)', () => {
  // Sep 2026 is all BST.
  assertEquals(iso(londonMonthBounds(2026, 8)), [
    '2026-08-31T23:00:00.000Z',
    '2026-09-30T23:00:00.000Z',
  ]);
});

Deno.test('Oct 2026 spans the 25 Oct fall-back: starts BST, ends GMT', () => {
  const b = londonMonthBounds(2026, 9);
  assertEquals(iso(b), ['2026-09-30T23:00:00.000Z', '2026-11-01T00:00:00.000Z']);
  assertEquals((b.endExclusive.getTime() - b.start.getTime()) / 3600_000, 31 * 24 + 1);
});

Deno.test('Mar 2027 spans the 28 Mar spring-forward: starts GMT, ends BST', () => {
  const b = londonMonthBounds(2027, 2);
  assertEquals(iso(b), ['2027-03-01T00:00:00.000Z', '2027-03-31T23:00:00.000Z']);
  assertEquals((b.endExclusive.getTime() - b.start.getTime()) / 3600_000, 31 * 24 - 1);
});

Deno.test('December rolls into January; GMT months are UTC midnight', () => {
  assertEquals(iso(londonMonthBounds(2026, 11)), [
    '2026-12-01T00:00:00.000Z',
    '2027-01-01T00:00:00.000Z',
  ]);
});

Deno.test('00:30 BST on 1 Sep belongs to September, not August', () => {
  const slot = new Date('2026-08-31T23:30:00Z');
  const sep = londonMonthBounds(2026, 8);
  const aug = londonMonthBounds(2026, 7);
  assertEquals(slot >= sep.start && slot < sep.endExclusive, true);
  assertEquals(slot >= aug.start && slot < aug.endExclusive, false);
});

Deno.test('previous month and week of month use the London calendar', () => {
  // 1 Nov 2026 09:00 GMT run reports October.
  assertEquals(previousLondonMonth(new Date('2026-11-01T09:00:00Z')), { year: 2026, month: 9 });
  // 00:30 BST on 1 Oct is 23:30Z on 30 Sep: still October in London.
  assertEquals(previousLondonMonth(new Date('2026-09-30T23:30:00Z')), { year: 2026, month: 8 });
  assertEquals(previousLondonMonth(new Date('2027-01-01T00:30:00Z')), { year: 2026, month: 11 });
  // 1 Oct 2026 is a Thursday; 00:30 BST on 1 Oct is week 1 (UTC said 30 Sep, week 5).
  assertEquals(londonWeekOfMonth(new Date('2026-09-30T23:30:00Z')), 1);
  assertEquals(londonWeekOfMonth(new Date('2026-10-25T01:30:00Z')), 5);
});

Deno.test('hour of day is London time across 25 Oct 2026', () => {
  assertEquals(londonHour(new Date('2026-10-25T00:30:00Z')), 1); // BST
  assertEquals(londonHour(new Date('2026-10-25T01:30:00Z')), 1); // GMT
  assertEquals(londonHour(new Date('2026-07-01T17:00:00Z')), 18);
});
