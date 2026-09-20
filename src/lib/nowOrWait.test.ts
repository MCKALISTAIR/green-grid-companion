import { describe, expect, it } from 'vitest';
import {
  getNowOrWaitDecision,
  DECISION_HORIZON_HOURS,
  MEANINGFUL_IMPROVEMENT,
} from './nowOrWait';
import type { ForecastData } from '@/lib/carbonApi';

function slot(hoursFromNow: number, intensity: number, now: Date): ForecastData {
  const from = new Date(now.getTime() + hoursFromNow * 3600_000);
  const to = new Date(from.getTime() + 30 * 60_000);
  return {
    from: from.toISOString(),
    to: to.toISOString(),
    intensity: { forecast: intensity, index: 'moderate', actual: intensity },
  };
}

function buildForecast(
  now: Date,
  pattern: Array<{ atHour: number; intensity: number }>,
  totalHours = 48,
): ForecastData[] {
  const byHour = new Map(pattern.map((p) => [p.atHour, p.intensity]));
  const forecast: ForecastData[] = [];
  for (let i = 0; i < totalHours * 2; i++) {
    const hoursFromNow = 0.25 + i * 0.5;
    const hourBucket = Math.floor(hoursFromNow);
    const intensity = byHour.get(hourBucket) ?? 180;
    forecast.push(slot(hoursFromNow, intensity, now));
  }
  return forecast;
}

describe('getNowOrWaitDecision', () => {
  const now = new Date('2026-09-20T12:00:00.000Z');

  it('says use now when intensity is excellent', () => {
    const forecast = buildForecast(now, [{ atHour: 4, intensity: 40 }]);
    const decision = getNowOrWaitDecision(40, forecast, now);
    expect(decision.action).toBe('use_now');
    expect(decision.headline).toBe('Use energy now');
    expect(decision.tip.toLowerCase()).toMatch(/excellent|clean|good time/);
    expect(decision.countdownTarget).toBeNull();
  });

  it('waits only for a meaningfully cleaner window inside the decision horizon', () => {
    const forecast = buildForecast(now, [
      { atHour: 3, intensity: 60 },
      { atHour: 4, intensity: 60 },
      { atHour: 5, intensity: 60 },
    ]);
    const decision = getNowOrWaitDecision(180, forecast, now);
    expect(decision.action).toBe('wait');
    expect(decision.headline).toMatch(/Wait until/i);
    expect(decision.tip.toLowerCase()).toMatch(/wait|shift|plan/);
    expect(decision.countdownTarget).not.toBeNull();
    expect(decision.windowAvg).toBeLessThanOrEqual(180 - MEANINGFUL_IMPROVEMENT);
  });

  it('does not ask users to wait ~2 days for absolute best', () => {
    // Dirty for the near horizon, cleaner only after horizon
    const forecast = buildForecast(now, [
      { atHour: DECISION_HORIZON_HOURS + 6, intensity: 50 },
      { atHour: DECISION_HORIZON_HOURS + 7, intensity: 50 },
      { atHour: DECISION_HORIZON_HOURS + 8, intensity: 50 },
    ]);
    const decision = getNowOrWaitDecision(150, forecast, now);
    expect(decision.action).toBe('use_now');
    expect(decision.headline).toBe('Use energy now');
    expect(decision.tip.toLowerCase()).not.toMatch(/good time to use energy before levels rise/);
    expect(decision.countdownTarget).toBeNull();
  });

  it('keeps tip aligned with wait headline', () => {
    const forecast = buildForecast(now, [
      { atHour: 2, intensity: 55 },
      { atHour: 3, intensity: 55 },
      { atHour: 4, intensity: 55 },
    ]);
    const decision = getNowOrWaitDecision(200, forecast, now);
    expect(decision.action).toBe('wait');
    expect(decision.tip.toLowerCase()).not.toMatch(/good time to use energy/);
    expect(decision.tip.toLowerCase()).not.toMatch(/excellent right now/);
  });
});
