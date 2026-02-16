import { GenerationMix, getFuelColor } from '@/lib/carbonApi';
import { Home, Factory } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DEFINITIONS } from '@/lib/definitions';
import { ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface MixItem {
  fuel: string;
  perc: number;
  mw?: number;
}

interface GenerationMixBarProps {
  mix: MixItem[];
  showMW?: boolean;
  frequency?: number | null;
  embeddedSolarMW?: number | null;
}



export function GenerationMixBar({ mix, showMW = false, frequency, embeddedSolarMW }: GenerationMixBarProps) {
  // Filter out zero values and sort by percentage
  const sortedMix = [...mix]
    .filter(m => m.perc > 0)
    .sort((a, b) => b.perc - a.perc);

  const renewables = mix
    .filter(m => ['wind', 'solar', 'hydro', 'biomass'].includes(m.fuel.toLowerCase()))
    .reduce((acc, m) => acc + m.perc, 0);

  // Calculate embedded solar share within the solar segment
  const solarItem = sortedMix.find(m => m.fuel.toLowerCase() === 'solar');
  const totalSolarMW = solarItem?.mw ?? null;
  const embeddedSolarPerc = (totalSolarMW && embeddedSolarMW && totalSolarMW > 0)
    ? Math.min((embeddedSolarMW / totalSolarMW) * 100, 100)
    : null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className="w-full text-left space-y-4 cursor-pointer hover:opacity-80 transition-opacity" aria-label="View generation mix details">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
              Generation Mix
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </h3>
            <span className="text-xs text-primary font-medium">
              {showMW ? `Total ${(mix.reduce((a, b) => a + (b.mw || 0), 0) / 1000).toFixed(1)} GW` : `${renewables.toFixed(0)}% Renewable`}
            </span>
          </div>

          {/* Bar visualization */}
          <div className="h-4 md:h-6 rounded-full overflow-hidden flex shadow-inner bg-muted/30" role="progressbar" aria-label="Generation Mix">
            {sortedMix.map((item) => {
              const isSolar = item.fuel.toLowerCase() === 'solar';
              // For solar, show a sub-segment with a striped pattern for embedded/rooftop
              if (isSolar && embeddedSolarPerc !== null && embeddedSolarPerc > 0) {
                const utilitySolarWidth = 100 - embeddedSolarPerc;
                return (
                  <div
                    key={item.fuel}
                    className="flex h-full transition-all duration-500"
                    style={{ width: `${item.perc}%` }}
                  >
                    {/* Utility-scale solar */}
                    <div
                      className={`${getFuelColor(item.fuel)} h-full`}
                      style={{ width: `${utilitySolarWidth}%` }}
                    />
                    {/* Embedded/rooftop solar - slightly lighter with pattern */}
                    <div
                      className="h-full bg-amber-300 dark:bg-amber-400/80"
                      style={{ width: `${embeddedSolarPerc}%` }}
                    />
                  </div>
                );
              }
              return (
                <div
                  key={item.fuel}
                  className={`${getFuelColor(item.fuel)} transition-all duration-500`}
                  style={{ width: `${item.perc}%` }}
                />
              );
            })}
          </div>

          {/* Legend - Responsive Grid */}
          <div className="block md:hidden">
            {/* Mobile: Compact Flex Wrap (Top 6) */}
            <div className="flex flex-wrap gap-2">
              {sortedMix.slice(0, 6).map((item) => (
                <div
                  key={item.fuel}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground"
                >
                  <div className={`w-2.5 h-2.5 rounded-full ${getFuelColor(item.fuel)}`} />
                  <span className="capitalize">{item.fuel}</span>
                  <span className="font-medium text-foreground">
                    {showMW && item.mw
                      ? `${(item.mw / 1000).toFixed(1)}GW`
                      : `${item.perc.toFixed(0)}%`}
                  </span>
                </div>
              ))}
              {sortedMix.length > 6 && (
                <span className="text-xs text-muted-foreground self-center">+{sortedMix.length - 6} more</span>
              )}
            </div>
          </div>

          <div className="hidden md:grid grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-y-2 gap-x-6 pt-2">
            {/* Desktop: Full Grid showing all items */}
            {sortedMix.map((item) => (
              <div
                key={item.fuel}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${getFuelColor(item.fuel)}`} />
                  <span className="capitalize text-muted-foreground pr-2">{item.fuel}</span>
                </div>
                <span className="font-semibold tabular-nums">
                  {showMW && item.mw
                    ? `${(item.mw / 1000).toFixed(2)} GW`
                    : `${item.perc}%`}
                </span>
              </div>
            ))}
          </div>
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Generation Mix Breakdown</span>
            {typeof frequency === 'number' && !isNaN(frequency) && (
              <div className="flex items-center gap-2 text-sm font-normal bg-muted/50 px-2 py-1 rounded-md">
                <span className="text-muted-foreground">Grid Freq:</span>
                <div className="flex items-center gap-1.5">
                  <span className={`font-mono font-medium ${frequency < 49.8 || frequency > 50.2 ? 'text-destructive' : 'text-emerald-500'
                    }`}>
                    {frequency.toFixed(3)} Hz
                  </span>
                  <span className="relative flex h-2 w-2">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${frequency < 49.8 || frequency > 50.2 ? 'bg-destructive' : 'bg-emerald-500'
                      }`}></span>
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${frequency < 49.8 || frequency > 50.2 ? 'bg-destructive' : 'bg-emerald-500'
                      }`}></span>
                  </span>
                </div>
              </div>
            )}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 pr-4 -mr-4">
          <div className="space-y-4 py-4">
            {sortedMix.map((item) => {
              const fuelKey = item.fuel.charAt(0).toUpperCase() + item.fuel.slice(1);
              const definition = DEFINITIONS[fuelKey as keyof typeof DEFINITIONS] || DEFINITIONS['Other'];

              return (
                <div key={item.fuel} className="space-y-2 p-3 rounded-lg bg-accent/20 border border-border/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full ${getFuelColor(item.fuel)}`} />
                      <span className="font-medium capitalize text-lg">{item.fuel}</span>
                    </div>
                    <div className="text-right">
                      <span className="block text-xl font-bold">
                        {showMW && item.mw
                          ? `${(item.mw / 1000).toFixed(2)} GW`
                          : `${item.perc.toFixed(1)}%`}
                      </span>
                      {showMW && (
                        <span className="text-sm text-muted-foreground">{item.perc.toFixed(1)}%</span>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground pl-6 leading-relaxed">
                    {definition}
                  </p>

                  {item.fuel === 'imports' && (
                    <div className="pl-6 pt-2 flex flex-wrap gap-2">
                      {['France', 'Netherlands', 'Belgium', 'Norway', 'Denmark', 'Ireland'].map(country => (
                        <span key={country} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-muted text-muted-foreground ring-1 ring-inset ring-border/50">
                          {country}
                        </span>
                      ))}
                    </div>
                  )}

                  {item.fuel.toLowerCase() === 'solar' && embeddedSolarMW !== null && totalSolarMW !== null && totalSolarMW > 0 && (
                    <div className="pl-6 pt-2 space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <div className={`w-3 h-3 rounded-full ${getFuelColor('solar')}`} />
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Factory className="w-3 h-3" /> Utility-scale
                        </span>
                        <span className="ml-auto font-medium">
                          {((totalSolarMW - embeddedSolarMW) / 1000).toFixed(2)} GW
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <div className="w-3 h-3 rounded-full bg-amber-300 dark:bg-amber-400/80" />
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Home className="w-3 h-3" /> Rooftop / Embedded
                        </span>
                        <span className="ml-auto font-medium">
                          {(embeddedSolarMW / 1000).toFixed(2)} GW
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground/70 pt-1">
                        Embedded solar includes private rooftop panels, community solar, and other distributed generation feeding into the grid.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* GW Definition Note */}
        {showMW && (
          <div className="pt-2 pb-2 text-xs text-muted-foreground/80 text-center px-4">
            <p>{DEFINITIONS['GW']}</p>
          </div>
        )}

        {/* Close button for easier mobile interaction */}
        <div className="pt-2 pb-2 border-t">
          <DialogClose asChild>
            <Button variant="outline" className="w-full" size="lg">
              Close
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog >
  );
}