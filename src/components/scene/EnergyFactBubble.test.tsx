import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { EnergyFactBubble } from './EnergyFactBubble';

const weatherResult = { weather: { windSpeed: 5, isRaining: false, isSnowing: false } };
vi.mock('@/hooks/useWeatherData', () => ({
  useWeatherData: () => weatherResult,
}));
vi.mock('@/hooks/useTimeOfDay', () => ({ useTimeOfDay: () => ({ isNight: false }) }));
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => true }));

describe('EnergyFactBubble', () => {
  it('shows nothing while there is no real reading (loading / error)', () => {
    const { container } = render(<EnergyFactBubble intensity={0} hasReading={false} />);
    expect(container.textContent).toBe('');
  });

  it('shows a fact once there is a reading', () => {
    const { container } = render(<EnergyFactBubble intensity={150} hasReading />);
    expect(container.textContent?.length).toBeGreaterThan(10);
  });
});

describe('EnergyFactBubble plain variant', () => {
  it('renders the fact text exactly, with no quote marks around it', async () => {
    const { ENERGY_FACTS } = await import('@/lib/energyFacts');
    const { container } = render(<EnergyFactBubble intensity={150} hasReading variant="plain" />);
    const text = container.querySelector('p')?.textContent ?? '';
    expect(ENERGY_FACTS.map((f) => f.text)).toContain(text);
    expect(text).not.toMatch(/^["“„]|["”„]$/);
  });

  it('no fact string carries its own quote marks', async () => {
    const { ENERGY_FACTS } = await import('@/lib/energyFacts');
    for (const f of ENERGY_FACTS) expect(f.text).not.toMatch(/["„“”«»]/);
  });
});
