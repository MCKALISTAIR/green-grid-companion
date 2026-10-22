import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { ForecastData } from '@/lib/carbonApi';

vi.mock('@/lib/haptics', () => ({
  hapticSelectionChanged: vi.fn(),
  hapticSelectionStart: vi.fn(),
  hapticSelectionEnd: vi.fn(),
}));

import { ForecastChart } from './ForecastChart';

function slots(): ForecastData[] {
  const start = new Date();
  start.setMinutes(start.getMinutes() < 30 ? 0 : 30, 0, 0);
  // Now and +30m moderate, then a 3-slot very-low window, then moderate.
  const idx = ['moderate', 'moderate', 'very low', 'very low', 'very low', 'moderate'];
  const g = [180, 170, 30, 20, 40, 160];
  return idx.map((index, i) => ({
    from: new Date(start.getTime() + i * 1800_000).toISOString(),
    to: new Date(start.getTime() + (i + 1) * 1800_000).toISOString(),
    intensity: { forecast: g[i], actual: null, index },
  })) as unknown as ForecastData[];
}

describe('ForecastChart best-window readout', () => {
  it('pins a short readout with an icon star and a full spoken label', async () => {
    render(<ForecastChart forecast={slots()} currentIntensity={180} />);
    fireEvent.click(screen.getByTestId('best-window-block'));
    const readout = await screen.findByTestId('best-window-readout', {}, { timeout: 2000 });
    expect(readout.textContent).toMatch(/^\d\d:\d\d–\d\d:\d\d · avg 30 g$/);
    expect(readout.textContent).not.toContain('★');
    expect(readout.textContent).not.toMatch(/\dh\)/);
    expect(readout.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(readout.getAttribute('aria-label')).toMatch(
      /^Best window, forecast, \d\d:\d\d to \d\d:\d\d, 1\.5 hours, average 30 grams CO2 per kilowatt hour\.$/,
    );
  });

  it('keeps the full unit in the legend and has no hover tooltips', () => {
    render(<ForecastChart forecast={slots()} currentIntensity={180} />);
    expect(screen.getByTestId('forecast-unit').textContent).toContain('gCO₂/kWh');
    expect(screen.queryByText('Tap to explore this hour')).toBeNull();
  });
});
