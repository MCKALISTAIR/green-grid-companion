import { describe, it, expect } from 'vitest';
import { estimateDailyCarbonGrams, formatEstimatedKg } from './estimatedFootprint';

describe('estimateDailyCarbonGrams', () => {
  it('multiplies Ofgem daily kWh by intensity for MEDIUM homes', () => {
    // MEDIUM = 2700/365 ≈ 7.40 kWh/day
    expect(estimateDailyCarbonGrams(100, 'MEDIUM')).toBe(740);
  });

  it('returns 0 for invalid intensity or zero custom usage', () => {
    expect(estimateDailyCarbonGrams(-1, 'MEDIUM')).toBe(0);
    expect(estimateDailyCarbonGrams(100, 'CUSTOM', 0)).toBe(0);
  });

  it('formats grams as kg string', () => {
    expect(formatEstimatedKg(740)).toBe('0.74');
  });
});
