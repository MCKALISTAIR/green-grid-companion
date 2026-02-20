export interface MixItem {
    fuel: string;
    perc: number;
    mw?: number;
}

export function getSortedMix(mix: MixItem[]): MixItem[] {
    return [...mix]
        .filter(m => m.perc > 0)
        .sort((a, b) => b.perc - a.perc);
}

export function getRenewablesPercentage(mix: MixItem[]): number {
    return mix
        .filter(m => ['wind', 'solar', 'hydro', 'biomass'].includes(m.fuel.toLowerCase()))
        .reduce((acc, m) => acc + m.perc, 0);
}

export function getEmbeddedSolarPercentage(mix: MixItem[], embeddedSolarMW: number | null | undefined): number | null {
    const solarItem = mix.find(m => m.fuel.toLowerCase() === 'solar');
    const totalSolarMW = solarItem?.mw ?? null;
    return (totalSolarMW && embeddedSolarMW && totalSolarMW > 0)
        ? Math.min((embeddedSolarMW / totalSolarMW) * 100, 100)
        : null;
}

export function getTotalSolarMW(mix: MixItem[]): number | null {
    const solarItem = mix.find(m => m.fuel.toLowerCase() === 'solar');
    return solarItem?.mw ?? null;
}
