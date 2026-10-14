import { describe, expect, it, vi, afterEach } from 'vitest';
import type { ForecastData } from '@/lib/carbonApi';
import { getRegionalHistoryAndForecast } from '@/lib/carbonApi';
import {
  MISSING_SLOTS_NOTE,
  describeAnyTime,
  getNowOrWaitDecision,
  isAnyTimePlan,
  planLoad,
} from './nowOrWait';
import { classifySpread, NEAR_ZERO_MAX } from './forecastWindows';
import { getDailyStats } from './dayForecast';
import southScotland from '@/test/fixtures/neso-regional-south-scotland-2026-10-11.json';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const NOW = new Date('2026-10-10T13:10:00.000Z');
const SLOT_START = new Date('2026-10-10T13:00:00.000Z').getTime();

function forecastFrom(values: Array<number | null>, startMs = SLOT_START): ForecastData[] {
  return values.map((v, i) => {
    const from = new Date(startMs + i * 30 * 60_000);
    return {
      from: from.toISOString(),
      to: new Date(from.getTime() + 30 * 60_000).toISOString(),
      intensity: { forecast: v as number, index: 'very low' },
    };
  });
}
const flat = (n: number, v: number) => Array.from({ length: n }, () => v);
const allText = (d: ReturnType<typeof getNowOrWaitDecision>) =>
  `${d.headline} ${d.detail} ${d.tip}`;

describe('classifySpread', () => {
  it('classifies near zero, flat and varied, and ignores nothing (callers drop missing)', () => {
    expect(classifySpread([0, 0, 3, NEAR_ZERO_MAX])).toBe('near_zero');
    expect(classifySpread([150, 160])).toBe('flat');
    expect(classifySpread([40, 209])).toBe('varied');
    expect(classifySpread([])).toBeNull();
  });
});

describe('planner and home card: genuine zeros', () => {
  it('says any time works for an all-zero window instead of implying now is best', () => {
    const plan = planLoad({
      forecast: forecastFrom(flat(96, 0)),
      now: NOW,
      slots: 4,
      horizonHours: null,
    });
    expect(plan.action).toBe('use_now'); // same card style; wording changes
    expect(plan.reason).toBe('near_zero');
    expect(isAnyTimePlan(plan)).toBe(true);
    expect(describeAnyTime(plan)).toBe(
      "The grid here is at or near zero carbon for the next 48 hours, around 0 gCO₂/kWh, so there's no cleaner time to wait for.",
    );
    const d = getNowOrWaitDecision(0, forecastFrom(flat(96, 0)), NOW);
    expect(d.headline).toBe('Any time works');
    expect(allText(d)).not.toMatch(/won't get any cleaner|Now's good/);
  });

  it('flat but not zero says it stays about the same', () => {
    const d = getNowOrWaitDecision(150, forecastFrom(flat(48, 150)), NOW);
    expect(d.headline).toBe('Any time works');
    expect(d.detail).toBe(
      "It stays about the same for the next 18 hours, around 150 gCO₂/kWh, so there's no cleaner time to wait for.",
    );
  });

  it('a near-zero window with one dirtier later stretch is not "any time"', () => {
    const plan = planLoad({
      forecast: forecastFrom([...flat(12, 0), ...flat(36, 120)]),
      liveIntensity: 0,
      now: NOW,
    });
    expect(plan.reason).toBe('now_is_best');
  });

  it('planner, home card and overview agree on live South Scotland data (11 Oct)', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const now = new Date('2026-10-11T10:10:00Z');
    vi.setSystemTime(now);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(southScotland), { status: 200 }),
    );
    const fc = await getRegionalHistoryAndForecast(2, 'x', 'y');
    const planner = planLoad({ forecast: fc, now, slots: 4, horizonHours: null });
    const home = getNowOrWaitDecision(0, fc, now);
    const overview = getDailyStats(fc, now);
    expect(planner.reason).toBe('near_zero');
    expect(home.plan.reason).toBe('near_zero');
    expect(overview.every((d) => d.spread === 'near_zero')).toBe(true);
  });
});

describe('planner and home card: missing data', () => {
  it('does not recommend now when the current half hour is missing', () => {
    const fc = forecastFrom(flat(48, 0)).slice(1); // starts at the next half hour
    const plan = planLoad({ forecast: fc, liveIntensity: null, now: NOW });
    expect(plan.action).toBe('check_forecast');
    expect(plan.reason).toBe('missing_data');
    const d = getNowOrWaitDecision(null, fc, NOW);
    expect(d.headline).toBe('Forecast has gaps');
    expect(d.action).not.toBe('use_now');
  });

  it('does not recommend now from a start-now window with a gap (no fallback to one slot or 0)', () => {
    const fc = forecastFrom([200, 200, null, 200, ...flat(44, 200)]).filter(
      (s) => s.intensity.forecast !== null,
    );
    const plan = planLoad({ forecast: fc, liveIntensity: 200, now: NOW });
    expect(plan.reason).toBe('missing_data');
    expect(plan.action).toBe('check_forecast');
  });

  it('still answers when gaps are later on, and says some half hours are missing', () => {
    const values: Array<number | null> = [...flat(6, 210), ...flat(8, 126), ...flat(34, 220)];
    values[30] = null;
    const fc = forecastFrom(values).filter((s) => s.intensity.forecast !== null);
    const plan = planLoad({ forecast: fc, liveIntensity: 210, now: NOW });
    expect(plan.action).toBe('wait');
    expect(plan.missingSlots).toBe(1);
    expect(getNowOrWaitDecision(210, fc, NOW).tip).toBe(MISSING_SLOTS_NOTE);
  });

  it('no forecast at all stays "Forecast not in yet"', () => {
    expect(getNowOrWaitDecision(null, [], NOW).headline).toBe('Forecast not in yet');
  });
});
