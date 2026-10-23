import { useState, useEffect, useRef, useMemo, useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { NotificationType } from '@capacitor/haptics';
import { toast } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import {} from '@/components/ui/button';
import { FootprintView } from '@/components/FootprintView';
import { DemandView } from '@/components/DemandView';
import { useCarbonData } from '@/hooks/useCarbonData';
import { useHaptics } from '@/hooks/useHaptics';
import { useOctopusEnergy } from '@/hooks/useOctopusEnergy';
import { useNotifications } from '@/hooks/useNotifications';
import { PullToRefresh } from '@/components/PullToRefresh';
import { getErrorInfo } from '@/lib/errorUtils';
import { ErrorState } from '@/components/ErrorState';
import { useGridDemand } from '@/hooks/useGridDemand';
import { SceneWaveDivider } from '@/components/scene/SceneWaveDivider';
import { EnergyFactBubble } from '@/components/scene/EnergyFactBubble';
import { LocationMismatchPrompt } from '@/components/LocationMismatchPrompt';
import { YearWrapped } from '@/components/YearWrapped';
import { getRenewablesPercentage } from '@/lib/generationUtils';
import { useAppLocation } from '@/contexts/LocationContext';
import { useYearWrappedAutoShow } from '@/hooks/useYearWrappedAutoShow';
import { useEnvironmentalConditions } from '@/hooks/useEnvironmentalConditions';
import { useIndexPageEffects } from '@/hooks/useIndexPageEffects';
import { useThrottledRefetch } from '@/hooks/useThrottledRefetch';
import { useRelativeTime } from '@/hooks/useRelativeTime';
import { DashboardSkeleton } from '@/components/home/DashboardSkeleton';
import { SlowLoadingNotice } from '@/components/SlowLoadingNotice';
import { OffGridNotice } from '@/components/home/OffGridNotice';
import { StaleReadingNotice } from '@/components/home/StaleReadingNotice';
import { OutageCard } from '@/components/home/OutageCard';
import { OfflineEmptyState } from '@/components/errors/OfflineEmptyState';
import { useGridFailureKind } from '@/hooks/useGridFailureKind';
import { useOffline } from '@/hooks/useOffline';
import { setHeroReadingAt } from '@/lib/offlineReadingTime';
import { isReadingStale } from '@/lib/voice/statesCopy';
import { PostcodeNotFoundNotice } from '@/components/home/PostcodeNotFoundNotice';
import { DashboardViewTabs, type DashboardViewMode } from '@/components/home/DashboardViewTabs';
import { IntensityDashboard } from '@/components/home/IntensityDashboard';
import { IntensityHeroOverlay } from '@/components/home/IntensityHeroOverlay';
import { useSceneGrowth } from '@/hooks/useSceneGrowth';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { createHorizontalStateVariants, stateTransition } from '@/lib/motion';

import { formatLondonTime } from '@/lib/londonTime';
import { signalFirstContent } from '@/lib/firstContent';
import { isNesoRequestFailure } from '@/lib/carbonApi';

const DASHBOARD_VIEWS: DashboardViewMode[] = ['intensity', 'demand', 'footprint'];

const Index = () => {
  const { postcode, setPostcode } = useAppLocation();
  const [viewMode, setViewMode] = useState<DashboardViewMode>('intensity');
  const location = useLocation();
  useLayoutEffect(() => {
    if (location.state?.startProductTour) setViewMode('intensity');
    // "See my footprint" after linking Octopus (PR-O1).
    else if (location.state?.dashboardView === 'footprint') setViewMode('footprint');
  }, [location.key, location.state]);
  const { showYearWrapped, setShowYearWrapped, wrappedYear } = useYearWrappedAutoShow();
  const { selection } = useHaptics();
  // Renewables milestones are a nice-to-have: skipped under Reduce Motion or Haptics off.
  const { notification: decorativeNotification } = useHaptics({ decorative: true });
  const shouldReduceMotion = useReducedMotion();
  const prevViewModeRef = useRef(viewMode);
  const viewDirectionRef = useRef<1 | -1 | 0>(0);

  if (viewMode !== prevViewModeRef.current) {
    const from = DASHBOARD_VIEWS.indexOf(prevViewModeRef.current);
    const to = DASHBOARD_VIEWS.indexOf(viewMode);
    viewDirectionRef.current = from === -1 || to === -1 ? 0 : to > from ? 1 : -1;
  }

  useLayoutEffect(() => {
    prevViewModeRef.current = viewMode;
  }, [viewMode]);

  const viewStateVariants = createHorizontalStateVariants(shouldReduceMotion);

  const [sparkleTrigger, setSparkleTrigger] = useState(false);

  const {
    scheduleGreenAlerts,
    scheduleDailyForecast,
    scheduleHighIntensityAlerts,
    prefs,
    isSupported: notificationsSupported,
    permissionStatus: notificationPermission,
    requestPermission: requestNotificationPermission,
    updatePreference: updateNotificationPreference,
  } = useNotifications();
  useOctopusEnergy();

  const {
    intensity,
    previousIntensity,
    index,
    region,
    regionId,
    generationMix,
    forecast,
    lastUpdated,
    isLoading,
    isBackgroundFetching,
    isDegraded,
    postcodeNotFound,
    usingNationalFallback,
    fallbackRegionName,
    offGridArea: offGrid,
    isError,
    hasReading,
    error,
    refetch,
    getNextUpdate,
    nextUpdate,
  } = useCarbonData(postcode);
  // Design error states: keep the last known number (with its chip) when a
  // refresh fails or the reading is old, and only blame NESO when it's NESO.
  const failureKind = useGridFailureKind(isError, error);
  const { isOffline } = useOffline();
  // Offline with cached figures: the in-hero offline pill (#137) says so, so
  // no Last-known chip and no stale card as well (the pill carries Retry).
  // Back online but still stale: chip and card return. Nothing cached at
  // all: full offline state.
  const showLastKnown =
    hasReading && !isOffline && (isError || isReadingStale(lastUpdated ?? undefined));
  const showOfflineEmpty = isOffline && !hasReading;
  // BH-88: the offline pill shows this reading's own time, not when it was saved.
  useEffect(() => {
    const at = lastUpdated ? Date.parse(lastUpdated) : NaN;
    setHeroReadingAt(Number.isFinite(at) ? at : null);
  }, [lastUpdated]);

  // Splash fades as soon as the home screen has something real to show
  // (a reading from cache or network, an off-grid notice, or an error state).
  useEffect(() => {
    if (!isLoading) signalFirstContent();
  }, [isLoading]);

  const { frequency: gridFrequency } = useGridDemand();
  const renewablesPct = getRenewablesPercentage(generationMix);
  const sceneGrowth = useSceneGrowth(intensity, generationMix);

  const cleanliness = useMemo(() => {
    const band = index || 'moderate';
    if (band === 'very low') return 1;
    if (band === 'low') return 0.75;
    if (band === 'moderate') return 0.45;
    if (band === 'high') return 0.2;
    return 0.05;
  }, [index]);

  const prevRenRef = useRef<number | null>(null);
  useEffect(() => {
    const thresholds = [50, 70, 80];
    const prev = prevRenRef.current;
    if (prev !== null && !isLoading) {
      const crossed = thresholds.some((t) => prev < t && renewablesPct >= t);
      if (crossed) {
        setSparkleTrigger(true);
        decorativeNotification(NotificationType.Success);
      }
    }
    prevRenRef.current = renewablesPct;
  }, [renewablesPct, isLoading, decorativeNotification]);

  useIndexPageEffects({
    postcode,
    intensity,
    isLoading,
    lastUpdated,
    forecast,
    refetch,
    scheduleGreenAlerts,
    scheduleDailyForecast,
    scheduleHighIntensityAlerts,
    isError,
    notificationNudge: {
      isSupported: notificationsSupported,
      permissionStatus: notificationPermission,
      alertsAlreadyOn: prefs.lowIntensityEnabled,
      requestPermission: requestNotificationPermission,
      enableCleanAlerts: () => updateNotificationPreference('lowIntensityEnabled', true),
    },
  });

  const throttledRefetch = useThrottledRefetch(refetch, {
    cooldownMs: 10_000,
    skipToastDescription: 'Grid data updates every 30 minutes. Give it a sec.',
  });

  const handleRefresh = async () => {
    const ran = await throttledRefetch();
    if (!ran) return;

    if (lastUpdated) {
      const last = new Date(lastUpdated).getTime();
      const next = last + 30 * 60 * 1000;
      const now = new Date().getTime();

      if (next > now) {
        const timeStr = formatLondonTime(new Date(next));
        toast.info('Same half hour, same number', {
          description: `Next update around ${timeStr}.`,
        });
      } else {
        toast.info('Checked for updates', {
          description: 'Nothing new from NESO yet. Try again in a few minutes.',
        });
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const currentIndex = DASHBOARD_VIEWS.indexOf(viewMode);
    let nextIndex = currentIndex;

    if (e.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % DASHBOARD_VIEWS.length;
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + DASHBOARD_VIEWS.length) % DASHBOARD_VIEWS.length;
    } else if (e.key === 'Home') {
      nextIndex = 0;
    } else if (e.key === 'End') {
      nextIndex = DASHBOARD_VIEWS.length - 1;
    }

    if (nextIndex !== currentIndex) {
      setViewMode(DASHBOARD_VIEWS[nextIndex]);
      setTimeout(() => {
        const activeTabEl = document.querySelector(
          '[role="tab"][aria-selected="true"]',
        ) as HTMLButtonElement | null;
        activeTabEl?.focus();
      }, 50);
    }
  };

  const { skyColor } = useEnvironmentalConditions(postcode, intensity);
  const relativeTime = useRelativeTime(lastUpdated);
  const freshnessColor = (() => {
    if (!lastUpdated) return 'bg-muted-foreground/40';
    const ageMins = (Date.now() - new Date(lastUpdated).getTime()) / 60000;
    if (ageMins < 10) return 'bg-emerald-400';
    if (ageMins < 35) return 'bg-amber-400';
    return 'bg-destructive';
  })();

  const glowClassSuffix = index ? index.replace(' ', '-') : 'moderate';
  const glowClass = `glow-intensity-${glowClassSuffix}`;

  return (
    <TooltipProvider>
      <div
        className="min-h-[100dvh] bg-background transition-colors duration-1000"
        style={{ background: skyColor }}
      >
        <PullToRefresh onRefresh={handleRefresh} disabled={isLoading}>
          {/* Shared app-content inset lives inside home-feed to clear the dock without a sky-coloured gap. */}
          <main className="home-shell flex flex-col animate-in fade-in duration-700 lg:min-h-[100dvh] lg:pb-0">
            <h1 className="sr-only">Carbon Intensity Dashboard</h1>

            <IntensityHeroOverlay
              postcode={postcode}
              setPostcode={setPostcode}
              region={region}
              usingNationalFallback={usingNationalFallback}
              fallbackRegionName={fallbackRegionName}
              intensity={intensity}
              previousIntensity={previousIntensity}
              index={index}
              generationMix={generationMix}
              isLoading={isLoading}
              isBackgroundFetching={isBackgroundFetching}
              isError={isError && !hasReading}
              nesoRequestFailed={isNesoRequestFailure(error)}
              lastKnownAt={showLastKnown ? lastUpdated : undefined}
              lastUpdated={lastUpdated}
              nextUpdate={nextUpdate}
              getNextUpdate={getNextUpdate}
              relativeTime={relativeTime}
              freshnessColor={freshnessColor}
              renewablesPct={renewablesPct}
              sparkleTrigger={sparkleTrigger}
              onSparkleComplete={() => setSparkleTrigger(false)}
              hideGauge={viewMode === 'demand'}
            />

            <div className="home-feed flex-1 px-4 pt-5 pb-4 lg:pb-6 space-y-4 -mt-8 relative z-10 bg-card rounded-t-none shadow-[0_-12px_40px_-20px_rgba(15,23,42,0.18)] lg:max-w-7xl lg:mx-auto w-full lg:shadow-xl lg:-mt-10 lg:pt-8 lg:space-y-6">
              {/* Scalloped top edge of the sheet. The sheet itself has square top corners so the
                  scallop meets both edges cleanly (no sliver or doubled half-circle). */}
              <div
                className="scene-wave-divider absolute -top-[79px] left-0 right-0 h-[80px] pointer-events-none overflow-hidden z-20"
                data-testid="scene-wave-divider"
              >
                <SceneWaveDivider cleanliness={cleanliness} />
              </div>

              <div className="flex justify-center pt-0.5 pb-1 lg:hidden" aria-hidden>
                <div className="h-1 w-10 rounded-full bg-muted-foreground/25" />
              </div>

              {offGrid && (
                <OffGridNotice area={offGrid} postcode={postcode} onChangePostcode={setPostcode} />
              )}

              {isOffline ? null : isError && hasReading ? (
                failureKind === 'outage' ? (
                  <OutageCard onRetry={() => void refetch()} />
                ) : (
                  <StaleReadingNotice
                    force
                    readingFrom={lastUpdated}
                    onRetry={() => void refetch()}
                  />
                )
              ) : (
                !isLoading && (
                  <StaleReadingNotice readingFrom={lastUpdated} onRetry={() => void refetch()} />
                )
              )}

              {postcodeNotFound && !offGrid && (
                <PostcodeNotFoundNotice postcode={postcode} onChangePostcode={setPostcode} />
              )}

              {isDegraded && !offGrid && !postcodeNotFound && (
                <div className="mx-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg flex items-start gap-3 text-sm text-amber-800 dark:text-amber-200 animate-in fade-in">
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-500" />
                  <div>
                    <p className="font-semibold">Regional data degraded</p>
                    <p>
                      We're currently unable to fetch data for {postcode} and are showing National
                      Grid averages instead.
                    </p>
                  </div>
                </div>
              )}

              <div className="home-feed-fact px-1 pb-2 pt-0">
                <EnergyFactBubble
                  intensity={intensity}
                  hasReading={!isLoading && !isError}
                  generationMix={generationMix}
                  variant="plain"
                  className="mx-auto max-w-prose text-center"
                />
              </div>

              {/* Stable min-height + no enter/exit layout animation on the
                  loading↔content swap. Framer y/height motion here was a CLS
                  source; Intensity/Demand/Footprint still animate below. */}
              <div className="home-feed-body min-h-[54.8rem]">
                {/* Prefer skeleton over error while loading/restoring so a brief
                    no-reading frame never mounts ErrorState and shifts the feed. */}
                {showOfflineEmpty ? (
                  <OfflineEmptyState />
                ) : isLoading && forecast.length === 0 ? (
                  <div className="space-y-3">
                    <SlowLoadingNotice active onRetry={() => void refetch()} />
                    <DashboardSkeleton />
                  </div>
                ) : isError && !hasReading && failureKind === 'outage' ? (
                  <OutageCard onRetry={() => void refetch()} />
                ) : isError && !hasReading ? (
                  <div className="py-8 bg-card rounded-2xl border border-border shadow-lg">
                    <ErrorState
                      title={getErrorInfo(error).title}
                      description={getErrorInfo(error).description}
                      steps={getErrorInfo(error).steps}
                      retry={refetch}
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <DashboardViewTabs
                      viewMode={viewMode}
                      onViewModeChange={setViewMode}
                      onSelectionHaptic={selection}
                      onKeyDown={handleKeyDown}
                    />

                    <AnimatePresence mode="wait" initial={false} custom={viewDirectionRef.current}>
                      <motion.div
                        key={viewMode}
                        id="dashboard-tabpanel"
                        role="tabpanel"
                        aria-label={
                          viewMode === 'demand'
                            ? 'Demand'
                            : viewMode === 'footprint'
                              ? 'Footprint'
                              : 'Intensity'
                        }
                        custom={viewDirectionRef.current}
                        variants={viewStateVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        transition={stateTransition}
                        className="w-full"
                      >
                        {viewMode === 'demand' ? (
                          <DemandView />
                        ) : viewMode === 'footprint' ? (
                          <FootprintView />
                        ) : (
                          <IntensityDashboard
                            intensity={intensity}
                            forecast={forecast}
                            generationMix={generationMix}
                            gridFrequency={gridFrequency}
                            lastUpdated={lastUpdated}
                            glowClass={glowClass}
                            showWeatherInInsights={prefs.showWeatherInInsights}
                            gardenDays={sceneGrowth.gardenDays}
                            growthStage={sceneGrowth.stage}
                            regionId={regionId ?? null}
                            regionName={region}
                          />
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </div>
          </main>
        </PullToRefresh>

        <LocationMismatchPrompt
          currentPostcode={postcode}
          onUpdate={(newPostcode) => {
            setPostcode(newPostcode);
            toast.success('Location updated to match your current region');
          }}
        />

        <YearWrapped open={showYearWrapped} onOpenChange={setShowYearWrapped} year={wrappedYear} />
      </div>
    </TooltipProvider>
  );
};

export default Index;
