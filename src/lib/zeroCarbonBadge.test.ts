import { describe, it, expect } from 'vitest';
import { zeroCarbonBadgeText } from './zeroCarbonBadge';

describe('BH-30 zero-carbon badge copy', () => {
  it('never says "right now" on a regional forecast', () => {
    expect(zeroCarbonBadgeText(true, 'cheeky')).toBe('Forecast: 0 g here this half hour');
    expect(zeroCarbonBadgeText(true, 'plain')).toBe('NESO forecast: 0 g here this half hour');
    expect(zeroCarbonBadgeText(true, 'cheeky')).not.toMatch(/right now|zero-carbon power/i);
  });
  it('labels the GB figure as GB', () => {
    expect(zeroCarbonBadgeText(false, 'cheeky')).toBe('GB grid: 0 g this half hour');
  });
});
