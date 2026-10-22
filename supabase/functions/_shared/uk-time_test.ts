import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { formatUKTime, isTomorrowUK } from './uk-time.ts';

// Run on Sat 24 Oct 2026 at 18:00 BST (17:00Z); clocks go back 01:00Z Sun 25 Oct.
const run = new Date('2026-10-24T17:00:00Z');

Deno.test('BST slot before the change', () => {
  assertEquals(formatUKTime('2026-10-24T11:30:00Z'), '12:30');
});

Deno.test('slots after the 25 Oct change use GMT, not the run-time BST offset', () => {
  // Old code added +1 to every slot and printed 14:00 / 04:00 here.
  assertEquals(formatUKTime('2026-10-25T13:00:00Z'), '13:00');
  assertEquals(formatUKTime('2026-10-25T03:00:00Z'), '03:00');
  assertEquals(isTomorrowUK('2026-10-25T13:00:00Z', run), true);
});

Deno.test('midnight edge is today/tomorrow by UK date', () => {
  assertEquals(formatUKTime('2026-10-24T23:00:00Z'), '00:00'); // 00:00 BST Sun
  assertEquals(isTomorrowUK('2026-10-24T23:00:00Z', run), true);
  assertEquals(isTomorrowUK('2026-10-24T22:30:00Z', run), false);
});

Deno.test('29 Mar 2026 spring-forward', () => {
  assertEquals(formatUKTime('2026-03-29T00:30:00Z'), '00:30'); // GMT
  assertEquals(formatUKTime('2026-03-29T01:30:00Z'), '02:30'); // BST
});
