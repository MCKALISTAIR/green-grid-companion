import { Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { getMixBreakdown, type MixBreakdown } from '@/lib/generationUtils';
import type { GenerationMix } from '@/lib/carbonApi';

const ROWS: { key: keyof MixBreakdown; label: string; className: string }[] = [
  { key: 'renewable', label: 'Renewable', className: 'bg-emerald-500' },
  { key: 'nuclear', label: 'Nuclear', className: 'bg-violet-500' },
  { key: 'imports', label: 'Imports', className: 'bg-pink-500' },
  { key: 'fossil', label: 'Fossil', className: 'bg-orange-500' },
  { key: 'other', label: 'Other', className: 'bg-slate-400' },
];

/** Nuclear share worth calling out next to "x% renewable" (percentage points). */
export const NUCLEAR_CALLOUT_MIN = 5;

/** "· 63% nuclear" suffix for the hero renewables line, or null when not worth showing. */
export function nuclearCallout(mix: GenerationMix[] | undefined): string | null {
  const b = getMixBreakdown(mix);
  if (!b || b.nuclear < NUCLEAR_CALLOUT_MIN) return null;
  return `${b.nuclear.toFixed(0)}% nuclear`;
}

/**
 * Info button next to the hero's renewables line: explains that low-carbon
 * includes nuclear (and hydro/imports), with a compact breakdown.
 */
export function MixExplainer({ mix }: { mix: GenerationMix[] | undefined }) {
  const b = getMixBreakdown(mix);
  if (!b) return null;
  const rows = ROWS.filter((r) => b[r.key] > 0);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex h-6 w-6 items-center justify-center rounded-full text-white/80 hover:text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          aria-label="Where the power comes from"
          data-testid="mix-explainer-trigger"
        >
          <Info className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[260px] p-3 text-xs bg-card border-border space-y-2">
        <p className="font-semibold">Where the power comes from</p>
        <p className="text-muted-foreground">
          Low-carbon power isn't only renewables. Nuclear and hydro also emit almost no CO₂ while running, so the grid
          can read close to 0 g even when renewables are under half the mix.
        </p>
        <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted" aria-hidden="true">
          {rows.map((r) => (
            <div key={r.key} className={r.className} style={{ width: `${b[r.key]}%` }} />
          ))}
        </div>
        <ul className="space-y-1">
          {rows.map((r) => (
            <li key={r.key} className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${r.className}`} aria-hidden="true" />
              <span>{r.label}</span>
              <span className="ml-auto font-semibold tabular-nums">{b[r.key].toFixed(0)}%</span>
            </li>
          ))}
        </ul>
        <p className="text-muted-foreground">Renewable here means wind, solar, hydro and biomass.</p>
      </PopoverContent>
    </Popover>
  );
}
