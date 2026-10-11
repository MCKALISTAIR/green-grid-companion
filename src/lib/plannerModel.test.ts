import { describe, expect, it } from 'vitest';
import type { ForecastData } from '@/lib/carbonApi';
import { planLoad } from '@/lib/nowOrWait';
import {
  APPLIANCES_KEY,
  defaultKwh,
  formatGrams,
  gramsSaved,
  loadAppliances,
  orderChips,
  plannerResult,
  reminderAt,
  reminderCopy,
  statsCaption,
  PLANNER_HORIZON_HOURS,
  PLANNER_OCTOPUS_COST,
} from './plannerModel';

const SLOT = 1800_000;
// 11 Oct 2026, 10:00 BST = 09:00Z
const NOW = new Date('2026-10-11T09:00:00Z');
const band = (v: number): ForecastData['intensity']['index'] => (v < 40 ? 'very low' : v < 120 ? 'low' : v < 200 ? 'moderate' : 'high');
function series(values: (number | null)[], start = NOW.getTime()): ForecastData[] {
  return values.flatMap((v, i) =>
    v === null
      ? []
      : [{ from: new Date(start + i * SLOT).toISOString(), to: new Date(start + (i + 1) * SLOT).toISOString(), intensity: { forecast: v, actual: null, index: band(v) } } as ForecastData],
  );
}
const plan = (values: (number | null)[], opts: { slots?: number; deadlineMs?: number | null; live?: number | null } = {}) =>
  planLoad({ forecast: series(values), liveIntensity: opts.live ?? null, now: NOW, slots: opts.slots ?? 4, horizonHours: PLANNER_HORIZON_HOURS, deadlineMs: opts.deadlineMs ?? null });
const ctx = (hours: number, deadlineMs: number | null = null, tone = 'cheeky') => ({ hours, now: NOW, deadlineMs, tone });

describe('plannerResult: every §6.2 reason is reachable', () => {
  it('no_forecast', () => {
    const r = plannerResult(plan([]), ctx(2));
    expect(r.headline).toBe('Forecast not in yet');
    expect(r.tail).toBeNull();
  });
  it('missing_data', () => {
    const p = plan([100, null, null, 100, 100, 100, 50, 50, 50, 50]);
    expect(p.reason).toBe('missing_data');
    expect(plannerResult(p, ctx(2)).headline).toBe('Some of the forecast is missing');
  });
  it('too_tight', () => {
    const p = plan(Array(48).fill(150), { slots: 8, deadlineMs: NOW.getTime() + 2 * 3600_000 });
    expect(p.reason).toBe('too_tight');
    const r = plannerResult(p, ctx(4, NOW.getTime() + 2 * 3600_000));
    expect(r.headline).toBe("That's cutting it fine");
    expect(r.body).toBe("A 4-hour run can't finish by 12:00 if it starts now. Start now and it ends at 14:00, or move the deadline.");
  });
  it('near_zero, all zero', () => {
    const p = plan(Array(48).fill(0));
    expect(p.reason).toBe('near_zero');
    const r = plannerResult(p, ctx(2));
    expect(r.headline).toBe('Any time works');
    expect(r.tail).toBe("It's already zero carbon.");
    expect(r.window).toBeNull();
  });
  it('flat', () => {
    const p = plan(Array(48).fill(150).map((v, i) => v + (i % 3)));
    expect(p.reason).toBe('flat');
    expect(plannerResult(p, ctx(2)).tail).toBe('About as clean as it gets.');
  });
  it('cleaner_later, with tomorrow on the end only', () => {
    const vals = Array(48).fill(200);
    for (let i = 26; i < 30; i++) vals[i] = 60; // 23:00–01:00 BST
    const p = plan(vals);
    expect(p.reason).toBe('cleaner_later');
    const r = plannerResult(p, ctx(2));
    expect(r.headline).toBe('Start at 23:00, done by 01:00 tomorrow');
    expect(r.tail).toBe('Worth the wait.');
    expect(r.window).toBe(p.best);
    expect(r.chip).toBe('2h \u00b7 23:00\u201301:00');
  });
  it('small_gain', () => {
    const vals = Array(48).fill(150);
    for (let i = 10; i < 14; i++) vals[i] = 144;
    for (let i = 20; i < 48; i++) vals[i] = 160 + (i % 5) * 10;
    const p = plan(vals);
    expect(p.reason).toBe('small_gain');
    const r = plannerResult(p, ctx(2));
    expect(r.headline).toBe('Start now, done by 12:00');
    expect(r.tail).toBe('Close enough. Crack on.');
    expect(r.body).toMatch(/^It won't get much cleaner in the next 24 hours\. The best later start \(\d\d:\d\d\) is only \d+ g cleaner\.$/);
  });
  it('now_is_best', () => {
    const vals = Array(48).fill(0).map((_, i) => 100 + i * 5);
    const p = plan(vals);
    expect(p.reason).toBe('now_is_best');
    const r = plannerResult(p, ctx(2));
    expect(r.body).toBe("It won't get any cleaner in the next 24 hours.");
    expect(r.window).toBe(p.nowWindow);
  });
  it('Plain drops the tail only', () => {
    const p = plan(Array(48).fill(0));
    const c = plannerResult(p, ctx(2, null, 'cheeky'));
    const pl = plannerResult(p, ctx(2, null, 'plain'));
    expect(pl.tail).toBeNull();
    expect(pl.headline).toBe(c.headline);
    expect(pl.body).toBe(c.body);
  });
  it('deadline constrains the window and gives the hint', () => {
    const vals = Array(48).fill(200);
    for (let i = 4; i < 8; i++) vals[i] = 150; // 12:00–14:00
    for (let i = 30; i < 34; i++) vals[i] = 50; // overnight
    const dl = NOW.getTime() + 8 * 3600_000;
    const p = plan(vals, { deadlineMs: dl });
    expect(p.reason).toBe('cleaner_later');
    expect(p.best!.end.getTime()).toBeLessThanOrEqual(dl);
    expect(plannerResult(p, ctx(2, dl)).deadlineHint).toMatch(/^Without the deadline, 01:00 would be around \d+% cleaner\.$/);
  });
});

describe('grams saved', () => {
  const vals = Array(48).fill(200);
  for (let i = 26; i < 30; i++) vals[i] = 60;
  const p = plan(vals);
  it('only with kWh', () => {
    expect(gramsSaved(p, null)).toBeNull();
    expect(gramsSaved(p, 2)!.text).toBe('about 280 g');
    expect(gramsSaved(p, 30)!.text).toBe('about 4.2 kg');
  });
  it('rounds per §6.2', () => {
    expect(formatGrams(866)).toBe('about 870 g');
    expect(formatGrams(1234)).toBe('about 1.2 kg');
  });
  it('caption', () => {
    expect(statsCaption(p, 2)).toBe('Starting now averages 200 gCO\u2082/kWh; 23:00\u201301:00 averages 60. Saved: 140 g/kWh \u00d7 about 2 kWh, rounded.');
    expect(statsCaption(p, null)).toBe('Starting now averages 200 gCO\u2082/kWh; 23:00\u201301:00 averages 60.');
  });
  it('EV default is 7.4 kW × hours; others ask', () => {
    expect(defaultKwh({ id: 'ev', hours: 4 })).toBe(30);
    expect(defaultKwh({ id: 'washing', hours: 2 })).toBeNull();
  });
});

describe('reminder', () => {
  it('start − 15 min, hidden when too soon', () => {
    const vals = Array(48).fill(200);
    for (let i = 26; i < 30; i++) vals[i] = 60;
    const p = plan(vals);
    expect(reminderAt(p, NOW)!.toISOString()).toBe(new Date(p.best!.start.getTime() - 15 * 60_000).toISOString());
    expect(reminderAt(p, new Date(p.best!.start.getTime() - 10 * 60_000))).toBeNull();
    expect(reminderCopy('Washing', p.best!, 'cheeky')).toEqual({ title: 'Clean window from 23:00', body: 'Time to start the washing. 60 gCO\u2082/kWh forecast.' });
    expect(reminderCopy('Washing', p.best!, 'plain').body).toBe('Start the washing now for the cleanest run. 60 gCO\u2082/kWh forecast.');
  });
});

describe('appliances store', () => {
  const mem = (init: Record<string, string> = {}) => ({ getItem: (k: string) => init[k] ?? null });
  it('migrates the old custom appliance', () => {
    const list = loadAppliances(mem(), { name: 'Hot tub', duration: '3' });
    expect(list.map((a) => a.name)).toEqual(['EV charge', 'Washing', 'Dishwasher', 'Dryer', 'Hot tub']);
    expect(list[4].hours).toBe(3);
  });
  it('remembers pinned and recent', () => {
    const saved = [
      { id: 'dryer', name: 'Dryer', hours: 1, kwh: 2.4, pinned: true, lastUsed: null },
      { id: 'c1', name: 'Kiln', hours: 6, kwh: null, pinned: false, lastUsed: 5 },
    ];
    const list = loadAppliances(mem({ [APPLIANCES_KEY]: JSON.stringify(saved) }));
    expect(orderChips(list, 'washing').map((a) => a.id)).toEqual(['washing', 'dryer', 'c1', 'ev', 'dish']);
    expect(list.find((a) => a.id === 'dryer')!.kwh).toBe(2.4);
  });
  it('Octopus cost is off (phase 2)', () => {
    expect(PLANNER_OCTOPUS_COST).toBe(false);
  });
});
