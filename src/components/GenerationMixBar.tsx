import { getFuelColor } from '@/lib/carbonApi';
import { Home, Factory } from 'lucide-react';
import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
  ResponsiveDialogClose,
} from '@/components/ui/responsive-dialog';
import { DEFINITIONS } from '@/lib/definitions';
import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AnimatedNumber } from '@/components/AnimatedNumber';
import {
  MixItem,
  getSortedMix,
  getRenewablesPercentage,
  getEmbeddedSolarPercentage,
  getTotalSolarMW,
} from '@/lib/generationUtils';
import { getFuelHex, getFuelIcon } from '@/lib/fuelVisuals';

interface GenerationMixBarProps {
  mix: MixItem[];
  showMW?: boolean;
  frequency?: number | null;
  embeddedSolarMW?: number | null;
  /**
   * Where this mix applies — Intensity is regional (NESO), Demand is national
   * (Elexon). Shown so the two tabs don’t look like contradictory numbers.
   */
  scopeLabel?: string;
  /** Hide the in-bar heading when a parent section already titles the block. */
  hideHeading?: boolean;
}

export function GenerationMixBar({
  mix,
  showMW = false,
  frequency,
  embeddedSolarMW,
  scopeLabel,
  hideHeading = false,
}: GenerationMixBarProps) {
  const sortedMix = getSortedMix(mix);
  const renewables = getRenewablesPercentage(mix);
  const embeddedSolarPerc = getEmbeddedSolarPercentage(mix, embeddedSolarMW);
  const totalSolarMW = getTotalSolarMW(mix);
  const shouldReduceMotion = useReducedMotion();

  // The leading fuel source breathes very gently (only if > 10% share)
  const dominantFuel = sortedMix[0]?.fuel ?? null;
  const breakdownTitle = scopeLabel
    ? `Generation Mix Breakdown · ${scopeLabel}`
    : 'Generation Mix Breakdown';
  const triggerLabel = scopeLabel
    ? `View ${scopeLabel} generation mix details`
    : 'View generation mix details';

  return (
    <ResponsiveDialog detents="tall">
      <ResponsiveDialogTrigger asChild>
        <button
          type="button"
          className="w-full text-left space-y-4 cursor-pointer group transition-transform active:scale-[0.985] generation-mix-container"
          aria-label={triggerLabel}
        >
          <div className="flex items-center justify-between gap-3">
            {!hideHeading ? (
              <div className="min-w-0">
                <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                  Generation Mix
                  <motion.span
                    className="inline-flex"
                    initial={false}
                    whileHover={{ x: 3 }}
                    transition={{ type: 'spring' as const, stiffness: 400, damping: 25 }}
                  >
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </motion.span>
                </h3>
                {scopeLabel && (
                  <p
                    className="text-[11px] text-muted-foreground mt-0.5 truncate"
                    data-testid="mix-scope-label"
                  >
                    {scopeLabel}
                  </p>
                )}
              </div>
            ) : (
              <span className="sr-only">{triggerLabel}</span>
            )}
            <span
              className={
                hideHeading
                  ? 'text-xs text-primary font-medium ml-auto shrink-0'
                  : 'text-xs text-primary font-medium shrink-0'
              }
            >
              {showMW
                ? `Total ${(mix.reduce((a, b) => a + (b.mw || 0), 0) / 1000).toFixed(1)} GW`
                : `${renewables.toFixed(0)}% renewable (incl. biomass)`}
            </span>
          </div>

          {/* Bar visualization */}
          <motion.div
            className="h-4 md:h-6 rounded-full overflow-hidden flex shadow-inner bg-muted/30"
            role="progressbar"
            aria-label="Generation Mix"
            whileHover={{ scaleY: 1.18 }}
            style={{ originY: 1 }}
            transition={{ type: 'spring' as const, stiffness: 300, damping: 28 }}
          >
            {sortedMix.map((item, idx) => {
              const isSolar = item.fuel.toLowerCase() === 'solar';
              const isDominant =
                !shouldReduceMotion && item.fuel === dominantFuel && item.perc > 10;

              // For solar, show a sub-segment with a striped pattern for embedded/rooftop
              if (isSolar && embeddedSolarPerc !== null && embeddedSolarPerc > 0) {
                const utilitySolarWidth = 100 - embeddedSolarPerc;
                return (
                  <motion.div
                    key={item.fuel}
                    layout
                    initial={shouldReduceMotion ? { width: `${item.perc}%` } : { width: '0%' }}
                    animate={{ width: `${item.perc}%` }}
                    transition={
                      shouldReduceMotion
                        ? { duration: 0 }
                        : {
                            width: {
                              type: 'spring',
                              stiffness: 90,
                              damping: 16,
                              delay: idx * 0.03,
                            },
                            layout: { type: 'spring', stiffness: 120, damping: 20 },
                          }
                    }
                    className="flex h-full"
                  >
                    {/* Utility-scale solar */}
                    <motion.div
                      layout
                      className={`${getFuelColor(item.fuel)} h-full`}
                      style={{ width: `${utilitySolarWidth}%` }}
                    />
                    {/* Embedded/rooftop solar - slightly lighter with pattern */}
                    <motion.div
                      layout
                      className="h-full bg-amber-300 dark:bg-amber-400/80"
                      style={{ width: `${embeddedSolarPerc}%` }}
                    />
                  </motion.div>
                );
              }

              if (isDominant) {
                return (
                  <motion.div
                    key={item.fuel}
                    layout
                    initial={shouldReduceMotion ? { width: `${item.perc}%` } : { width: '0%' }}
                    animate={{
                      width: `${item.perc}%`,
                      opacity: [0.85, 1, 0.85],
                    }}
                    transition={
                      shouldReduceMotion
                        ? { duration: 0 }
                        : {
                            width: {
                              type: 'spring',
                              stiffness: 90,
                              damping: 16,
                              delay: idx * 0.03,
                            },
                            layout: { type: 'spring', stiffness: 120, damping: 20 },
                            opacity: { repeat: Infinity, duration: 3, ease: 'easeInOut' },
                          }
                    }
                    className={`${getFuelColor(item.fuel)} h-full`}
                  />
                );
              }

              return (
                <motion.div
                  key={item.fuel}
                  layout
                  initial={shouldReduceMotion ? { width: `${item.perc}%` } : { width: '0%' }}
                  animate={{ width: `${item.perc}%` }}
                  transition={
                    shouldReduceMotion
                      ? { duration: 0 }
                      : {
                          width: { type: 'spring', stiffness: 90, damping: 16, delay: idx * 0.03 },
                          layout: { type: 'spring', stiffness: 120, damping: 20 },
                        }
                  }
                  className={`${getFuelColor(item.fuel)} h-full`}
                />
              );
            })}
          </motion.div>

          {/* Legend - Container Responsive */}
          <div className="generation-mix-legend-compact">
            {/* Mobile/Compact layout: Flex Wrap (Top 6) */}
            <div className="flex flex-wrap gap-2">
              {sortedMix.slice(0, 6).map((item, idx) => {
                const Icon = getFuelIcon(item.fuel);
                return (
                  <motion.div
                    key={item.fuel}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground animate-in fade-in-0 duration-300"
                    initial={shouldReduceMotion ? {} : { opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={
                      shouldReduceMotion
                        ? {}
                        : { duration: 0.25, delay: idx * 0.03, ease: 'easeOut' as const }
                    }
                  >
                    <Icon className={`w-3 h-3`} style={{ color: 'currentColor' }} />
                    <span className="capitalize">{item.fuel}</span>
                    <span className="font-medium text-foreground">
                      {showMW && item.mw
                        ? `${(item.mw / 1000).toFixed(1)}GW`
                        : `${item.perc.toFixed(0)}%`}
                    </span>
                  </motion.div>
                );
              })}
              {sortedMix.length > 6 && (
                <span className="text-xs text-muted-foreground self-center">
                  +{sortedMix.length - 6} more
                </span>
              )}
            </div>
          </div>

          <div className="generation-mix-legend-grid pt-2">
            {/* Desktop/Wide layout: Full Grid showing all items */}
            {sortedMix.map((item, idx) => {
              const Icon = getFuelIcon(item.fuel);
              return (
                <motion.div
                  key={item.fuel}
                  className="flex items-center justify-between text-sm w-full"
                  initial={shouldReduceMotion ? {} : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={
                    shouldReduceMotion
                      ? {}
                      : { duration: 0.3, delay: idx * 0.02, ease: 'easeOut' as const }
                  }
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 ${getFuelColor(item.fuel)}`}
                    >
                      <Icon className="w-3 h-3 text-white" aria-hidden="true" />
                    </div>
                    <span className="capitalize text-muted-foreground pr-2">{item.fuel}</span>
                  </div>
                  <span className="font-semibold tabular-nums">
                    {showMW && item.mw ? `${(item.mw / 1000).toFixed(2)} GW` : `${item.perc}%`}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </button>
      </ResponsiveDialogTrigger>

      <ResponsiveDialogContent className="max-w-md max-h-[85vh] flex flex-col overflow-hidden">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="pr-14 leading-snug">
            {breakdownTitle}
          </ResponsiveDialogTitle>
          {typeof frequency === 'number' && !isNaN(frequency) && (
            <div
              className="mr-14 flex w-fit items-center gap-2 text-sm font-normal bg-muted/50 px-2.5 py-1 rounded-md"
              data-testid="grid-freq-pill"
            >
              <span className="text-muted-foreground">Grid Freq:</span>
              <div className="flex items-center gap-1.5">
                <span
                  className={`font-mono font-medium ${
                    frequency < 49.8 || frequency > 50.2 ? 'text-destructive' : 'text-emerald-500'
                  }`}
                >
                  {frequency.toFixed(3)} Hz
                </span>
                <span className="relative flex h-2 w-2">
                  <span
                    className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      frequency < 49.8 || frequency > 50.2 ? 'bg-destructive' : 'bg-emerald-500'
                    }`}
                  />
                  <span
                    className={`relative inline-flex rounded-full h-2 w-2 ${
                      frequency < 49.8 || frequency > 50.2 ? 'bg-destructive' : 'bg-emerald-500'
                    }`}
                  />
                </span>
              </div>
            </div>
          )}
        </ResponsiveDialogHeader>
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain -mx-6 px-6">
          <div className="space-y-4 py-4">
            {sortedMix.map((item) => {
              const fuelKey = item.fuel.charAt(0).toUpperCase() + item.fuel.slice(1);
              const definition =
                DEFINITIONS[fuelKey as keyof typeof DEFINITIONS] || DEFINITIONS['Other'];

              const Icon = getFuelIcon(item.fuel);
              const hex = getFuelHex(item.fuel);
              const [r, g, b] = [
                parseInt(hex.slice(1, 3), 16),
                parseInt(hex.slice(3, 5), 16),
                parseInt(hex.slice(5, 7), 16),
              ];

              return (
                <div
                  key={item.fuel}
                  className="rounded-xl border border-border/60 overflow-hidden"
                  style={{
                    background: `linear-gradient(135deg, rgba(${r},${g},${b},0.08) 0%, transparent 55%)`,
                  }}
                >
                  {/* Header row */}
                  <div className="flex items-center justify-between px-3 pt-3 pb-1">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${getFuelColor(item.fuel)}`}
                      >
                        <Icon className="w-5 h-5 text-white" aria-hidden="true" />
                      </div>
                      <span className="font-semibold capitalize text-base">{item.fuel}</span>
                    </div>
                    <div className="text-right">
                      <span className="block text-lg font-bold">
                        {showMW && item.mw != null ? (
                          <AnimatedNumber value={item.mw / 1000} decimals={2} suffix=" GW" />
                        ) : (
                          <AnimatedNumber value={item.perc} decimals={1} suffix="%" />
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {showMW ? (
                          <AnimatedNumber value={item.perc} decimals={1} suffix="%" />
                        ) : item.mw != null ? (
                          <AnimatedNumber value={item.mw / 1000} decimals={2} suffix=" GW" />
                        ) : null}
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-muted-foreground px-3 pb-2 pl-[3.25rem] leading-relaxed">
                    {definition}
                  </p>

                  {/* Imports: interconnector country tags */}
                  {item.fuel === 'imports' && (
                    <div className="px-3 pb-2 pl-[3.25rem] flex flex-wrap gap-1.5">
                      {['France', 'Netherlands', 'Belgium', 'Norway', 'Denmark', 'Ireland'].map(
                        (country) => (
                          <span
                            key={country}
                            className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-muted text-muted-foreground ring-1 ring-inset ring-border/50"
                          >
                            {country}
                          </span>
                        ),
                      )}
                    </div>
                  )}

                  {/* Solar: utility vs rooftop sub-breakdown */}
                  {item.fuel.toLowerCase() === 'solar' &&
                    embeddedSolarMW !== null &&
                    totalSolarMW !== null &&
                    totalSolarMW > 0 && (
                      <div className="px-3 pb-2 pl-[3.25rem] space-y-1 border-t border-border/30 pt-2 mt-1">
                        <div className="flex items-center gap-2 text-xs">
                          <Factory className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                          <span className="text-muted-foreground">Utility-scale</span>
                          <span className="ml-auto font-medium tabular-nums">
                            {((totalSolarMW - embeddedSolarMW) / 1000).toFixed(2)} GW
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <Home className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                          <span className="text-muted-foreground">Rooftop / Embedded</span>
                          <span className="ml-auto font-medium tabular-nums">
                            {(embeddedSolarMW / 1000).toFixed(2)} GW
                          </span>
                        </div>
                      </div>
                    )}

                  {/* Mini fill bar — encodes % share of total mix */}
                  <div
                    className="h-1 w-full mt-1"
                    style={{ backgroundColor: `rgba(${r},${g},${b},0.12)` }}
                  >
                    <div
                      className="h-full transition-all duration-700 ease-out"
                      style={{
                        width: `${Math.min(item.perc, 100)}%`,
                        backgroundColor: hex,
                        opacity: item.perc === 0 ? 0.15 : 0.6,
                      }}
                      role="presentation"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* GW Definition Note */}
        {showMW && (
          <div className="pt-2 pb-2 text-xs text-muted-foreground text-center px-4">
            <p>{DEFINITIONS['GW']}</p>
          </div>
        )}

        {/* Close button for easier mobile interaction */}
        <div className="pt-2 pb-2 border-t">
          <ResponsiveDialogClose asChild>
            <Button variant="outline" className="w-full" size="lg">
              Close
            </Button>
          </ResponsiveDialogClose>
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
