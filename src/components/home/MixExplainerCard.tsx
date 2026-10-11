import { useEffect, useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { GenerationMix } from '@/lib/carbonApi';
import { biomassCaption, explainerSentence, splitMix } from '@/lib/mixExplainer';
import { cn } from '@/lib/utils';

const KEY = 'gridsense-mix-explainer-collapsed';

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(KEY) === 'true';
  } catch {
    return false;
  }
}

/** "What's behind your N" (spec §4.6). Hidden when the regional mix is missing. */
export function MixExplainerCard({ mix, region, intensity }: { mix: GenerationMix[]; region: string; intensity: number }) {
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const bodyId = useId();
  useEffect(() => {
    try {
      localStorage.setItem(KEY, String(collapsed));
    } catch {
      /* ignore */
    }
  }, [collapsed]);
  const s = splitMix(mix);
  if (!s) return null;
  const segs = [
    { k: 'Renewable', v: s.renewable, c: 'hsl(var(--intensity-very-low))', always: true },
    { k: 'Nuclear', v: s.nuclear, c: 'hsl(var(--gen-nuclear))', always: true },
    { k: 'Fossil', v: s.fossil, c: 'hsl(var(--gen-gas))', always: true },
    { k: 'Imports', v: s.imports, c: 'hsl(var(--gen-imports))', always: false },
    { k: 'Other', v: s.other, c: 'hsl(var(--gen-other))', always: false },
  ].filter((x) => x.always || x.v > 0);
  const biomass = biomassCaption(s);

  return (
    <section className="rounded-[20px] bg-card p-4 shadow-[var(--shadow-md)]" data-testid="mix-explainer">
      <button
        type="button"
        className="flex min-h-11 w-full items-center justify-between gap-2 text-left"
        aria-expanded={!collapsed}
        aria-controls={bodyId}
        onClick={() => setCollapsed((c) => !c)}
      >
        <h3 className="text-[17px] font-extrabold leading-[1.25] tracking-[-0.01em]">What&apos;s behind your {intensity}</h3>
        <ChevronDown className={cn('h-5 w-5 text-muted-foreground transition-transform', !collapsed && 'rotate-180')} aria-hidden />
      </button>
      {!collapsed && (
        <div id={bodyId} className="mt-2">
          <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full" aria-hidden>
            {segs.filter((x) => x.v > 0).map((x) => (
              <div key={x.k} className="h-full rounded-full" style={{ width: `${x.v}%`, background: x.c, minWidth: 3 }} />
            ))}
          </div>
          <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[12px] font-semibold">
            {segs.map((x) => (
              <li key={x.k} className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: x.c }} aria-hidden />
                {x.k} <b className="font-extrabold tabular-nums">{Math.round(x.v)}%</b>
              </li>
            ))}
          </ul>
          <p className="mt-2.5 text-[14px] leading-[1.5]">{explainerSentence(s, region, intensity)}</p>
          {biomass && <p className="mt-1.5 text-[12px] font-semibold leading-[1.4] text-muted-foreground">{biomass}</p>}
        </div>
      )}
    </section>
  );
}
