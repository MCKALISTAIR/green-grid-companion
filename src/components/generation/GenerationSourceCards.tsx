import { ChevronDown, Home, Factory, Info } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { FuelInsightBadge } from '@/components/FuelInsightBadge';
import { FuelTrendIndicator } from '@/components/FuelTrendIndicator';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import type { MixWithTrend } from '@/hooks/useGridDemand';
import type { FuelStreak } from '@/hooks/useFuelStreaks';
import type { FuelMilestone } from '@/hooks/useFuelMilestones';
import { cn } from '@/lib/utils';
import { FuelChip, FuelShareBar } from './FuelVisuals';

function getCategoryLabel(key: string): string {
  switch (key) {
    case 'wind':
    case 'solar':
    case 'hydro':
      return 'Renewable';
    case 'biomass':
      return 'Kind of Renewable';
    case 'nuclear':
      return 'Low Carbon';
    case 'gas':
    case 'coal':
      return 'Fossil Fuel';
    case 'imports':
    case 'interconnectors':
      return 'Import';
    default:
      return '';
  }
}

interface Props {
  /** Already sorted by share, descending (same order as the mix bar). */
  sources: MixWithTrend[];
  embeddedSolarMW: number | null;
  streakByFuel: Record<string, FuelStreak | undefined>;
  milestoneByFuel: Record<string, FuelMilestone | undefined>;
}

/**
 * Generation Mix source cards. Neutral card surface (no tint, no stripe): the
 * source colour sits on the icon chip and the bottom share bar. The largest
 * source gets a hairline neutral outline and a slightly stronger chip.
 * Every card has the same structure so the grid has no height gaps; solar's
 * utility/rooftop split lives behind a tap.
 */
export function GenerationSourceCards({ sources, embeddedSolarMW, streakByFuel, milestoneByFuel }: Props) {
  const reduceMotion = useReducedMotion();
  const largest = sources.find((s) => s.perc > 0)?.id;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3" data-testid="generation-source-cards">
      {sources.map((source) => {
        const fuelKey = source.fuel?.toLowerCase() || source.name?.toLowerCase() || '';
        const streak = streakByFuel[fuelKey];
        const milestone = milestoneByFuel[fuelKey];
        const hasInsight = Boolean(streak?.isActive || milestone);
        const categoryLabel = getCategoryLabel(fuelKey);
        const isZero = source.perc === 0;
        const isLargest = source.id === largest;
        const showSolarSplit = fuelKey === 'solar' && embeddedSolarMW !== null && source.mw !== null && source.mw > 0;

        return (
          <Card
            key={source.id}
            data-source-card={fuelKey}
            className={cn(
              'relative h-full p-3 flex flex-col gap-3 min-w-0 transition-transform hover:-translate-y-0.5',
              isLargest && 'border-foreground/25',
              hasInsight && 'ring-1 ring-primary/30',
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <FuelChip fuel={fuelKey} perc={source.perc} strong={isLargest} animated={!reduceMotion} />
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-normal capitalize truncate">{source.name}</span>
                    <FuelTrendIndicator
                      currentPerc={source.perc}
                      previousPerc={source.previousPerc}
                      trend={source.trend}
                      showDiff={false}
                    />
                  </div>
                  {categoryLabel && (
                    <div className="flex items-center gap-1 min-h-[14px]">
                      <span className={cn('text-[10px] font-medium uppercase tracking-wide text-muted-foreground', isZero && 'opacity-70')}>
                        {categoryLabel}
                      </span>
                      {fuelKey === 'biomass' && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              className="h-3.5 w-3.5 rounded-full p-0 flex items-center justify-center hover:bg-muted transition-colors"
                              aria-label="More information about Biomass classification"
                            >
                              <Info className="w-2.5 h-2.5 cursor-help text-muted-foreground" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[240px] p-3 text-xs bg-card border-border z-50">
                            <p className="font-semibold mb-1">Kind of Renewable?</p>
                            <p>Biomass is officially classified as a renewable energy source by grid standards since the organic matter burned can be replenished. However, it still involves burning fuel (combustion), which releases direct carbon emissions at the point of generation.</p>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                {source.mw !== null && (
                  <span className={cn('block text-base font-bold tabular-nums leading-tight', isZero && 'text-muted-foreground')}>
                    {(source.mw / 1000).toFixed(2)}
                    <span className="text-xs font-medium text-muted-foreground ml-0.5">GW</span>
                  </span>
                )}
                <div className="flex items-center justify-end gap-1">
                  <span className="text-xs font-semibold text-muted-foreground tabular-nums">{source.perc}%</span>
                  {source.previousPerc !== null && source.trend && source.trend !== 'stable' && (
                    <span className={`text-[10px] tabular-nums ${source.trend === 'up' ? 'text-primary' : 'text-destructive'}`}>
                      ({source.trend === 'up' ? '+' : ''}{(source.perc - source.previousPerc).toFixed(1)})
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-auto space-y-2">
              <FuelShareBar fuel={fuelKey} perc={source.perc} />

              {showSolarSplit && (
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      data-testid="solar-split-toggle"
                    >
                      Utility vs rooftop
                      <ChevronDown className="w-3 h-3" aria-hidden="true" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[220px] p-3 text-xs space-y-1.5 bg-card border-border z-50">
                    <div className="flex items-center gap-2">
                      <Factory className="w-3 h-3 text-muted-foreground" aria-hidden="true" />
                      <span className="text-muted-foreground">Utility-scale</span>
                      <span className="ml-auto font-medium tabular-nums">{(((source.mw ?? 0) - (embeddedSolarMW ?? 0)) / 1000).toFixed(2)} GW</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Home className="w-3 h-3 text-muted-foreground" aria-hidden="true" />
                      <span className="text-muted-foreground">Rooftop</span>
                      <span className="ml-auto font-medium tabular-nums">{((embeddedSolarMW ?? 0) / 1000).toFixed(2)} GW</span>
                    </div>
                  </PopoverContent>
                </Popover>
              )}

              {hasInsight && (
                <FuelInsightBadge streak={streak?.isActive ? streak : undefined} milestone={milestone} compact />
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
