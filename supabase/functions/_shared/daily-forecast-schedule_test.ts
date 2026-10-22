import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { londonWallClock, selectDueSubscriptions } from './daily-forecast-schedule.ts';

type Sub = { id: string; daily_forecast_time: string };
const subs = (...times: string[]): Sub[] => times.map((t) => ({ id: t, daily_forecast_time: t }));
const due = (list: Sub[], iso: string) =>
  selectDueSubscriptions(list, new Date(iso)).map((d) => `${d.sub.id}@${d.periodKey}`);

/** Simulate a whole London day of 15-minute runs with a per-day claim. */
function sendsOverDay(
  list: Sub[],
  startIso: string,
  hours: number,
  onlyPeriod?: string,
): Map<string, string[]> {
  const claimed = new Set<string>();
  const sent = new Map<string, string[]>();
  const start = new Date(startIso).getTime();
  for (let t = start; t < start + hours * 3600_000; t += 15 * 60_000) {
    const now = new Date(t);
    for (const d of selectDueSubscriptions(list, now)) {
      const key = `${d.periodKey}|${d.sub.id}`;
      if (claimed.has(key) || (onlyPeriod && d.periodKey !== onlyPeriod)) continue;
      claimed.add(key);
      sent.set(d.sub.id, [...(sent.get(d.sub.id) ?? []), now.toISOString()]);
    }
  }
  return sent;
}

Deno.test('BH-69: non-hour times and HH:59 are due on the next quarter-hour run', () => {
  // 22 Oct 2026, BST. 06:15Z = 07:15 London.
  assertEquals(due(subs('07:15', '07:16', '06:59'), '2026-10-22T06:15:00Z'), [
    '07:15@2026-10-22',
    '06:59@2026-10-22',
  ]);
  assertEquals(due(subs('07:59'), '2026-10-22T06:45:00Z'), []);
  assertEquals(due(subs('07:59'), '2026-10-22T07:00:00Z'), ['07:59@2026-10-22']);
});

Deno.test('BH-69: every minute of the day sends exactly once on an ordinary day', () => {
  const all: Sub[] = [];
  for (let m = 0; m < 1440; m++) {
    const t = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
    all.push({ id: t, daily_forecast_time: t });
  }
  // Runs from 00:00 London 22 Oct to 00:00 London 23 Oct inclusive (catches 23:59; the 00:00 run on the 23rd only sends 00:00 again for the new day, so stop there).
  const sent = sendsOverDay(all, '2026-10-21T23:00:00Z', 24.01, '2026-10-22');
  assertEquals(sent.size, 1440);
  for (const [id, times] of sent) assertEquals(times.length, 1, id);
});

Deno.test('BH-70: 28 Mar 2027 spring forward, 01:00–01:59 subscribers get it at 02:00 BST', () => {
  assertEquals(londonWallClock(new Date('2027-03-28T01:00:00Z')), {
    date: '2027-03-28',
    minutes: 120,
  });
  const sent = sendsOverDay(
    subs('00:45', '01:00', '01:30', '01:59', '02:00', '07:00'),
    '2027-03-28T00:00:00Z',
    23,
  );
  assertEquals(sent.get('00:45'), ['2027-03-28T00:45:00.000Z']);
  assertEquals(sent.get('01:00'), ['2027-03-28T01:00:00.000Z']); // 02:00 BST
  assertEquals(sent.get('01:30'), ['2027-03-28T01:00:00.000Z']);
  assertEquals(sent.get('01:59'), ['2027-03-28T01:00:00.000Z']);
  assertEquals(sent.get('02:00'), ['2027-03-28T01:00:00.000Z']);
  assertEquals(sent.get('07:00'), ['2027-03-28T06:00:00.000Z']);
});

Deno.test('25 Oct 2026 fall back: repeated 01:xx sends once (first pass, BST)', () => {
  const sent = sendsOverDay(subs('01:00', '01:30', '02:00', '07:00'), '2026-10-24T23:00:00Z', 24);
  assertEquals(sent.get('01:00'), ['2026-10-25T00:00:00.000Z']); // 01:00 BST
  assertEquals(sent.get('01:30'), ['2026-10-25T00:30:00.000Z']);
  assertEquals(sent.get('02:00'), ['2026-10-25T02:00:00.000Z']); // 02:00 GMT
  assertEquals(sent.get('07:00'), ['2026-10-25T07:00:00.000Z']);
});

Deno.test('23:59 is sent on the 00:00 run and claimed against the previous day', () => {
  assertEquals(due(subs('23:59'), '2026-10-22T23:00:00Z'), ['23:59@2026-10-22']);
});

Deno.test('catch-up limit: saving 07:00 at 15:00 does not send a stale outlook', () => {
  assertEquals(due(subs('07:00'), '2026-10-22T14:00:00Z'), []);
});

Deno.test('malformed times are skipped', () => {
  assertEquals(due(subs('', 'nope', '25:00'), '2026-10-22T06:00:00Z'), []);
});
