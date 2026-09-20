import { getAverageDailyKwh, HouseType } from '@/lib/energy-standards';

/**
 * Rough household footprint estimate when smart-meter data is unavailable.
 * Uses Ofgem typical daily kWh × regional intensity (gCO₂/kWh).
 */
export function estimateDailyCarbonGrams(
  intensityGPerKwh: number,
  houseType: HouseType,
  customAnnualKwh?: number,
): number {
  const dailyKwh = getAverageDailyKwh(houseType, customAnnualKwh);
  if (!Number.isFinite(intensityGPerKwh) || intensityGPerKwh < 0 || dailyKwh <= 0) {
    return 0;
  }
  return Math.round(dailyKwh * intensityGPerKwh);
}

export function formatEstimatedKg(grams: number): string {
  return (grams / 1000).toFixed(2);
}
