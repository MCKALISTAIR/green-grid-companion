import { describe, it, expect } from 'vitest';
import {
  getImpactEquivalents,
  MILES_PER_KG_CO2E,
  PETROL_CAR_KG_CO2E_PER_MILE,
} from './impact-conversions';

describe('getImpactEquivalents', () => {
  it('uses the DESNZ 2025 average petrol car factor (0.26187 kg CO2e/mile)', () => {
    expect(PETROL_CAR_KG_CO2E_PER_MILE).toBe(0.26187);
    expect(MILES_PER_KG_CO2E).toBe(1 / 0.26187);
    expect(MILES_PER_KG_CO2E).toBeCloseTo(3.82, 2);
  });

  it('returns all zeros for 0 kgCO2', () => {
    expect(getImpactEquivalents(0)).toEqual({
      milesDriven: 0,
      smartphonesCharged: 0,
      kettlesBoiled: 0,
    });
  });

  it('returns all zeros for negative kgCO2', () => {
    expect(getImpactEquivalents(-5)).toEqual({
      milesDriven: 0,
      smartphonesCharged: 0,
      kettlesBoiled: 0,
    });
  });

  it('calculates correct values for a positive integer (10 kgCO2)', () => {
    // 10 / 0.26187 = 38.187... -> 38.2
    // 10 * 125 = 1250
    // 10 * 55 = 550
    expect(getImpactEquivalents(10)).toEqual({
      milesDriven: 38.2,
      smartphonesCharged: 1250,
      kettlesBoiled: 550,
    });
  });

  it('calculates correct values for a decimal (1.5 kgCO2)', () => {
    // 1.5 / 0.26187 = 5.728... -> 5.7
    // 1.5 * 125 = 187.5 -> 187 (floor)
    // 1.5 * 55 = 82.5 -> 82 (floor)
    expect(getImpactEquivalents(1.5)).toEqual({
      milesDriven: 5.7,
      smartphonesCharged: 187,
      kettlesBoiled: 82,
    });
  });

  it('rounds milesDriven to one decimal place', () => {
    expect(getImpactEquivalents(1).milesDriven).toBe(3.8); // 3.8187...
    expect(getImpactEquivalents(0.5).milesDriven).toBe(1.9); // 1.909...
  });

  it('handles large numbers correctly', () => {
    // 1000 / 0.26187 = 3818.689... -> 3818.7
    expect(getImpactEquivalents(1000)).toEqual({
      milesDriven: 3818.7,
      smartphonesCharged: 125000,
      kettlesBoiled: 55000,
    });
  });
});
