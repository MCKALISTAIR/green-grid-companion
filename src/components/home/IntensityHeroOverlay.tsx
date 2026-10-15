import { AlertTriangle, ChevronDown, Info, Leaf, MapPin, RefreshCw, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useOffline } from '@/hooks/useOffline';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { LocationManager } from '@/components/LocationManager';
import { AnimatedIntensity } from '@/components/AnimatedIntensity';
import { TypewriterText } from '@/components/TypewriterText';
import { RenewableSparkle } from '@/components/RenewableSparkle';
import { ComponentErrorBoundary } from '@/components/ComponentErrorBoundary';
import { IntensityScene } from '@/components/IntensityScene';
import { DEFINITIONS } from '@/lib/definitions';
import { cn } from '@/lib/utils';
import { getConditionLabel, getConditionParts } from '@/lib/conditionLabels';
import { formatLondonTime } from '@/lib/londonTime';
import { useEnergyFacts } from '@/hooks/useEnergyFacts';
import { useTimeOfDay } from '@/hooks/useTimeOfDay';
import { getCleanlinessBand } from '@/hooks/useCleanlinessBand';
import type { GenerationMix } from '@/lib/carbonApi';
import { CompactDataAttribution } from '@/components/attribution/DataAttribution';
import { getHeroTextTone, isReadingFresh, shouldCelebrateZeroCarbon } from '@/lib/sceneUtils';
import { useWeatherData } from '@/hooks/useWeatherData';
import { ZeroCarbonBadge } from '@/components/scene/NetZeroCelebration';

interface IntensityHeroOverlayProps {
  postcode: string;
  setPostcode: (value: string) => void;
  region: string | undefined;
  intensity: number;
  previousIntensity: number | null | undefined;
  index: string;
  generationMix: GenerationMix[] | undefined;
  isLoading: boolean;
  isBackgroundFetching: boolean;
  isError: boolean;
  lastUpdated: string | null | undefined;
  nextUpdate: string | Date | null | undefined;
  getNextUpdate: (lastUpdated?: string) => Date | null;
  relativeTime: string;
  freshnessColor: string;
  renewablesPct: number;
  sparkleTrigger: boolean;
  onSparkleComplete: () => void;
  hideGauge: boolean;
}

/**
 * Carrot Weather–inspired scene HUD: one giant number, one condition line,
 * no glass card competing with the illustration.
 */
export function IntensityHeroOverlay({
  postcode,
  setPostcode,
  region,
  intensity,
  previousIntensity,
  index,
  generationMix,
  isLoading,
  isBackgroundFetching,
  isError,
  lastUpdated,
  nextUpdate,
  getNextUpdate,
  relativeTime,
  freshnessColor,
  renewablesPct,
  sparkleTrigger,
  onSparkleComplete,
  hideGauge,
}: IntensityHeroOverlayProps) {
  const { tone } = useEnergyFacts();
  const { timeOfDay } = useTimeOfDay();
  const { weather } = useWeatherData();
  // AA: ink on light skies, white on dark skies (art pass v1 §3).
  const heroTone = getHeroTextTone(timeOfDay, weather);
  const isInk = heroTone === 'ink';
  // Only say 'Offline' when the device really is; otherwise the data source failed.
  const { isOffline } = useOffline();
  const band = getCleanlinessBand(intensity);
  const isDirty = band === 'dirty' || band === 'very-dirty';
  // Dark scrim only behind white text; ink sits on a light veil instead.
  const needsHardScrim = !isInk && isDirty;
  // Zero-carbon badge + scene celebration only for a live reading that isn't stale.
  const hasFreshReading = !isLoading && !isError && isReadingFresh(lastUpdated);
  const showZeroCarbonBadge = shouldCelebrateZeroCarbon(intensity, hasFreshReading);
  const conditionLabel = getConditionLabel(index, tone, region ?? postcode);

  const nextUpdateLabel = (() => {
    if (!lastUpdated) return '';
    // Soften first-load / background refresh so FTUE never opens on "Update due".
    if (isBackgroundFetching) return 'Updating…';
    if (nextUpdate) {
      const next = new Date(nextUpdate);
      if (new Date() > next) return 'Refreshing soon';
      return `Next ${formatLondonTime(next)}`;
    }
    const next = getNextUpdate(lastUpdated);
    if (!next) return '';
    if (new Date() > next) return 'Refreshing soon';
    return `Next ${formatLondonTime(next)}`;
  })();

  // Band name big, Cheeky line underneath, so neither wraps on small phones.
  const conditionParts = getConditionParts(index, tone, region ?? postcode);

  const renewablesTone = isInk
    ? 'text-hero-ink'
    : needsHardScrim
      ? 'text-white'
      : renewablesPct >= 70
        ? 'text-emerald-100'
        : renewablesPct >= 50
          ? 'text-lime-100'
          : renewablesPct >= 30
            ? 'text-amber-100'
            : 'text-orange-100';

  return (
    <div
      className={cn('home-scene relative w-full', hideGauge && 'home-scene--compact')}
      data-compact-scene={hideGauge ? 'true' : undefined}
    >
      <ComponentErrorBoundary name="Scene">
        <div
          className="absolute top-6 left-6 z-30 hidden lg:block max-w-[calc(50%-13rem)]"
          data-testid="hero-location-desktop"
        >
          <LocationManager
            value={postcode}
            onChange={setPostcode}
            trigger={
              <button
                className="hero-chip flex min-h-11 max-w-full items-center gap-2 text-sm font-semibold tracking-wide transition-all cursor-pointer px-4 py-2 rounded-full shadow-sm group"
                title={region || undefined}
              >
                <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">
                  {isLoading ? 'Loading...' : region || 'Select location'}
                </span>
                {isBackgroundFetching ? (
                  <RefreshCw className="w-3 h-3 animate-spin opacity-70" />
                ) : (
                  <ChevronDown className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity" />
                )}
              </button>
            }
          />
        </div>

        <div className="absolute top-[calc(max(env(safe-area-inset-top),24px)+0.5rem)] right-4 z-30 lg:top-6 lg:right-6">
          {/* A single link (was <a><button>, a nested-interactive a11y failure). */}
          <Link
            to="/achievements"
            className="hero-chip flex min-h-11 min-w-11 items-center justify-center transition-all cursor-pointer active:scale-95 hover:scale-105 rounded-full shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
            aria-label="Trophy Room"
          >
            <Trophy className="hero-chip-icon w-4 h-4" aria-hidden="true" />
          </Link>
        </div>
      </ComponentErrorBoundary>

      {!hideGauge && (
        <div
          className={cn(
            /* In-flow (not absolute): scene height grows with the HUD so large-text
               and short phones keep badge/meta above the scalloped sheet. */
            'home-scene-gauge relative z-10 flex flex-col items-center pointer-events-none',
            'pt-[calc(max(env(safe-area-inset-top),12px)+3.25rem)]',
          )}
          data-hero-tone={heroTone}
          data-testid="hero-gauge"
        >
          <div
            aria-hidden
            className={cn(
              /* Fixed px height (not %) so loading→reading gauge growth doesn't
                 reposition this scrim and register as CLS. */
              /* h-80 covers the full stack down to the "updated" line (was h-56,
                 which faded out above the renewable/status rows). */
              'absolute inset-x-0 top-0 h-80 pointer-events-none transition-opacity duration-700',
              isInk
                ? 'bg-gradient-to-b from-white/30 via-white/15 to-transparent'
                : needsHardScrim
                  ? 'bg-gradient-to-b from-black/55 via-black/28 to-transparent'
                  : 'scene-hud-scrim',
            )}
          />
          {/* Always mounted; opacity only — conditional mount was a CLS source when
              dirty/night bands appeared after the first reading. */}
          <div
            aria-hidden
            className={cn(
              'absolute inset-x-0 top-16 h-64 pointer-events-none scene-hud-radial transition-opacity duration-700',
              isInk ? 'opacity-0' : needsHardScrim ? 'opacity-100' : 'opacity-70',
            )}
          />

          <div className="relative flex flex-col items-center text-center w-full max-w-[22rem] min-[540px]:max-w-[40rem] px-4 pointer-events-none">
            <div
              className="lg:hidden mb-2 sm:mb-3 max-w-[calc(100vw-8.5rem)]"
              data-testid="hero-location"
            >
              <LocationManager
                value={postcode}
                onChange={setPostcode}
                trigger={
                  <Button
                    variant="ghost"
                    type="button"
                    className="hero-chip pointer-events-auto min-h-11 h-auto max-w-full gap-1.5 px-3.5 rounded-full text-[13px] font-semibold tracking-wide transition-colors"
                    title={region || undefined}
                  >
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                    <span className="truncate">
                      {isLoading ? 'Loading…' : region || 'Select location'}
                    </span>
                    {isBackgroundFetching ? (
                      <RefreshCw className="w-3 h-3 animate-spin opacity-70" />
                    ) : (
                      <ChevronDown className="w-3 h-3 opacity-70" />
                    )}
                  </Button>
                }
              />
            </div>

            <div
              className="flex items-end justify-center gap-1.5 sm:gap-2 min-h-[4.5rem] sm:min-h-[5.5rem]"
              data-tour="intensity-gauge"
              data-testid="hero-number"
            >
              {isLoading ? (
                <RefreshCw
                  className="w-12 h-12 text-white animate-spin drop-shadow-lg"
                  aria-label="Loading data"
                />
              ) : isError ? (
                <div className="flex flex-col items-center py-1">
                  <AlertTriangle className="w-10 h-10 text-white animate-pulse mb-1 drop-shadow-md" />
                  <span className="text-sm font-bold text-white/95 uppercase tracking-[0.18em]">
                    {isOffline ? 'Offline' : 'Data unavailable'}
                  </span>
                </div>
              ) : (
                <>
                  <AnimatedIntensity
                    value={intensity}
                    previousValue={previousIntensity ?? null}
                    isUpdating={isBackgroundFetching}
                    size="hero"
                    highContrast={needsHardScrim}
                  />
                  <div className="flex flex-col items-start pb-1.5 sm:pb-2 gap-0.5">
                    <span className="text-white text-sm sm:text-base font-semibold leading-none tracking-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.7)]">
                      gCO₂
                    </span>
                    <span className="text-white/85 text-[11px] sm:text-xs font-medium leading-none drop-shadow-[0_1px_8px_rgba(0,0,0,0.65)]">
                      /kWh
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Band label + zero-carbon badge share a wrapping row: side by side where
                there's room (tablet/desktop, where the hero is short), badge on its own
                line below the band on phones. Never above, so it can't reach the header. */}
            <div
              className="flex flex-wrap items-center justify-center gap-x-3"
              data-testid="hero-band-row"
            >
              {!isLoading && !isError && conditionLabel && (
                <motion.div
                  key={conditionLabel}
                  className="mt-1 flex flex-col items-center"
                  data-testid="hero-band"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                >
                  {/* Label is centred on its own; the (i) hangs off its right edge on the
                      label's centre line so it never pulls the label off-centre. */}
                  <div className="relative inline-flex items-center">
                    <p
                      data-testid="hero-band-label"
                      className={cn(
                        // Intensity band labels — Plus Jakarta Sans bold (same face as HUD).
                        'font-sans text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight',
                        needsHardScrim
                          ? 'drop-shadow-[0_3px_16px_rgba(0,0,0,0.75)]'
                          : 'drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)]',
                        tone === 'plain' ? 'capitalize' : '',
                      )}
                    >
                      <TypewriterText text={conditionParts.band} />
                    </p>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="pointer-events-auto absolute left-full top-1/2 -translate-y-1/2 min-h-11 min-w-11 h-11 w-11 rounded-full p-0 scene-hud-info"
                          aria-label="What is carbon intensity?"
                        >
                          <Info className="w-3.5 h-3.5" aria-hidden="true" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[260px] p-3 text-xs bg-card border-border backdrop-blur-xl space-y-2">
                        <p className="font-semibold">Carbon intensity</p>
                        <p>{DEFINITIONS['Carbon Intensity']}</p>
                        <p className="text-muted-foreground">{DEFINITIONS['gCO2/kWh']}</p>
                        {index && tone !== 'plain' && (
                          <p className="text-muted-foreground">
                            Official band:{' '}
                            <span className="font-semibold capitalize text-foreground">
                              {index}
                            </span>
                          </p>
                        )}
                        <p className="text-muted-foreground">
                          This is NESO&apos;s forecast for your region for this half hour. It
                          updates every{' '}
                          <span className="font-semibold text-foreground">30 minutes</span>.
                        </p>
                        <CompactDataAttribution />
                      </PopoverContent>
                    </Popover>
                  </div>
                  {conditionParts.quip && (
                    // Own element with normal tracking: inheriting the label's tight
                    // tracking (computed in px from 24px) squeezed the word gaps, and Plus Jakarta
                    // Sans' space is only ~2px at 14px, so open it by 0.1em.
                    <p
                      data-testid="hero-quip"
                      className="mt-0.5 sm:mt-1 font-sans text-sm sm:text-base md:text-lg font-semibold tracking-normal [word-spacing:0.1em] text-white/95 drop-shadow-[0_2px_10px_rgba(0,0,0,0.45)]"
                    >
                      {conditionParts.quip}
                    </p>
                  )}
                </motion.div>
              )}
              {showZeroCarbonBadge && <ZeroCarbonBadge />}
            </div>

            {!isLoading && !isError && (
              <div
                className={cn(
                  /* Soft backing so the renewable + updated lines stay legible over
                     whatever scene art sits behind them (the house, dark hills) (BH-22). */
                  'mt-2 flex flex-col items-center gap-2 rounded-2xl px-3 py-1',
                  isInk ? 'bg-white/55' : 'bg-black/35',
                )}
                data-testid="hero-meta"
              >
                <div className="relative">
                  <motion.p
                    className={cn(
                      'inline-flex items-center gap-1.5 text-sm font-semibold drop-shadow-[0_2px_10px_rgba(0,0,0,0.65)]',
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
                  <div
                    className={cn(
                      'flex items-center gap-1.5 text-[11px] font-medium',
                      isInk
                        ? 'text-hero-ink'
                        : 'text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.65)]',
                    )}
                  >
                    <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
                      <span
                        className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-60 ${freshnessColor}`}
                      />
                      <span
                        className={`relative inline-flex h-1.5 w-1.5 rounded-full ${freshnessColor}`}
                      />
                    </span>
                    {isBackgroundFetching ? (
                      <span>Updating…</span>
                    ) : (
                      <>
                        <span>{relativeTime}</span>
                        {nextUpdateLabel && (
                          <>
                            <span className="opacity-60">·</span>
                            <span>{nextUpdateLabel}</span>
                          </>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Rendered last so keyboard/SR order is trophy → location → reading → scene hotspots.
          Absolute + no z-index, so paint order vs. the z-10/z-30 overlays is unchanged. */}
      <ComponentErrorBoundary name="SceneCanvas">
        <IntensityScene
          intensity={intensity}
          index={index}
          generationMix={generationMix}
          hasLiveReading={hasFreshReading}
          compact={hideGauge}
          className="absolute inset-0 h-full"
          style={{ height: '100%', position: 'absolute' }}
        />
      </ComponentErrorBoundary>
    </div>
  );
}
