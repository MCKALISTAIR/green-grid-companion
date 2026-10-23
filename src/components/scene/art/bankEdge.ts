/**
 * BH-90: geometry for the unknown-weather cloud bank's scalloped top edge.
 */
/** Small seeded PRNG so the unknown-weather bank is irregular but stable. */
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deepest a lobe rises above the bank's baseline, in px. */
export const BANK_EDGE_DEPTH = 24;

type Pt = readonly [number, number];
type Lobe = readonly [Pt, Pt, Pt, Pt];

const lerp = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

/** The part of a cubic between t0 and t1 (de Casteljau). */
function subCubic([p0, p1, p2, p3]: Lobe, t0: number, t1: number): Lobe {
  const split = (c: Lobe, t: number): [Lobe, Lobe] => {
    const a = lerp(c[0], c[1], t);
    const b = lerp(c[1], c[2], t);
    const d = lerp(c[2], c[3], t);
    const e = lerp(a, b, t);
    const f = lerp(b, d, t);
    const g = lerp(e, f, t);
    return [
      [c[0], a, e, g],
      [g, f, d, c[3]],
    ];
  };
  const [, right] = split([p0, p1, p2, p3], t0);
  const [mid] = split(right, (t1 - t0) / (1 - t0));
  return mid;
}

/**
 * BH-90: the lobes of a bank's top edge: rounded, of uneven width and height, so
 * it never reads as one repeating row. Coordinates are px from the bank's top;
 * every lobe's highest point is at y >= 1, so the box top is the highest cloud top.
 */
export function bankLobes(width: number, seed: number, phase = 0): Lobe[] {
  const rand = seeded(seed);
  const base = BANK_EDGE_DEPTH;
  const lobes: Lobe[] = [];
  let x = -phase;
  let y = base - rand() * 5;
  while (x < width) {
    const w = 38 + rand() * 44;
    const h = Math.min(base - 1, w * (0.2 + rand() * 0.16));
    const nx = x + w;
    const ny = base - rand() * 5;
    // Controls at 4/3 h above the chord peak the cubic at about h: a soft dome.
    const peak = Math.max(1, Math.min(y, ny) - h);
    const cy = Math.min(y, ny) - ((Math.min(y, ny) - peak) * 4) / 3;
    lobes.push([
      [x, y],
      [x + w * 0.04, cy],
      [nx - w * 0.04, cy],
      [nx, ny],
    ]);
    x = nx;
    y = ny;
  }
  return lobes;
}

const f1 = (n: number) => n.toFixed(1);
const cubicTo = (c: Lobe) =>
  `C${f1(c[1][0])} ${f1(c[1][1])} ${f1(c[2][0])} ${f1(c[2][1])} ${f1(c[3][0])} ${f1(c[3][1])}`;

/** The bank's top edge as one path. */
export function irregularBankEdge(width: number, seed: number, phase = 0): string {
  const lobes = bankLobes(width, seed, phase);
  return `M${f1(lobes[0][0][0])} ${f1(lobes[0][0][1])} ` + lobes.map(cubicTo).join(' ');
}

/** The lit rim: only the crown of each lobe (ART-DIRECTION.md §4 rim light). */
export function bankRim(width: number, seed: number, phase = 0): string {
  return bankLobes(width, seed, phase)
    .map((l) => {
      const c = subCubic(l, 0.2, 0.8);
      return `M${f1(c[0][0])} ${f1(c[0][1])} ${cubicTo(c)}`;
    })
    .join(' ');
}
