import { describe, expect, it } from 'vitest';
import { getMixBreakdown, getRenewablesPercentage } from './generationUtils';

describe('getMixBreakdown', () => {
  const southScotland = [
    { fuel: 'biomass', perc: 0 }, { fuel: 'coal', perc: 0 }, { fuel: 'imports', perc: 0 },
    { fuel: 'gas', perc: 0 }, { fuel: 'nuclear', perc: 63 }, { fuel: 'other', perc: 0 },
    { fuel: 'hydro', perc: 4 }, { fuel: 'solar', perc: 0 }, { fuel: 'wind', perc: 33 },
  ];

  it('splits a zero-carbon mix into renewable and nuclear', () => {
    expect(getMixBreakdown(southScotland)).toEqual({ renewable: 37, nuclear: 63, imports: 0, fossil: 0, other: 0 });
  });

  it('uses the same renewable definition as the hero line', () => {
    expect(getMixBreakdown(southScotland)?.renewable).toBe(getRenewablesPercentage(southScotland));
  });

  it('groups gas+coal as fossil and interconnectors as imports', () => {
    const b = getMixBreakdown([
      { fuel: 'Gas', perc: 40 }, { fuel: 'coal', perc: 2 }, { fuel: 'interconnectors', perc: 8 }, { fuel: 'storage', perc: 1 },
    ]);
    expect(b).toEqual({ renewable: 0, nuclear: 0, imports: 8, fossil: 42, other: 1 });
  });

  it('returns null without data', () => {
    expect(getMixBreakdown(undefined)).toBeNull();
    expect(getMixBreakdown([])).toBeNull();
  });
});
