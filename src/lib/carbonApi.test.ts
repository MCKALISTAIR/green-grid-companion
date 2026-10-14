import { describe, it, expect } from 'vitest';
import {
  CARBON_FACTORS,
  IMPORTS_FACTOR,
  REGION_IMPORTS_FACTOR,
  calculateIntensityFromMix,
  getIntensityColor,
  importsFactorForRegion,
  pickLiveIntensity,
  REGION_IDS,
  UK_REGIONS,
  UK_REGIONS_CONFIG,
} from '@/lib/carbonApi';
import southScotlandWeek from '@/test/fixtures/neso-regional-south-scotland-history-2026-10-04.json';
import southEastWeek from '@/test/fixtures/neso-regional-south-east-week-2026-10-04.json';
import eastEnglandWeek from '@/test/fixtures/neso-regional-east-england-week-2026-10-04.json';
import londonWeek from '@/test/fixtures/neso-regional-london-week-2026-10-04.json';

type Slot = { intensity: { forecast: number }; generationmix: { fuel: string; perc: number }[] };

describe('carbonApi', () => {
  describe('calculateIntensityFromMix', () => {
    it('calculates 0 for empty mix', () => {
      expect(calculateIntensityFromMix([])).toBe(0);
    });

    it('calculates correct intensity from mix', () => {
      const mix = [
        { fuel: 'wind', perc: 50 }, // 0 gCO2
        { fuel: 'gas', perc: 50 }, // 394 gCO2 (NESO CCGT)
      ];
      // (0.5 * 0) + (0.5 * 394) = 197
      expect(calculateIntensityFromMix(mix)).toBe(197);
    });

    it('uses NESO methodology factors (Table 1 / /intensity/factors)', () => {
      expect(CARBON_FACTORS).toEqual({
        biomass: 120,
        coal: 937,
        imports: 53,
        gas: 394,
        nuclear: 0,
        other: 300,
        hydro: 0,
        solar: 0,
        wind: 0,
      });
      expect(IMPORTS_FACTOR).toBe(53); // NESO's French imports default
      expect(REGION_IMPORTS_FACTOR[10]).toBe(405); // East England
      expect(REGION_IMPORTS_FACTOR[13]).toBe(120); // London
      expect(importsFactorForRegion(14)).toBe(IMPORTS_FACTOR);
      expect(importsFactorForRegion(null)).toBe(IMPORTS_FACTOR);
    });

    it('applies a higher imports factor for East England than the national default', () => {
      const mix = [
        { fuel: 'imports', perc: 30 },
        { fuel: 'wind', perc: 70 },
      ];
      // 0.3 * 53 = 15.9 → 16
      expect(calculateIntensityFromMix(mix)).toBe(16);
      // 0.3 * 405 = 121.5 → 122
      expect(calculateIntensityFromMix(mix, 10)).toBe(122);
    });

    it('South Scotland zero-carbon week (4-11 Oct): Est is 0 whenever NESO forecasts 0, bar a few import-heavy half hours', () => {
      const slots = (southScotlandWeek as { data: { data: Slot[] } }).data.data;
      const zero = slots.filter((s) => s.intensity.forecast === 0);
      expect(zero.length).toBeGreaterThan(300);
      const nonZeroEst = zero
        .map((s) => calculateIntensityFromMix(s.generationmix, 2))
        .filter((v) => v > 0);
      // Imports carry a non-zero factor, so a half hour with >= 1% imports
      // rounds to 1 g. NESO's own import factor that day was lower.
      expect(nonZeroEst.every((v) => v <= 1)).toBe(true);
      expect(nonZeroEst.length / zero.length).toBeLessThan(0.02);
    });

    it('South East week (4-11 Oct, ~32% imports): Est tracks the NESO forecast to within ~10 g on average', () => {
      const slots = (southEastWeek as { data: Slot[] }).data;
      const errors = slots.map((s) =>
        Math.abs(calculateIntensityFromMix(s.generationmix, 14) - s.intensity.forecast),
      );
      const mae = errors.reduce((a, b) => a + b, 0) / errors.length;
      expect(mae).toBeLessThan(10); // the old factors (imports 250) were ~58 g out
    });

    it('East England week (4-11 Oct): region factor cuts MAE vs NESO forecast vs the French default', () => {
      const slots = (eastEnglandWeek as { data: Slot[] }).data;
      const mae = (regionId: number | null) => {
        const errors = slots.map((s) =>
          Math.abs(calculateIntensityFromMix(s.generationmix, regionId) - s.intensity.forecast),
        );
        return errors.reduce((a, b) => a + b, 0) / errors.length;
      };
      const defaultMae = mae(null);
      const regionalMae = mae(10);
      expect(defaultMae).toBeGreaterThan(15);
      expect(regionalMae).toBeLessThan(10);
      expect(regionalMae).toBeLessThan(defaultMae - 8);
    });

    it('London week (4-11 Oct): region factor improves MAE vs the French default', () => {
      const slots = (londonWeek as { data: Slot[] }).data;
      const mae = (regionId: number | null) => {
        const errors = slots.map((s) =>
          Math.abs(calculateIntensityFromMix(s.generationmix, regionId) - s.intensity.forecast),
        );
        return errors.reduce((a, b) => a + b, 0) / errors.length;
      };
      expect(mae(13)).toBeLessThan(mae(null));
      expect(mae(13)).toBeLessThan(12);
    });

    it('handles null percentages gracefully', () => {
      const mix = [{ fuel: 'wind', perc: 100 }];
      expect(calculateIntensityFromMix(mix)).toBe(0);
    });
  });

  describe('pickLiveIntensity', () => {
    it('prefers NESO actual when published for the open half-hour', () => {
      expect(pickLiveIntensity({ forecast: 147, actual: 160 })).toBe(160);
    });

    it('falls back to forecast when actual is missing', () => {
      expect(pickLiveIntensity({ forecast: 147, actual: null })).toBe(147);
      expect(pickLiveIntensity({ forecast: 12 })).toBe(12);
    });

    it('allows a real zero reading and rejects unusable values', () => {
      expect(pickLiveIntensity({ forecast: 0, actual: null })).toBe(0);
      expect(pickLiveIntensity({ forecast: null, actual: null })).toBeNull();
      expect(pickLiveIntensity(null)).toBeNull();
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
      const expectedLength = UK_REGIONS_CONFIG.reduce(
        (acc, region) => acc + region.postcodes.length,
        0,
      );
      expect(UK_REGIONS.length).toBe(expectedLength);
    });

    it('contains all expected regions', () => {
      // Sample checks
      const northScotland = UK_REGIONS.filter((r) => r.name === 'North Scotland');
      expect(northScotland.length).toBe(6); // AB, IV, KW, PH, ZE, HS
      expect(northScotland.map((r) => r.postcode)).toContain('AB');
      expect(northScotland.map((r) => r.postcode)).toContain('ZE');

      const london = UK_REGIONS.filter((r) => r.name === 'London');
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
