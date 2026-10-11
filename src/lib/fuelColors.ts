/**
 * Fuel colour tokens for the Generation Mix screen (cards, legend, dialog).
 * One place for Design to tweak. The neutral card surface carries no colour;
 * the source colour lives on the icon chip and the share bar only.
 *
 * `barLight` / `barDark` are tuned so the bar fill has at least 3:1 non-text
 * contrast against the neutral track in that mode (WCAG 1.4.11); see
 * src/lib/fuelColors.test.ts.
 */
export interface FuelTone {
  /** Bright brand hue (stacked mix bar, dark-mode accents). */
  hex: string;
  /** Bar fill + chip icon colour in light mode. */
  barLight: string;
  /** Bar fill + chip icon colour in dark mode. */
  barDark: string;
}

export const FUEL_TONES: Record<string, FuelTone> = {
  gas: { hex: '#f97316', barLight: '#c2410c', barDark: '#fb923c' },
  wind: { hex: '#38bdf8', barLight: '#0369a1', barDark: '#38bdf8' },
  solar: { hex: '#facc15', barLight: '#a16207', barDark: '#facc15' },
  nuclear: { hex: '#a78bfa', barLight: '#7c3aed', barDark: '#a78bfa' },
  hydro: { hex: '#34d399', barLight: '#047857', barDark: '#34d399' },
  biomass: { hex: '#4ade80', barLight: '#15803d', barDark: '#4ade80' },
  coal: { hex: '#78716c', barLight: '#57534e', barDark: '#a8a29e' },
  imports: { hex: '#f472b6', barLight: '#be185d', barDark: '#f472b6' },
  other: { hex: '#94a3b8', barLight: '#475569', barDark: '#94a3b8' },
};

/** Neutral share-bar track (same for every fuel). */
export const BAR_TRACK = { light: '#e6e9ee', dark: '#2b313b' } as const;

/** Chip tint alpha behind the icon (light / dark). */
export const CHIP_TINT_ALPHA = { light: 0.14, dark: 0.2, strongLight: 0.24, strongDark: 0.32 } as const;

export function getFuelTone(fuel: string): FuelTone {
  const key = fuel.toLowerCase();
  if (key === 'interconnectors') return FUEL_TONES.imports;
  return FUEL_TONES[key] ?? FUEL_TONES.other;
}

export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** WCAG relative luminance of a #rrggbb colour. */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * CSS custom properties for a fuel. Components read them with Tailwind
 * arbitrary values, e.g. `bg-[var(--fuel-bar)] dark:bg-[var(--fuel-bar-dark)]`.
 */
export function fuelStyleVars(fuel: string, strong = false): Record<string, string> {
  const t = getFuelTone(fuel);
  return {
    '--fuel-bar': t.barLight,
    '--fuel-bar-dark': t.barDark,
    '--fuel-chip': hexToRgba(t.hex, strong ? CHIP_TINT_ALPHA.strongLight : CHIP_TINT_ALPHA.light),
    '--fuel-chip-dark': hexToRgba(t.hex, strong ? CHIP_TINT_ALPHA.strongDark : CHIP_TINT_ALPHA.dark),
    '--bar-track': BAR_TRACK.light,
    '--bar-track-dark': BAR_TRACK.dark,
  };
}
