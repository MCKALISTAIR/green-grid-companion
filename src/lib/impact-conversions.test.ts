import { describe, it, expect } from 'vitest';
import { getImpactEquivalents } from './impact-conversions';

describe('getImpactEquivalents', () => {
    it('returns all zeros for 0 kgCO2', () => {
        expect(getImpactEquivalents(0)).toEqual({
            milesDriven: 0,
            smartphonesCharged: 0,
            treesPlanted: 0,
            kettlesBoiled: 0
        });
    });

    it('returns all zeros for negative kgCO2', () => {
        expect(getImpactEquivalents(-5)).toEqual({
            milesDriven: 0,
            smartphonesCharged: 0,
            treesPlanted: 0,
            kettlesBoiled: 0
        });
    });

    it('calculates correct values for a positive integer (10 kgCO2)', () => {
        // 10 * 2.5 = 25.0
        // 10 * 125 = 1250
        // 10 / 0.06 = 166.666... -> 166
        // 10 * 55 = 550
        expect(getImpactEquivalents(10)).toEqual({
            milesDriven: 25.0,
            smartphonesCharged: 1250,
            treesPlanted: 166,
            kettlesBoiled: 550
        });
    });

    it('calculates correct values for a decimal (1.5 kgCO2)', () => {
        // 1.5 * 2.5 = 3.75 -> 3.8 (toFixed(1))
        // 1.5 * 125 = 187.5 -> 187 (floor)
        // 1.5 / 0.06 = 25
        // 1.5 * 55 = 82.5 -> 82 (floor)
        expect(getImpactEquivalents(1.5)).toEqual({
            milesDriven: 3.8,
            smartphonesCharged: 187,
            treesPlanted: 25,
            kettlesBoiled: 82
        });
    });

    it('handles rounding for milesDriven correctly', () => {
        // 1.3 * 2.5 = 3.25. Floating point 3.25 is exact.
        // toFixed(1) rounds 3.25 to "3.3" (standard rounding half up for .5).
        expect(getImpactEquivalents(1.3).milesDriven).toBe(3.3);

        // 1.02 * 2.5 = 2.55. Floating point representation is slightly less than 2.55 (approx 2.5499999999999998).
        // toFixed(1) correctly rounds this down to "2.5".
        expect(getImpactEquivalents(1.02).milesDriven).toBe(2.5);
    });

    it('handles large numbers correctly', () => {
        // 1000 * 2.5 = 2500.0
        // 1000 * 125 = 125000
        // 1000 / 0.06 = 16666.66... -> 16666
        // 1000 * 55 = 55000
        expect(getImpactEquivalents(1000)).toEqual({
            milesDriven: 2500.0,
            smartphonesCharged: 125000,
            treesPlanted: 16666,
            kettlesBoiled: 55000
        });
    });
});
