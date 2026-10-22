import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ForecastData } from '@/lib/carbonApi';
import { getNowOrWaitDecision, planLoad } from '@/lib/nowOrWait';

const SLOT = 30 * 60_000;

/** Forecast from `startIso` for `n` half hours, all at `value`. */
function flatForecast(startIso: string, n: number, value: number): ForecastData[] {
  const start = Date.parse(startIso);
  return Array.from({ length: n }, (_, i) => ({
    from: new Date(start + i * SLOT).toISOString(),
    to: new Date(start + (i + 1) * SLOT).toISOString(),
    intensity: { forecast: value, actual: null, index: 'low' },
  })) as unknown as ForecastData[];
}

afterEach(() => vi.useRealTimers());

describe('stale data never says "use now" (fail-mode hunt)', () => {
  it('resume after 6 hours with a persisted low reading: no "Now"', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-15T18:10:00Z'));
    const forecast = flatForecast('2026-10-15T12:00:00Z', 96, 40);
    const d = getNowOrWaitDecision(30, forecast, new Date(), '2026-10-15T12:00:00Z');
    expect(d.action).not.toBe('use_now');
    expect(d.reason).toBe('stale_data');
  });

  it('a fresh reading still gives an answer', () => {
    const now = new Date('2026-10-15T18:10:00Z');
    const forecast = flatForecast('2026-10-15T18:00:00Z', 96, 40);
    const d = getNowOrWaitDecision(40, forecast, now, '2026-10-15T18:00:00Z');
    expect(d.reason).not.toBe('stale_data');
  });

  it('a missing or invalid reading time is treated as stale', () => {
    const now = new Date('2026-10-15T18:10:00Z');
    const forecast = flatForecast('2026-10-15T18:00:00Z', 96, 40);
    expect(planLoad({ forecast, liveIntensity: 40, now, liveFrom: null }).reason).toBe(
      'stale_data',
    );
    expect(planLoad({ forecast, liveIntensity: 40, now, liveFrom: 'nope' }).reason).toBe(
      'stale_data',
    );
  });

  it('BST to GMT (25 Oct 2026): the repeated 01:00 hour is not seen as stale or doubled', () => {
    // 01:10 BST = 00:10Z, then 01:10 GMT = 01:10Z. Readings are UTC, so both are fresh.
    for (const iso of ['2026-10-25T00:10:00Z', '2026-10-25T01:10:00Z']) {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(iso));
      const from = new Date(Math.floor(Date.parse(iso) / SLOT) * SLOT).toISOString();
      const forecast = flatForecast('2026-10-24T23:00:00Z', 96, 40);
      const p = planLoad({ forecast, liveIntensity: 40, now: new Date(), liveFrom: from });
      expect(p.reason).not.toBe('stale_data');
      expect(p.missingSlots).toBe(0);
    }
  });

  it('GMT to BST (29 Mar 2026): the skipped hour causes no gap', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-29T01:10:00Z')); // 02:10 BST
    const forecast = flatForecast('2026-03-28T23:00:00Z', 96, 40);
    const p = planLoad({
      forecast,
      liveIntensity: 40,
      now: new Date(),
      liveFrom: '2026-03-29T01:00:00Z',
    });
    expect(p.missingSlots).toBe(0);
    expect(p.reason).not.toBe('stale_data');
  });

  it('device clock hours ahead makes the reading look stale, never "Now"', () => {
    const now = new Date('2026-10-15T23:10:00Z');
    const forecast = flatForecast('2026-10-15T18:00:00Z', 96, 40);
    expect(getNowOrWaitDecision(40, forecast, now, '2026-10-15T18:00:00Z').action).not.toBe(
      'use_now',
    );
  });

  it('negative, NaN and absurd forecast values are never treated as clean', () => {
    const now = new Date('2026-10-15T18:10:00Z');
    const forecast = flatForecast('2026-10-15T18:00:00Z', 12, 300);
    (forecast[3].intensity as { forecast: number }).forecast = -50;
    (forecast[4].intensity as { forecast: number }).forecast = Number.NaN;
    const p = planLoad({ forecast, liveIntensity: 300, now, liveFrom: '2026-10-15T18:00:00Z' });
    expect(p.best?.avg ?? 300).toBeGreaterThanOrEqual(0);
    expect(p.missingSlots).toBeGreaterThan(0);
  });

  it('empty forecast: no "Now"', () => {
    const now = new Date('2026-10-15T18:10:00Z');
    expect(getNowOrWaitDecision(20, [], now, '2026-10-15T18:00:00Z').action).not.toBe('use_now');
  });
});
