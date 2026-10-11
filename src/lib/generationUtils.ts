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

export interface MixBreakdown {
    /** Wind, solar, hydro and biomass (same definition as getRenewablesPercentage). */
    renewable: number;
    nuclear: number;
    imports: number;
    /** Gas and coal. */
    fossil: number;
    other: number;
}

/**
 * Groups a generation mix into renewable / nuclear / imports / fossil / other
 * shares (percent, as given by NESO). Used by the hero's "where the power comes
 * from" explainer; a 0 g reading with a low renewable share usually means the
 * rest is nuclear.
 */
export function getMixBreakdown(mix: MixItem[] | null | undefined): MixBreakdown | null {
    if (!mix || mix.length === 0) return null;
    const out: MixBreakdown = { renewable: 0, nuclear: 0, imports: 0, fossil: 0, other: 0 };
    for (const m of mix) {
        if (!m || typeof m.fuel !== 'string' || !Number.isFinite(m.perc)) continue;
        const f = m.fuel.toLowerCase();
        if (['wind', 'solar', 'hydro', 'biomass'].includes(f)) out.renewable += m.perc;
        else if (f === 'nuclear') out.nuclear += m.perc;
        else if (f === 'imports' || f === 'interconnectors') out.imports += m.perc;
        else if (f === 'gas' || f === 'coal') out.fossil += m.perc;
        else out.other += m.perc;
    }
    return out;
}
