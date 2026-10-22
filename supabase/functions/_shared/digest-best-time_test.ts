import { assertEquals } from 'jsr:@std/assert@1';
import {
  bestFutureSlot,
  extractSlots,
  formatLondonTime,
  outwardCode,
  forecastUrl,
} from './digest-best-time.ts';

const slot = (from: string, to: string, f: number | null) => ({
  from,
  to,
  intensity: { forecast: f },
});

Deno.test('BST: 11:30Z prints 12:30 UK time (BH-27)', () => {
  assertEquals(formatLondonTime('2026-10-15T11:30Z'), '12:30');
});

Deno.test('GMT after the 25 Oct clock change: 11:30Z prints 11:30', () => {
  assertEquals(formatLondonTime('2026-10-26T11:30Z'), '11:30');
});

Deno.test('past slots are ignored even if they were cleaner', () => {
  const now = new Date('2026-10-15T12:00Z');
  const best = bestFutureSlot(
    [
      slot('2026-10-15T03:00Z', '2026-10-15T03:30Z', 20),
      slot('2026-10-15T14:00Z', '2026-10-15T14:30Z', 90),
      slot('2026-10-15T15:00Z', '2026-10-15T15:30Z', 120),
    ],
    now,
  );
  assertEquals(best?.from, '2026-10-15T14:00Z');
});

Deno.test('null forecasts are skipped; none left -> null', () => {
  assertEquals(
    bestFutureSlot(
      [slot('2026-10-15T14:00Z', '2026-10-15T14:30Z', null)],
      new Date('2026-10-15T12:00Z'),
    ),
    null,
  );
});

Deno.test('regional and national response shapes', () => {
  const s = [slot('a', 'b', 1)];
  assertEquals(extractSlots({ data: s }), s);
  assertEquals(extractSlots({ data: { data: s } }), s);
  assertEquals(extractSlots({ data: [{ data: s }] }), s);
});

Deno.test('outward code and regional URL', () => {
  assertEquals(outwardCode('eh1 1aa'), 'EH1');
  assertEquals(outwardCode('GB'), null);
  const u = forecastUrl('EH1', new Date('2026-10-15T12:00:00Z'));
  assertEquals(
    u,
    'https://api.carbonintensity.org.uk/regional/intensity/2026-10-15T12:00Z/fw24h/postcode/EH1',
  );
});
