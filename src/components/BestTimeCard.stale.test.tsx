import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import type { ForecastData } from '@/lib/carbonApi';

const spy = vi.fn((..._args: unknown[]) => ({ action: 'check_forecast' }));
vi.mock('@/lib/nowOrWait', async (orig) => ({
  ...(await orig<typeof import('@/lib/nowOrWait')>()),
  getNowOrWaitDecision: (...a: unknown[]) => spy(...a),
}));

import { WorstTimeSlot } from '@/components/BestTimeCard';

const SLOT = 30 * 60_000;
function forecastFromNow(values: number[]): ForecastData[] {
  const start = Math.floor(Date.now() / SLOT) * SLOT;
  return values.map((v, i) => ({
    from: new Date(start + i * SLOT).toISOString(),
    to: new Date(start + (i + 1) * SLOT).toISOString(),
    intensity: { forecast: v, actual: null, index: 'moderate' },
  })) as unknown as ForecastData[];
}

describe('WorstTimeSlot passes the reading time to now-or-wait (BH-59 follow-up)', () => {
  it('forwards lastUpdated so a stale reading cannot produce "use now"', () => {
    const values = [400, 400, 400, 400, 400, 400, ...Array(40).fill(100)];
    render(
      <WorstTimeSlot
        forecast={forecastFromNow(values)}
        intensity={400}
        lastUpdated="2026-01-01T00:00:00Z"
      />,
    );
    expect(spy).toHaveBeenCalled();
    expect(spy.mock.calls[0][3]).toBe('2026-01-01T00:00:00Z');
  });
});
