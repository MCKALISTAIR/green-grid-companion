import type { CSSProperties } from 'react';
import type { GenerationMix } from '@/lib/carbonApi';
import type { GenerationSourceMW } from '@/hooks/useGridDemand';
import { getFuelIcon } from '@/components/generation/fuelIcons';
import { formatLondonTime } from '@/lib/londonTime';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cn } from '@/lib/utils';

const ROLE: Record<string, string> = {
  imports: 'Interconnectors',
  // #47: no live source splits rooftop from solar farms, so no "Tap for split".
  solar: 'Incl. rooftop',
  wind: 'Renewable',
  nuclear: 'Low carbon',
  gas: 'Fossil',
  biomass: 'Renewable*',
  hydro: 'Renewable',
  other: 'Mixed sources',
  coal: 'Fossil',
};

const label = (fuel: string) => fuel[0].toUpperCase() + fuel.slice(1);

export interface GenerationMixCardProps {
  /** NESO GB shares for one half hour. */
  mix: GenerationMix[] | null | undefined;
  slotFrom: string | null;
  slotTo: string | null;
  /** Live MW per fuel from useGridDemand (empty when stale/unavailable). */
  live: GenerationSourceMW[];
  /** useGridDemand's data timestamp (ISO); present only when the figures are live. */
  liveTimestamp?: string | null;
  error?: boolean;
  onRetry?: () => void;
}

/** GB Generation mix card (spec §4.7). Shares from NESO, GW from the live grid-demand source (#47). */
export function GenerationMixCard({ mix, slotFrom, slotTo, live, liveTimestamp, error, onRetry }: GenerationMixCardProps) {
  const reduced = useReducedMotion();
  const slot =
    slotFrom && slotTo ? `${formatLondonTime(new Date(slotFrom))}\u2013${formatLondonTime(new Date(slotTo))}` : null;

  if (error || !mix?.length) {
    return (
      <section className="rounded-[20px] bg-card p-4 shadow-[var(--shadow-md)]" data-tour="generation-mix" data-testid="gen-mix">
        <h3 className="text-[17px] font-extrabold">Generation mix</h3>
        <p className="mt-2 text-[14px]">Generation mix isn&apos;t available right now.</p>
        {onRetry && (
          <button type="button" onClick={onRetry} className="mt-2 min-h-11 rounded-full border border-border px-4 text-[14px] font-bold">
            Try again
          </button>
        )}
      </section>
    );
  }

  const gwByFuel = new Map<string, number>();
  for (const s of live) {
    if (typeof s.mw === 'number' && Number.isFinite(s.mw)) gwByFuel.set((s.fuel || s.name).toLowerCase(), s.mw / 1000);
  }
  const gwLive = !!liveTimestamp && gwByFuel.size > 0;
  const totalGW = gwLive ? [...gwByFuel.values()].reduce((a, b) => a + b, 0) : null;

  const rows = mix
    .map((m) => ({ fuel: m.fuel.toLowerCase(), perc: Number.isFinite(m.perc) ? m.perc : 0 }))
    .sort((a, b) => (b.perc > 0 ? 1 : 0) - (a.perc > 0 ? 1 : 0) || b.perc - a.perc);
  const maxShare = Math.max(...rows.map((r) => r.perc), 1);
  const renewable = rows.filter((r) => ['wind', 'solar', 'hydro', 'biomass'].includes(r.fuel)).reduce((a, r) => a + r.perc, 0);

  return (
    <section className="rounded-[20px] bg-card p-4 shadow-[var(--shadow-md)]" data-tour="generation-mix" data-testid="gen-mix">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[17px] font-extrabold leading-[1.25] tracking-[-0.01em]">Generation mix</h3>
        {slot && <span className="rounded-full bg-muted px-2.5 py-1 text-[12px] font-bold tabular-nums" data-testid="gen-slot">GB · {slot}</span>}
      </div>

      <div className="mt-2.5 flex items-end justify-between gap-3">
        <div>
          {totalGW !== null ? (
            <>
              <p className="text-[12px] font-semibold text-muted-foreground">Total</p>
              <p className="text-[34px] font-extrabold leading-[1.1] tracking-[-0.03em] text-primary tabular-nums" data-testid="gen-total-gw">
                {totalGW.toFixed(1)} <span className="text-[18px]">GW</span>
              </p>
            </>
          ) : (
            <>
              <p className="text-[15px] font-bold">GW unavailable right now</p>
              <p className="text-[12px] font-semibold text-muted-foreground">Showing shares only.</p>
            </>
          )}
        </div>
        <div className="text-right">
          <p className="text-[12px] font-semibold text-muted-foreground">Renewable</p>
          <p className="text-[20px] font-extrabold leading-tight tabular-nums">{Math.round(renewable)}%</p>
        </div>
      </div>

      <div className="mt-3 flex h-3 gap-0.5 overflow-hidden rounded-full" aria-hidden>
        {rows.filter((r) => r.perc > 0).map((r) => (
          <div key={r.fuel} className="h-full" style={{ width: `${r.perc}%`, background: `hsl(var(--gen-${r.fuel}))` }} />
        ))}
      </div>

      <ul className="mt-3 grid grid-cols-3 gap-2">
        {rows.map((r) => {
          const off = r.perc <= 0;
          const Icon = getFuelIcon(r.fuel);
          const gw = gwLive ? gwByFuel.get(r.fuel) : undefined;
          const anim = !off && !reduced;
          return (
            <li
              key={r.fuel}
              className={cn(
                'flex min-h-[112px] min-w-0 flex-col rounded-[14px] border border-border/80 p-2.5',
                off ? 'bg-card' : 'bg-[hsl(210_30%_98.5%)] dark:bg-[hsl(220_22%_17%)]',
              )}
              data-fuel={r.fuel}
              data-animated={anim && ['wind', 'solar', 'gas'].includes(r.fuel) ? 'true' : 'false'}
              aria-label={`${label(r.fuel)}: ${off ? 'not running' : `${r.perc.toFixed(1)}%`}${gw !== undefined ? `, ${gw.toFixed(2)} GW` : ''}`}
            >
              <span
                className={cn('relative inline-grid h-[30px] w-[30px] place-items-center rounded-[9px]', anim && `gen-anim gen-anim--${r.fuel}`)}
                style={{ background: off ? 'hsl(var(--muted))' : `hsl(var(--gen-${r.fuel}) / 0.16)` } as CSSProperties}
                aria-hidden
              >
                <Icon className="relative h-4 w-4" style={{ color: off ? 'hsl(205 10% 45%)' : `hsl(var(--gen-${r.fuel}))`, filter: off ? undefined : 'brightness(.82)' }} />
                {anim && r.fuel === 'wind' && (
                  <span className="gen-gusts">
                    <i />
                    <i />
                    <i />
                  </span>
                )}
              </span>
              <span className={cn('mt-1.5 truncate text-[12.5px] font-bold', off && 'text-[hsl(205_10%_45%)]')}>{label(r.fuel)}</span>
              <span className="truncate text-[10.5px] font-semibold text-muted-foreground">{off ? 'Not running' : ROLE[r.fuel] ?? ''}</span>
              <span className={cn('mt-auto pt-1 text-[18px] font-extrabold leading-tight tabular-nums', off && 'text-[hsl(205_10%_45%)]')}>
                {r.perc.toFixed(1)}%
              </span>
              {gw !== undefined && <span className="text-[11.5px] font-medium text-muted-foreground tabular-nums">{gw.toFixed(2)} GW</span>}
              <span className="mt-1 block h-[5px] w-full rounded-full bg-muted">
                {!off && (
                  <span className="block h-full rounded-full" style={{ width: `${Math.max(4, (r.perc / maxShare) * 100)}%`, background: `hsl(var(--gen-${r.fuel}))` }} />
                )}
              </span>
            </li>
          );
        })}
      </ul>

      <p className="mt-3 text-[12px] font-semibold leading-[1.4] text-muted-foreground">
        *Biomass counts as renewable but isn&apos;t zero carbon. Solar includes rooftop solar, estimated by NESO.
      </p>
      <p className="text-[12px] font-semibold leading-[1.4] text-muted-foreground" data-testid="gen-footer">
        {slot ? `Shares: NESO, ${slot}. ` : ''}
        {gwLive && liveTimestamp ? `GW: estimated, updated ${formatLondonTime(new Date(liveTimestamp))}.` : 'GW: unavailable.'}
      </p>
    </section>
  );
}
