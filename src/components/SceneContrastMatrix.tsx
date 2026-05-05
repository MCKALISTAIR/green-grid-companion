import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { getSkyTopColor, getSkyGradient, getCarbonIndex } from "@/lib/sceneUtils";
import type { TimeOfDay } from "@/hooks/useTimeOfDay";
import { gradeContrast, type WcagGrade } from "@/lib/designTokens";

const TIMES: TimeOfDay[] = ["night", "dawn", "morning", "midday", "afternoon", "sunset", "dusk"];

const INTENSITY_SAMPLES: Array<{ value: number; label: string }> = [
  { value: 30, label: "Very low" },
  { value: 100, label: "Low" },
  { value: 200, label: "Moderate" },
  { value: 300, label: "High" },
  { value: 420, label: "Very high" },
];

const HSL_RE = /hsl\(\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)%\s+(-?\d+(?:\.\d+)?)%\s*\)/i;

function hslStringToRgb(hsl: string): [number, number, number] | null {
  const m = HSL_RE.exec(hsl);
  if (!m) return null;
  const h = parseFloat(m[1]);
  const s = parseFloat(m[2]) / 100;
  const l = parseFloat(m[3]) / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r1 = 0, g1 = 0, b1 = 0;
  if (hp < 1) [r1, g1, b1] = [c, x, 0];
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

function relLum([r, g, b]: [number, number, number]): number {
  const ch = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
}

function contrastVs(skyTop: string, fg: [number, number, number]): number {
  const bg = hslStringToRgb(skyTop);
  if (!bg) return 0;
  const L1 = relLum(fg);
  const L2 = relLum(bg);
  const [a, b] = L1 > L2 ? [L1, L2] : [L2, L1];
  return (a + 0.05) / (b + 0.05);
}

function gradeColor(grade: WcagGrade): string {
  if (grade === "AAA") return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
  if (grade === "AA") return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  if (grade === "AA Large") return "bg-amber-500/15 text-amber-700 dark:text-amber-300";
  return "bg-destructive/15 text-destructive";
}

const WHITE: [number, number, number] = [255, 255, 255];
const NEAR_BLACK: [number, number, number] = [15, 23, 42]; // slate-900 ≈ default foreground

export function SceneContrastMatrix() {
  const cells = useMemo(() => {
    return INTENSITY_SAMPLES.map((sample) => {
      const carbonIdx = getCarbonIndex(sample.value);
      const cleanliness = Math.max(0, Math.min(1, 1 - sample.value / 500));
      return {
        sample,
        rows: TIMES.map((time) => {
          const top = getSkyTopColor(carbonIdx, time, cleanliness);
          const gradient = getSkyGradient(carbonIdx, time, cleanliness);
          const cWhite = contrastVs(top, WHITE);
          const cBlack = contrastVs(top, NEAR_BLACK);
          return { time, top, gradient, cWhite, cBlack };
        }),
      };
    });
  }, []);

  return (
    <div className="space-y-8">
      <p className="text-sm text-muted-foreground">
        The atmospheric scene swaps colours by time-of-day, weather and grid carbon intensity. Static
        contrast tokens can't capture that — this matrix samples the actual sky-top colour for every
        combination and grades it against white and near-black foreground text.
      </p>

      <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
        <h4 className="mb-1 font-semibold">Pattern: scrim before text on scene</h4>
        <p className="text-muted-foreground">
          Because no single text colour passes WCAG AA across every state, any text overlaying{" "}
          <code className="font-mono">IntensityScene</code> sits inside a scrim:
        </p>
        <pre className="mt-2 overflow-x-auto rounded bg-background/60 p-3 font-mono text-xs">
{`<div className="rounded-xl bg-background/70 backdrop-blur-md p-4">
  <p className="text-foreground">142 gCO₂/kWh</p>
</div>`}
        </pre>
        <p className="mt-2 text-muted-foreground">
          The scrim guarantees the text contrast is judged against{" "}
          <code className="font-mono">--background</code> (which is in the static contrast matrix above), not
          the live sky.
        </p>
      </div>

      {cells.map(({ sample, rows }) => (
        <section key={sample.value} aria-labelledby={`intensity-${sample.value}`}>
          <h4 id={`intensity-${sample.value}`} className="mb-3 text-sm font-semibold">
            Intensity: {sample.label}{" "}
            <span className="font-mono text-xs text-muted-foreground">({sample.value} gCO₂/kWh)</span>
          </h4>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="p-3 font-medium">Time</th>
                  <th className="p-3 font-medium">Sky preview</th>
                  <th className="p-3 font-medium">Top colour</th>
                  <th className="p-3 font-medium">vs white</th>
                  <th className="p-3 font-medium">vs near-black</th>
                  <th className="p-3 font-medium">Recommendation</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const gWhite = gradeContrast(r.cWhite);
                  const gBlack = gradeContrast(r.cBlack);
                  const recommend =
                    gWhite !== "Fail" && gWhite !== "AA Large" && r.cWhite >= r.cBlack
                      ? "white text"
                      : gBlack !== "Fail" && gBlack !== "AA Large" && r.cBlack > r.cWhite
                      ? "near-black text"
                      : "use scrim";
                  return (
                    <tr key={r.time} className="border-t border-border align-middle">
                      <td className="p-3 capitalize">{r.time}</td>
                      <td className="p-3">
                        <div
                          className="h-10 w-32 rounded-md border border-border/60"
                          style={{ background: r.gradient }}
                          aria-hidden
                        />
                      </td>
                      <td className="p-3 font-mono text-xs text-muted-foreground">{r.top}</td>
                      <td className="p-3">
                        <span className={`inline-flex items-center gap-2 rounded-md px-2 py-0.5 text-xs font-medium ${gradeColor(gWhite)}`}>
                          {r.cWhite.toFixed(2)}:1 · {gWhite}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`inline-flex items-center gap-2 rounded-md px-2 py-0.5 text-xs font-medium ${gradeColor(gBlack)}`}>
                          {r.cBlack.toFixed(2)}:1 · {gBlack}
                        </span>
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">
                        <Badge variant={recommend === "use scrim" ? "destructive" : "secondary"}>{recommend}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      <div className="rounded-lg border border-border bg-muted/30 p-4 text-xs text-muted-foreground">
        <strong className="text-foreground">Method:</strong> contrast computed by parsing the sky-top
        HSL produced by <code className="font-mono">getSkyTopColor()</code> in{" "}
        <code className="font-mono">src/lib/sceneUtils.ts</code> and applying WCAG 2.1 relative-luminance
        formula. Mid/end gradient stops are visually similar but not exhaustively sampled. Weather
        modifiers (rain, fog, snow, thunderstorm) are excluded — they generally desaturate toward grey
        and behave like the moderate row.
      </div>
    </div>
  );
}
