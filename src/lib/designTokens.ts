/**
 * Design token introspection helpers.
 *
 * Reads CSS custom properties live from the DOM so the design system page
 * stays in sync with `src/index.css` automatically. No build-time mirror.
 */

export interface TokenSwatch {
  /** CSS custom property name without the leading `--`. */
  name: string;
  /** Raw value from the cascade (e.g. "150 70% 40%" or "#fff"). */
  raw: string;
  /** Resolved CSS color string usable in inline styles. */
  cssColor: string;
  /** `#rrggbb` form for display / copying. */
  hex: string;
}

const HSL_TRIPLE = /^(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)%\s+(-?\d+(?:\.\d+)?)%$/;

export function readToken(name: string): string {
  if (typeof window === "undefined") return "";
  return getComputedStyle(document.documentElement)
    .getPropertyValue(`--${name}`)
    .trim();
}

function hslTripleToRgb(triple: string): [number, number, number] | null {
  const m = HSL_TRIPLE.exec(triple);
  if (!m) return null;
  const h = parseFloat(m[1]);
  const s = parseFloat(m[2]) / 100;
  const l = parseFloat(m[3]) / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r1 = 0, g1 = 0, b1 = 0;
  if (hp >= 0 && hp < 1) [r1, g1, b1] = [c, x, 0];
  else if (hp < 2) [r1, g1, b1] = [x, c, 0];
  else if (hp < 3) [r1, g1, b1] = [0, c, x];
  else if (hp < 4) [r1, g1, b1] = [0, x, c];
  else if (hp < 5) [r1, g1, b1] = [x, 0, c];
  else [r1, g1, b1] = [c, 0, x];
  const m2 = l - c / 2;
  return [
    Math.round((r1 + m2) * 255),
    Math.round((g1 + m2) * 255),
    Math.round((b1 + m2) * 255),
  ];
}

function rgbToHex([r, g, b]: [number, number, number]): string {
  return (
    "#" +
    [r, g, b]
      .map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, "0"))
      .join("")
  );
}

export function getSwatch(name: string): TokenSwatch {
  const raw = readToken(name);
  const rgb = hslTripleToRgb(raw);
  return {
    name,
    raw,
    cssColor: rgb ? `hsl(${raw})` : raw || "transparent",
    hex: rgb ? rgbToHex(rgb) : "—",
  };
}

export function getSwatches(names: string[]): TokenSwatch[] {
  return names.map(getSwatch);
}

/** WCAG relative luminance from sRGB. */
function relativeLuminance([r, g, b]: [number, number, number]): number {
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Returns the WCAG contrast ratio between two HSL-triple tokens. */
export function contrastRatio(fgToken: string, bgToken: string): number {
  const fg = hslTripleToRgb(readToken(fgToken));
  const bg = hslTripleToRgb(readToken(bgToken));
  if (!fg || !bg) return 0;
  const L1 = relativeLuminance(fg);
  const L2 = relativeLuminance(bg);
  const [a, b] = L1 > L2 ? [L1, L2] : [L2, L1];
  return (a + 0.05) / (b + 0.05);
}

export type WcagGrade = "AAA" | "AA" | "AA Large" | "Fail";

export function gradeContrast(ratio: number): WcagGrade {
  if (ratio >= 7) return "AAA";
  if (ratio >= 4.5) return "AA";
  if (ratio >= 3) return "AA Large";
  return "Fail";
}
