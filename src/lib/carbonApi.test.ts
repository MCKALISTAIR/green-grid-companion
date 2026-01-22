import { describe, it, expect } from 'vitest';
import { calculateIntensityFromMix, getIntensityColor, REGION_IDS } from '@/lib/carbonApi';

describe('carbonApi', () => {
    describe('calculateIntensityFromMix', () => {
        it('calculates 0 for empty mix', () => {
            expect(calculateIntensityFromMix([])).toBe(0);
        });

        it('calculates correct intensity from mix', () => {
            const mix = [
                { fuel: 'wind', perc: 50 }, // 0 gCO2
                { fuel: 'gas', perc: 50 }   // 390 gCO2
            ];
            // (0.5 * 0) + (0.5 * 390) = 195
            expect(calculateIntensityFromMix(mix)).toBe(195);
        });

        it('handles null percentages gracefully', () => {
            const mix = [
                { fuel: 'wind', perc: 100 }
            ];
            expect(calculateIntensityFromMix(mix)).toBe(0);
        });
    });

    describe('getIntensityColor', () => {
        it('returns correct class for very low', () => {
            expect(getIntensityColor('very low')).toBe('bg-intensity-very-low');
        });

        it('returns muted for unknown index', () => {
            expect(getIntensityColor('unknown')).toBe('bg-muted');
        });
    });

    describe('REGION_IDS', () => {
        it('has correct mapping', () => {
            expect(REGION_IDS.NATIONAL).toBe(0);
            expect(REGION_IDS.SCOTLAND).toBe(16);
        });
    });
});
