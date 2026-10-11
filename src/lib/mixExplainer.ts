import type { GenerationMix } from '@/lib/carbonApi';

/** Percent breakdown of a NESO generation mix (spec §4.6). */
export interface MixSplit {
  renewable: number;
  nuclear: number;
  fossil: number;
  gas: number;
  imports: number;
  other: number;
  biomass: number;
}

const sum = (mix: GenerationMix[], fuels: string[]) =>
  mix.filter((m) => fuels.includes(m.fuel.toLowerCase())).reduce((a, m) => a + (Number.isFinite(m.perc) ? m.perc : 0), 0);

/** null when the mix is missing (hide the card, never show zeros). */
export function splitMix(mix: GenerationMix[] | null | undefined): MixSplit | null {
  if (!mix?.length) return null;
  const total = mix.reduce((a, m) => a + (Number.isFinite(m.perc) ? m.perc : 0), 0);
  if (total <= 0) return null;
  return {
    renewable: sum(mix, ['wind', 'solar', 'hydro', 'biomass']),
    nuclear: sum(mix, ['nuclear']),
    fossil: sum(mix, ['gas', 'coal']),
    gas: sum(mix, ['gas']),
    imports: sum(mix, ['imports']),
    other: sum(mix, ['other']),
    biomass: sum(mix, ['biomass']),
  };
}

const r = (n: number) => Math.round(n);

/** The explainer sentence: the first rule that's true wins. */
export function explainerSentence(s: MixSplit, region: string, n: number): string {
  if (s.nuclear > s.renewable) {
    return `Nuclear made ${r(s.nuclear)}% of ${region}'s power. It's low carbon but not renewable, so the number can sit at ${n} while renewables are ${r(s.renewable)}%.`;
  }
  if (s.fossil >= 10) return `Renewables made ${r(s.renewable)}% and gas ${r(s.gas)}%. Gas is what pushes the number up.`;
  return `Renewables made ${r(s.renewable)}% of ${region}'s power, with nuclear at ${r(s.nuclear)}%.`;
}

export function biomassCaption(s: MixSplit): string | null {
  return s.biomass > 0.5 ? `Biomass (${r(s.biomass)}%) counts as renewable but isn't zero carbon.` : null;
}
