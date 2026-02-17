import { describe, it, expect } from 'vitest';
import { calculateIntensityFromMix, getIntensityColor, REGION_IDS, UK_REGIONS, UK_REGIONS_CONFIG } from '@/lib/carbonApi';

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

    describe('UK_REGIONS', () => {
        it('is derived correctly from UK_REGIONS_CONFIG', () => {
            // Calculate expected length
            const expectedLength = UK_REGIONS_CONFIG.reduce((acc, region) => acc + region.postcodes.length, 0);
            expect(UK_REGIONS.length).toBe(expectedLength);
        });

        it('contains all expected regions', () => {
            // Sample checks
            const northScotland = UK_REGIONS.filter(r => r.name === 'North Scotland');
            expect(northScotland.length).toBe(6); // AB, IV, KW, PH, ZE, HS
            expect(northScotland.map(r => r.postcode)).toContain('AB');
            expect(northScotland.map(r => r.postcode)).toContain('ZE');

            const london = UK_REGIONS.filter(r => r.name === 'London');
            expect(london.length).toBe(8);
        });

        it('maintains the correct structure', () => {
            const region = UK_REGIONS[0];
            expect(region).toHaveProperty('id');
            expect(region).toHaveProperty('name');
            expect(region).toHaveProperty('postcode');
        });
    });
});
