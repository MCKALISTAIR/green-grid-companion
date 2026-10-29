/**
 * UK Energy Efficiency Standards & Averages
 *
 * Sourced from Ofgem's Typical Domestic Consumption Values (TDCV) 2024/2025.
 * Values represent typical annual electricity consumption.
 *
 * Source: Ofgem, October 2023 Revision (valid for 2024/2025)
 * https://www.ofgem.gov.uk/publications/decision-typical-domestic-consumption-values-2023
 */

export const OFGEM_TDCV_2025 = {
  // Low (Flat / 1-Bed)
  // Profile Class 1
  LOW: {
    annualKwh: 1800,
    label: 'Small (1-2 people)',
    description: 'Typical usage for a flat or small home with 1-2 people.',
  },

  // Medium (2-3 Bed House)
  // Profile Class 1
  MEDIUM: {
    annualKwh: 2700,
    label: 'Medium (2-3 people)',
    description: 'Typical usage for a semi-detached or terraced house with 2-3 people.',
  },

  // High (4+ Bed House)
  // Profile Class 1
  HIGH: {
    annualKwh: 4100,
    label: 'Large (4+ people)',
    description: 'Typical usage for a detached house with 4+ people.',
  },
} as const;

export type HouseType = 'LOW' | 'MEDIUM' | 'HIGH' | 'CUSTOM';

export const DEFAULT_HOUSE_TYPE: HouseType = 'MEDIUM';

/**
 * Get the average daily kWh consumption for a given house type.
 */
export function getAverageDailyKwh(
  type: HouseType = DEFAULT_HOUSE_TYPE,
  customAnnualKwh?: number,
): number {
  if (type === 'CUSTOM') {
    return Number(((customAnnualKwh || 0) / 365).toFixed(2));
  }
  const annual = OFGEM_TDCV_2025[type].annualKwh;
  return Number((annual / 365).toFixed(2));
}

export function getHouseTypeLabel(type: HouseType): string {
  return OFGEM_TDCV_2025[type].label;
}
