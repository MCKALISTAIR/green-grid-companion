import { describe, expect, it } from 'vitest';
import {
  DECISION_HORIZON_HOURS,
  MIN_GRAMS_CLEANER,
  MIN_PERCENT_CLEANER,
  describeSpan,
  describeWait,
  getNowOrWaitDecision,
  planLoad,
  roundPercent,
} from './nowOrWait';
import type { ForecastData } from '@/lib/carbonApi';

// 13:00 UTC on 10 Oct 2026 = 14:00 BST in London.
const NOW = new Date('2026-10-10T13:10:00.000Z');
const SLOT_START = new Date('2026-10-10T13:00:00.000Z').getTime();

/** Half-hour slots starting at the current half hour, one value per slot. */
function forecastFrom(values: number[], startMs = SLOT_START): ForecastData[] {
  return values.map((v, i) => {
    const from = new Date(startMs + i * 30 * 60_000);
    const to = new Date(from.getTime() + 30 * 60_000);
    return {
      from: from.toISOString(),
      to: to.toISOString(),
      intensity: { forecast: v, index: 'moderate' },
    };
  });
}

/** n slots of `value`. */
const flat = (n: number, value: number) => Array.from({ length: n }, () => value);

function allCopy(d: ReturnType<typeof getNowOrWaitDecision>): string {
  return `${d.headline} ${d.detail} ${d.tip}`;
}

describe('planLoad', () => {
  it('waits when a later 3-hour stretch is meaningfully cleaner', () => {
    // Now 210 for 3h, then 126 for 4h, then back up.
    const fc = forecastFrom([...flat(6, 210), ...flat(8, 126), ...flat(34, 220)]);
    const plan = planLoad({ forecast: fc, liveIntensity: 210, now: NOW });
    expect(plan.action).toBe('wait');
    expect(plan.reason).toBe('cleaner_later');
    expect(plan.nowAvg).toBe(210);
    expect(plan.best?.avg).toBe(126);
    expect(plan.best?.start.toISOString()).toBe('2026-10-10T16:00:00.000Z');
    expect(plan.waitMinutes).toBe(170);
    expect(plan.percentCleaner).toBe(40);
  });

  it('compares like with like: a load started now includes the cleaner tail', () => {
    // Cleaner from 2h in. Starting now already catches 1h of it.
    const fc = forecastFrom([...flat(4, 210), ...flat(8, 126), ...flat(36, 220)]);
    const plan = planLoad({ forecast: fc, liveIntensity: 210, now: NOW });
    expect(plan.nowAvg).toBe(182);
    expect(plan.best?.avg).toBe(126);
    expect(plan.action).toBe('wait');
  });

  it('says now when starting now is already the cleanest option', () => {
    const fc = forecastFrom([...flat(6, 90), ...flat(42, 200)]);
    const plan = planLoad({ forecast: fc, liveIntensity: 90, now: NOW });
    expect(plan.action).toBe('use_now');
    expect(plan.reason).toBe('now_is_best');
    expect(plan.waitMinutes).toBe(0);
  });

  it('treats the best slot being now as now, even if later single slots dip', () => {
    // Current window avg is lowest; a lone dip later can't beat a full window.
    const fc = forecastFrom([...flat(6, 80), 200, 60, ...flat(40, 200)]);
    const plan = planLoad({ forecast: fc, liveIntensity: 80, now: NOW });
    expect(plan.action).toBe('use_now');
  });

  it('does not wait for a small gain under the threshold', () => {
    // 200 now vs 185 later = 7.5% cleaner: under MIN_PERCENT_CLEANER.
    const fc = forecastFrom([...flat(4, 200), ...flat(44, 185)]);
    const plan = planLoad({ forecast: fc, liveIntensity: 200, now: NOW });
    expect(plan.percentCleaner).toBeLessThan(MIN_PERCENT_CLEANER);
    expect(plan.action).toBe('use_now');
    expect(plan.reason).toBe('small_gain');
  });

  it('does not wait for a big percentage of a tiny number', () => {
    // 40 -> 30 is 25% cleaner but only 10g: under MIN_GRAMS_CLEANER.
    const fc = forecastFrom([...flat(4, 40), ...flat(44, 30)]);
    const plan = planLoad({ forecast: fc, liveIntensity: 40, now: NOW });
    expect(40 - 30).toBeLessThan(MIN_GRAMS_CLEANER);
    expect(plan.action).toBe('use_now');
  });

  it('treats a tie as now (no point waiting for the same)', () => {
    const fc = forecastFrom(flat(48, 150));
    const plan = planLoad({ forecast: fc, liveIntensity: 150, now: NOW });
    expect(plan.action).toBe('use_now');
    expect(plan.reason).toBe('now_is_best');
    expect(plan.gramsCleaner).toBe(0);
  });

  it('picks the earliest of two equally clean later windows', () => {
    const fc = forecastFrom([
      ...flat(4, 250),
      ...flat(6, 100),
      ...flat(6, 250),
      ...flat(6, 100),
      ...flat(26, 250),
    ]);
    const plan = planLoad({ forecast: fc, liveIntensity: 250, now: NOW });
    expect(plan.action).toBe('wait');
    expect(plan.best?.start.toISOString()).toBe('2026-10-10T15:00:00.000Z');
  });

  it('ignores cleaner windows beyond the decision horizon', () => {
    const fc = forecastFrom([
      ...flat(DECISION_HORIZON_HOURS * 2 + 12, 200),
      ...flat(12, 40),
    ]);
    const plan = planLoad({ forecast: fc, liveIntensity: 200, now: NOW });
    expect(plan.action).toBe('use_now');
  });

  it('prefers the live reading over the forecast for the current half hour', () => {
    // Forecast says 120 now but live is 300: waiting for 120 is worth it.
    const fc = forecastFrom([120, ...flat(47, 120)]);
    const live = planLoad({ forecast: fc, liveIntensity: 300, now: NOW, slots: 1 });
    expect(live.action).toBe('wait');
    const noLive = planLoad({ forecast: fc, now: NOW, slots: 1 });
    expect(noLive.action).toBe('use_now');
  });

  it('returns check_forecast with no forecast at all', () => {
    expect(planLoad({ forecast: [], liveIntensity: 180, now: NOW }).action).toBe('check_forecast');
    expect(planLoad({ forecast: null, now: NOW }).action).toBe('check_forecast');
  });

  it('returns check_forecast when only past slots remain', () => {
    const fc = forecastFrom(flat(4, 100), SLOT_START - 4 * 3600_000);
    expect(planLoad({ forecast: fc, liveIntensity: 100, now: NOW }).action).toBe('check_forecast');
  });

  it('returns check_forecast when only the current half hour is known', () => {
    const fc = forecastFrom([100]);
    expect(planLoad({ forecast: fc, liveIntensity: 100, now: NOW }).action).toBe('check_forecast');
  });

  it('still answers with a partial forecast, and flags it', () => {
    // Only 3 hours of data: shorter load window, but still a real answer.
    const fc = forecastFrom([...flat(2, 240), ...flat(4, 120)]);
    const plan = planLoad({ forecast: fc, liveIntensity: 240, now: NOW });
    expect(plan.partial).toBe(true);
    expect(plan.action).toBe('wait');
    expect(plan.coveredHours).toBeLessThan(DECISION_HORIZON_HOURS);
  });

  it('skips null or broken forecast values instead of treating them as zero', () => {
    const fc = forecastFrom([...flat(4, 200), ...flat(44, 190)]);
    // A missing value must not look like a 0 g "perfect" window.
    (fc[10].intensity as { forecast: unknown }).forecast = null;
    const plan = planLoad({ forecast: fc, liveIntensity: 200, now: NOW });
    expect(plan.action).toBe('use_now');
  });

  it('does not use a window that spans a gap in the forecast', () => {
    const fc = forecastFrom([...flat(4, 200), ...flat(44, 200)]);
    // Make a fake "clean" window that is actually split by a 2-hour gap.
    const clean = forecastFrom(flat(3, 50), SLOT_START + 4 * 3600_000).concat(
      forecastFrom(flat(3, 50), SLOT_START + 7 * 3600_000),
    );
    const byFrom = new Map(fc.map((s) => [s.from, s]));
    clean.forEach((s) => byFrom.set(s.from, s));
    // Remove the slots between the two clean halves to create the gap.
    for (let h = 5.5; h < 7; h += 0.5) {
      byFrom.delete(new Date(SLOT_START + h * 3600_000).toISOString());
    }
    const plan = planLoad({ forecast: [...byFrom.values()], liveIntensity: 200, now: NOW });
    expect(plan.best?.avg).not.toBe(50);
  });
});

describe('getNowOrWaitDecision copy', () => {
  it('gives one clear wait answer with times in Europe/London', () => {
    const fc = forecastFrom([...flat(6, 210), ...flat(8, 126), ...flat(34, 220)]);
    const d = getNowOrWaitDecision(210, fc, NOW);
    expect(d.action).toBe('wait');
    expect(d.headline).toBe('Wait about 3 hours');
    // 16:00Z is 17:00 BST
    expect(d.detail).toBe(
      "It'll be around 40% cleaner (210 to 126 gCO₂/kWh) from 17:00 to 20:00.",
    );
    expect(d.countdownTarget?.toISOString()).toBe('2026-10-10T16:00:00.000Z');
  });

  it('labels a wait that lands tomorrow', () => {
    // Clean overnight: 23:00Z = 00:00 BST on 11 Oct.
    const fc = forecastFrom([...flat(20, 260), ...flat(6, 90), ...flat(22, 260)]);
    const d = getNowOrWaitDecision(260, fc, NOW);
    expect(d.action).toBe('wait');
    expect(d.detail).toContain('from 00:00 to 03:00 tomorrow');
  });

  it("says now's good when it won't get much cleaner", () => {
    const fc = forecastFrom([...flat(4, 200), ...flat(44, 185)]);
    const d = getNowOrWaitDecision(200, fc, NOW);
    expect(d.headline).toBe("Now's good");
    expect(d.detail).toMatch(/^It won't get much cleaner in the next 18 hours\./);
    expect(d.countdownTarget).toBeNull();
  });

  it("says now's good when now is the cleanest", () => {
    const fc = forecastFrom([...flat(6, 60), ...flat(42, 180)]);
    const d = getNowOrWaitDecision(60, fc, NOW);
    expect(d.headline).toBe("Now's good");
    expect(d.detail).toBe("It won't get any cleaner in the next 18 hours. Starting now averages around 60 gCO₂/kWh.");
  });

  it('is honest when there is no forecast', () => {
    const d = getNowOrWaitDecision(180, [], NOW);
    expect(d.action).toBe('check_forecast');
    expect(d.headline).toBe('Forecast not in yet');
    expect(d.detail).toContain('180 gCO₂/kWh');
  });

  it('mentions partial forecasts in the tip', () => {
    const fc = forecastFrom([...flat(2, 240), ...flat(4, 120)]);
    const d = getNowOrWaitDecision(240, fc, NOW);
    expect(d.tip).toMatch(/forecast we have so far/);
  });

  it('never contradicts itself across many random forecasts', () => {
    let seed = 42;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) % 2 ** 31;
      return seed / 2 ** 31;
    };
    for (let run = 0; run < 300; run++) {
      const len = Math.floor(rand() * 60);
      const values = Array.from({ length: len }, () => Math.round(20 + rand() * 330));
      const live = Math.round(20 + rand() * 330);
      const d = getNowOrWaitDecision(live, forecastFrom(values), NOW);
      const text = allCopy(d);
      expect(text).not.toMatch(/—/);
      expect(text).not.toMatch(/\b(\w+) \1\b/i);
      if (d.action === 'wait') {
        expect(d.headline.startsWith('Wait')).toBe(true);
        expect(d.countdownTarget).not.toBeNull();
        expect(d.plan.best!.avg).toBeLessThan(d.plan.nowAvg!);
        expect(d.plan.percentCleaner).toBeGreaterThanOrEqual(MIN_PERCENT_CLEANER);
        expect(text).not.toMatch(/now's good/i);
      } else {
        expect(d.headline.startsWith('Wait')).toBe(false);
        expect(d.countdownTarget).toBeNull();
        expect(text).not.toMatch(/cleaner \(/);
      }
    }
  });
});

describe('copy helpers', () => {
  it('describes waits in plain words', () => {
    expect(describeWait(20)).toBe('about 20 minutes');
    expect(describeWait(55)).toBe('about an hour');
    expect(describeWait(110)).toBe('about 2 hours');
    expect(describeWait(150)).toBe('about 2.5 hours');
  });

  it('describes spans and rounds percents', () => {
    expect(describeSpan(1)).toBe('the next hour');
    expect(describeSpan(18)).toBe('the next 18 hours');
    expect(roundPercent(38)).toBe(40);
    expect(roundPercent(12)).toBe(10);
  });
});
