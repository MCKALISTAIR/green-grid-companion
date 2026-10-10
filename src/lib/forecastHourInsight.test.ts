import { describe, expect, it } from 'vitest';
import type { ForecastData } from '@/lib/carbonApi';
import {
  findDefaultForecastIndex,
  getForecastHourInsight,
} from '@/lib/forecastHourInsight';

function slotAt(
  from: Date,
  forecast: number,
  index: ForecastData['intensity']['index'] = 'moderate',
  durationMins = 30,
): ForecastData {
  const to = new Date(from.getTime() + durationMins * 60 * 1000);
  return {
    from: from.toISOString(),
    to: to.toISOString(),
    intensity: { forecast, index, actual: forecast },
  };
}

function slot(
  hoursFromNow: number,
  forecast: number,
  index: ForecastData['intensity']['index'] = 'moderate',
): ForecastData {
  const from = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
  from.setSeconds(0, 0);
  return slotAt(from, forecast, index);
}

describe('getForecastHourInsight', () => {
  it('returns null for an empty forecast', () => {
    expect(getForecastHourInsight([], 0, 120)).toBeNull();
  });

  it('links selected hour value, band, and vs-now copy', () => {
    const forecast = [slot(2, 60, 'very low'), slot(3, 180, 'high')];
    const insight = getForecastHourInsight(forecast, 0, 150, 'friendly');
    expect(insight).not.toBeNull();
    expect(insight!.value).toBe(60);
    expect(insight!.band).toBe('very low');
    expect(insight!.condition.toLowerCase()).toContain('very low');
    expect(insight!.vsNow).toMatch(/cleaner than now/i);
    expect(insight!.action.toLowerCase()).toMatch(/clean|best|shift|load/);
  });

  it('marks best-window slots and prefers action copy for them', () => {
    const forecast = [slot(1, 40, 'very low'), slot(2, 45, 'very low')];
    const insight = getForecastHourInsight(
      forecast,
      0,
      200,
      'friendly',
      new Date(),
      new Set([0, 1]),
    );
    expect(insight!.inBestWindow).toBe(true);
    expect(insight!.action.toLowerCase()).toMatch(/best window/);
  });

  it('uses snarky condition labels when tone is snarky', () => {
    const forecast = [slot(1, 40, 'very low')];
    const insight = getForecastHourInsight(forecast, 0, 120, 'snarky', new Date(), new Set());
    expect(insight!.condition.toLowerCase()).not.toBe('very low');
  });

  it('reports dirtier-than-now for high future hours', () => {
    const forecast = [slot(2, 280, 'very high')];
    const insight = getForecastHourInsight(forecast, 0, 90, 'friendly');
    expect(insight!.vsNow).toMatch(/dirtier than now/i);
    expect(insight!.action.toLowerCase()).toMatch(/avoid|heavy|shift/);
  });

  it('uses live-grid wording for the current slot instead of vs-now', () => {
    const now = new Date('2026-09-21T15:10:00.000Z');
    const forecast = [slotAt(new Date('2026-09-21T15:00:00.000Z'), 214, 'high')];
    const insight = getForecastHourInsight(forecast, 0, 166, 'friendly', now);
    expect(insight!.isCurrent).toBe(true);
    expect(insight!.vsNow).toMatch(/live grid reading/i);
  });
});

describe('findDefaultForecastIndex', () => {
  it('prefers the slot that contains now', () => {
    const now = new Date('2026-09-21T15:20:00.000Z');
    const forecast = [
      slotAt(new Date('2026-09-21T14:30:00.000Z'), 100),
      slotAt(new Date('2026-09-21T15:00:00.000Z'), 110),
      slotAt(new Date('2026-09-21T15:30:00.000Z'), 90),
    ];
    expect(findDefaultForecastIndex(forecast, now)).toBe(1);
  });

  it('falls back to first future hour', () => {
    const now = new Date('2026-09-21T16:00:00.000Z');
    const forecast = [
      slotAt(new Date('2026-09-21T14:00:00.000Z'), 100),
      slotAt(new Date('2026-09-21T18:00:00.000Z'), 90),
    ];
    expect(findDefaultForecastIndex(forecast, now)).toBe(1);
  });
});

describe('current-hour line agrees with the now-or-wait card', () => {
  const now = new Date('2026-09-21T15:10:00.000Z');
  const current = [slotAt(new Date('2026-09-21T15:00:00.000Z'), 260, 'high')];

  it('does not say "wait" when the card says now', () => {
    const insight = getForecastHourInsight(current, 0, 260, 'friendly', now, new Set(), 'use_now');
    expect(insight!.action.toLowerCase()).not.toMatch(/wait/);
  });

  it('says wait when the card says wait, even in a clean hour', () => {
    const clean = [slotAt(new Date('2026-09-21T15:00:00.000Z'), 45, 'very low')];
    const insight = getForecastHourInsight(clean, 0, 45, 'friendly', now, new Set([0]), 'wait');
    expect(insight!.action).toMatch(/wait if you can/i);
    expect(insight!.action).not.toMatch(/best window is open/i);
  });

  it('uses no em dashes in action copy', () => {
    const bands = ['very low', 'low', 'moderate', 'high', 'very high'] as const;
    for (const band of bands) {
      const f = [slotAt(new Date('2026-09-21T15:00:00.000Z'), 100, band)];
      expect(getForecastHourInsight(f, 0, 100, 'friendly', now)!.action).not.toMatch(/—/);
    }
  });
});
