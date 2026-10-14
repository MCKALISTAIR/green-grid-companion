import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ForecastData } from '@/lib/carbonApi';
import { ForecastSummary } from './ForecastSummary';
import southScotland from '@/test/fixtures/neso-regional-south-scotland-2026-10-11.json';

afterEach(() => vi.useRealTimers());

const SS = southScotland.data.data as unknown as ForecastData[];

describe('ForecastSummary (48-Hour Overview)', () => {
  it("shows South Scotland's real zeros with an explanation of why they are zero", () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-11T10:10:00Z'));
    render(<ForecastSummary forecast={SS} regionId={2} regionName="South Scotland" />);
    expect(screen.getAllByTestId('forecast-day-card')).toHaveLength(2);
    expect(screen.getByTestId('forecast-zero-note')).toHaveTextContent(
      "NESO's regional forecast for South Scotland is 0",
    );
  });

  it('shows "No data yet" instead of 0 when a day has no usable values', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-11T10:10:00Z'));
    const missing = [
      {
        from: '2026-10-12T10:00:00Z',
        to: '2026-10-12T10:30:00Z',
        intensity: { forecast: null, index: 'moderate' },
      },
    ] as unknown as ForecastData[];
    render(<ForecastSummary forecast={missing} />);
    expect(screen.getByTestId('forecast-day-empty')).toHaveTextContent('No data yet');
    expect(screen.queryByText('0')).toBeNull();
    expect(screen.queryByTestId('forecast-zero-note')).toBeNull();
  });

  it('does not show the zero note for GB national', () => {
    render(<ForecastSummary forecast={SS} regionId={null} regionName="National" />);
    expect(screen.queryByTestId('forecast-zero-note')).toBeNull();
  });
});
