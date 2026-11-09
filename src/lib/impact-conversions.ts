/**
 * Impact Conversion Helpers
 *
 * Provides rough conversions from kgCO2 to relatable "Real World" units.
 * Miles: DESNZ/DEFRA "Greenhouse gas reporting: conversion factors 2025", average
 * petrol car, 0.26187 kg CO2e per mile. The trees comparison was dropped (C2-02): no
 * primary source backs a per-tree absorption figure.
 * These are approximations for educational/motivational purposes.
 */

/** Official publication for the DESNZ/DEFRA 2025 conversion factors. */
export const DESNZ_2025_SOURCE_URL =
  'https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2025';

/** DESNZ 2025 conversion factor, average petrol car (kg CO2e per mile). */
export const PETROL_CAR_KG_CO2E_PER_MILE = 0.26187;
/** Miles driven per kg CO2e (1 / 0.26187, about 3.82). */
export const MILES_PER_KG_CO2E = 1 / PETROL_CAR_KG_CO2E_PER_MILE;

export interface ImpactEquivalents {
  milesDriven: number;
  smartphonesCharged: number;
  kettlesBoiled: number;
}

/**
 * Convert kg CO2 saved into relatable equivalents
 * @param kgCO2 The amount of carbon saved in kilograms
 */
export function getImpactEquivalents(kgCO2: number): ImpactEquivalents {
  // Prevent negative inputs
  const safeKg = Math.max(0, kgCO2);

  return {
    // DESNZ 2025 average petrol car: 0.26187 kg CO2e/mile -> 1 kg = ~3.82 miles
    milesDriven: Number((safeKg * MILES_PER_KG_CO2E).toFixed(1)),

    // ~0.008 kg CO2 per full charge -> 1 kg = 125 charges
    smartphonesCharged: Math.floor(safeKg * 125),

    // Avg kettle boil (0.015 - 0.02 kg CO2) -> 1 kg = ~50-60 boils
    kettlesBoiled: Math.floor(safeKg * 55),
  };
}

export function getImpactColor(kgCO2: number): string {
  if (kgCO2 > 10) return 'text-emerald-500'; // Excellent
  if (kgCO2 > 5) return 'text-green-500'; // Good
  if (kgCO2 > 1) return 'text-teal-500'; // Okay
  return 'text-muted-foreground'; // Small
}
