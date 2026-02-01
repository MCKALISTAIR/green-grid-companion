/**
 * Impact Conversion Helpers
 * 
 * Provides rough conversions from kgCO2 to relatable "Real World" units.
 * Sources: EPA Greenhouse Gas Equivalencies Calculator, DEFRA, Carbon Trust.
 * These are approximations for educational/motivational purposes.
 */

export interface ImpactEquivalents {
    milesDriven: number;
    smartphonesCharged: number;
    treesPlanted: number;
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
        // ~0.4 kg CO2 per mile (avg ICE car) -> 1 kg = 2.5 miles
        milesDriven: Number((safeKg * 2.5).toFixed(1)),

        // ~0.008 kg CO2 per full charge -> 1 kg = 125 charges
        smartphonesCharged: Math.floor(safeKg * 125),

        // ~20-25kg CO2 absorbed by a mature tree per year.
        // So 1kg is about "2 weeks of a tree's work" or 0.04-0.05 trees.
        // For "Trees Planted" we usually want a whole number or meaningful fraction.
        // Let's use "Carbon absorbed by X trees in a day" -> 1kg / (25kg/365) = 1kg / 0.068 = ~15 tree-days
        // Or for simplifying to "Trees planted":
        // 1 Tree absorbs ~25kg/year. So 1kg is 1/25th of a tree.
        // A better metric might be "Tree Days" but "Trees" is snappier.
        // Let's stick to "Equivalent to the daily carbon absorption of X trees":
        // 1 tree absorbs ~0.06kg/day. So 1kg = ~16 trees (for one day).
        // Let's define this clearly in the UI.
        treesPlanted: Math.floor(safeKg / 0.06),

        // Avg kettle boil (0.015 - 0.02 kg CO2) -> 1 kg = ~50-60 boils
        kettlesBoiled: Math.floor(safeKg * 55)
    };
}

export function getImpactColor(kgCO2: number): string {
    if (kgCO2 > 10) return "text-emerald-500"; // Excellent
    if (kgCO2 > 5) return "text-green-500";    // Good
    if (kgCO2 > 1) return "text-teal-500";     // Okay
    return "text-muted-foreground";            // Small
}
