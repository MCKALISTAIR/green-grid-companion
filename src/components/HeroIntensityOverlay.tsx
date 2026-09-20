import { RefreshCw, Info, Leaf, AlertTriangle, MapPin, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { LocationManager } from '@/components/LocationManager';
import { AnimatedIntensity } from '@/components/AnimatedIntensity';
import { TypewriterText } from '@/components/TypewriterText';
import { RenewableSparkle } from '@/components/RenewableSparkle';
import { StaleDataBadge } from '@/components/StaleDataBadge';
import { DEFINITIONS } from '@/lib/definitions';
import { cn } from '@/lib/utils';

interface HeroIntensityOverlayProps {
  postcode: string;
  onPostcodeChange: (value: string) => void;
  region: string | null;
  intensity: number;
  previousIntensity: number | null;
  index: string | null;
  renewablesPct: number;
  sparkleTrigger: boolean;
  onSparkleComplete: () => void;
  isLoading: boolean;
  isError: boolean;
  isBackgroundFetching: boolean;
  lastUpdated: string | null;
  relativeTime: string;
  freshnessColor: string;
  nextUpdateLabel: string;
  className?: string;
}

/**
 * Carrot Weather–inspired scene HUD: one giant number, one condition line,
 * no glass card competing with the illustration.
 */
export function HeroIntensityOverlay({
  postcode,
  onPostcodeChange,
  region,
  intensity,
  previousIntensity,
  index,
  renewablesPct,
  sparkleTrigger,
  onSparkleComplete,
  isLoading,
  isError,
  isBackgroundFetching,
  lastUpdated,
  relativeTime,
  freshnessColor,
  nextUpdateLabel,
  className,
}: HeroIntensityOverlayProps) {
  const renewablesTone =
    renewablesPct >= 70
      ? 'text-emerald-100'
      : renewablesPct >= 50
        ? 'text-lime-100'
        : renewablesPct >= 30
          ? 'text-amber-100'
          : 'text-orange-100';

  return (
    <div
      className={cn(
        'absolute inset-x-0 top-0 z-10 flex flex-col items-center pointer-events-none',
        'pt-[calc(max(env(safe-area-inset-top),12px)+3.25rem)]',
        className,
      )}
      data-tour="intensity-gauge"
    >
      {/* Soft readability wash — not a card */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[55%] bg-gradient-to-b from-black/35 via-black/15 to-transparent pointer-events-none"
      />

      <div className="relative flex flex-col items-center text-center w-full max-w-[22rem] px-4 pointer-events-auto">
        {/* Location — mobile only; desktop uses the top-left chrome */}
        <div className="lg:hidden mb-3">
          <LocationManager
            value={postcode}
            onChange={onPostcodeChange}
            trigger={
              <button
                type="button"
                className="inline-flex items-center gap-1.5 text-white/90 text-[13px] font-semibold tracking-wide hover:text-white transition-colors"
              >
                <MapPin className="w-3.5 h-3.5 opacity-80" />
                <span>{isLoading ? 'Loading…' : region || 'Select location'}</span>
                {isBackgroundFetching ? (
                  <RefreshCw className="w-3 h-3 animate-spin opacity-70" />
                ) : (
                  <ChevronDown className="w-3 h-3 opacity-60" />
                )}
              </button>
            }
          />
        </div>

        {/* Primary number */}
        <div className="flex items-end justify-center gap-2 min-h-[5.5rem]">
          {isLoading ? (
            <RefreshCw className="w-12 h-12 text-white animate-spin drop-shadow-lg" aria-label="Loading data" />
          ) : isError ? (
            <div className="flex flex-col items-center py-1">
              <AlertTriangle className="w-10 h-10 text-white animate-pulse mb-1 drop-shadow-md" />
              <span className="text-sm font-bold text-white/95 uppercase tracking-[0.18em]">Offline</span>
            </div>
          ) : (
            <>
              <AnimatedIntensity
                value={intensity}
                previousValue={previousIntensity}
                isUpdating={isBackgroundFetching}
                size="hero"
              />
              <div className="flex flex-col items-start pb-2 gap-0.5">
                <span className="text-white/85 text-base font-semibold leading-none tracking-tight drop-shadow-md">
                  gCO₂
                </span>
                <span className="text-white/70 text-xs font-medium leading-none drop-shadow-sm">/kWh</span>
              </div>
            </>
          )}
        </div>

        {/* Condition — Carrot-style weather label */}
        {!isLoading && !isError && index && (
          <motion.div
            key={index}
            className="mt-1 flex items-center gap-1.5"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="font-display text-3xl sm:text-4xl font-semibold capitalize text-white tracking-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)]">
              <TypewriterText text={index} />
            </p>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-full p-0 text-white/70 hover:text-white hover:bg-white/10"
                  aria-label="What is carbon intensity?"
                >
                  <Info className="w-3.5 h-3.5" aria-hidden="true" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[260px] p-3 text-xs bg-card border-border backdrop-blur-xl space-y-2">
                <p className="font-semibold">Carbon intensity</p>
                <p>{DEFINITIONS['Carbon Intensity']}</p>
                <p className="text-muted-foreground">{DEFINITIONS['gCO2/kWh']}</p>
                <p className="text-muted-foreground">
                  National Grid ESO publishes new figures every <span className="font-semibold text-foreground">30 minutes</span>.
                </p>
              </PopoverContent>
            </Popover>
          </motion.div>
        )}

        {/* Secondary: renewables + freshness — quiet, not badge soup */}
        {!isLoading && !isError && (
          <div className="mt-3 flex flex-col items-center gap-2">
            <div className="relative">
              <motion.p
                className={cn(
                  'inline-flex items-center gap-1.5 text-sm font-semibold drop-shadow-md',
                  renewablesTone,
                )}
                key={Math.round(renewablesPct / 10)}
                animate={{ scale: [1, 1.04, 1] }}
                transition={{ duration: 0.35, ease: 'easeOut' as const }}
              >
                <Leaf className="w-3.5 h-3.5" aria-hidden="true" />
                {renewablesPct.toFixed(0)}% renewable
              </motion.p>
              <RenewableSparkle trigger={sparkleTrigger} onComplete={onSparkleComplete} />
            </div>

            {lastUpdated && (
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-1.5 text-[11px] text-white/75 font-medium drop-shadow-sm">
                  <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-60 ${freshnessColor}`} />
                    <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${freshnessColor}`} />
                  </span>
                  <span>{relativeTime}</span>
                  {nextUpdateLabel && (
                    <>
                      <span className="opacity-50">·</span>
                      <span>{nextUpdateLabel}</span>
                    </>
                  )}
                </div>
                <StaleDataBadge lastUpdated={lastUpdated} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
