import { useState, useEffect, useRef, useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { NotificationType } from '@capacitor/haptics';
import { toast } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
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
import {
  DashboardViewTabs,
  type DashboardViewMode,
} from '@/components/home/DashboardViewTabs';
import { IntensityDashboard } from '@/components/home/IntensityDashboard';
import { IntensityHeroOverlay } from '@/components/home/IntensityHeroOverlay';

const Index = () => {
  const { postcode, setPostcode } = useAppLocation();
  const [viewMode, setViewMode] = useState<DashboardViewMode>('intensity');
  const { showYearWrapped, setShowYearWrapped, wrappedYear } = useYearWrappedAutoShow();
  const { selection, notification } = useHaptics();

  const [sparkleTrigger, setSparkleTrigger] = useState(false);

  const { scheduleGreenAlerts, scheduleDailyForecast, scheduleHighIntensityAlerts, prefs } =
    useNotifications();
  useOctopusEnergy();

  const {
    intensity,
    previousIntensity,
    index,
    region,
    generationMix,
    forecast,
    lastUpdated,
    isLoading,
    isBackgroundFetching,
    isDegraded,
    isError,
    error,
    refetch,
    getNextUpdate,
    nextUpdate,
  } = useCarbonData(postcode);

  const { frequency: gridFrequency } = useGridDemand();
  const renewablesPct = getRenewablesPercentage(generationMix);

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
        notification(NotificationType.Success);
      }
    }
    prevRenRef.current = renewablesPct;
  }, [renewablesPct, isLoading, notification]);

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
  });

  const throttledRefetch = useThrottledRefetch(refetch, {
    cooldownMs: 10_000,
    skipToastDescription: 'Grid data updates every 30 minutes — give it a sec.',
  });

  const handleRefresh = async () => {
    const ran = await throttledRefetch();
    if (!ran) return;

    if (lastUpdated) {
      const last = new Date(lastUpdated).getTime();
      const next = last + 30 * 60 * 1000;
      const now = new Date().getTime();

      if (next > now) {
        const timeStr = new Date(next).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        });
        toast.info('Up to date', {
          description: `Next Grid data update expected around ${timeStr}.`,
        });
      } else {
        toast.info('Checked for updates', {
          description: 'No new data from National Grid yet.',
        });
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const tabs: DashboardViewMode[] = ['intensity', 'demand', 'footprint'];
    const currentIndex = tabs.indexOf(viewMode);
    let nextIndex = currentIndex;

    if (e.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % tabs.length;
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    } else if (e.key === 'Home') {
      nextIndex = 0;
    } else if (e.key === 'End') {
      nextIndex = tabs.length - 1;
    }

    if (nextIndex !== currentIndex) {
      setViewMode(tabs[nextIndex]);
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
        className="min-h-screen bg-background transition-colors duration-1000"
        style={{ background: skyColor }}
      >
        <PullToRefresh onRefresh={handleRefresh} disabled={isLoading}>
          <main className="min-h-[100dvh] flex flex-col animate-in fade-in duration-700 lg:pb-0">
            <h1 className="sr-only">Carbon Intensity Dashboard</h1>

            <IntensityHeroOverlay
              postcode={postcode}
              setPostcode={setPostcode}
              region={region}
              intensity={intensity}
              previousIntensity={previousIntensity}
              index={index}
              generationMix={generationMix}
              isLoading={isLoading}
              isBackgroundFetching={isBackgroundFetching}
              isError={isError}
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

            <div className="flex-1 px-4 pt-5 pb-[calc(7.5rem+env(safe-area-inset-bottom))] lg:pb-6 space-y-4 -mt-8 relative z-10 bg-card rounded-t-[1.75rem] shadow-[0_-12px_40px_-20px_rgba(15,23,42,0.18)] lg:max-w-7xl lg:mx-auto w-full lg:rounded-t-3xl lg:shadow-xl lg:-mt-10 lg:pt-8 lg:space-y-6">
              <div className="absolute -top-[79px] left-0 right-0 h-[80px] pointer-events-none overflow-hidden z-20">
                <SceneWaveDivider cleanliness={cleanliness} />
              </div>

              <div className="flex justify-center pt-0.5 pb-1 lg:hidden" aria-hidden>
                <div className="h-1 w-10 rounded-full bg-muted-foreground/25" />
              </div>

              {isDegraded && (
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

              <div className="px-1 pb-2 pt-0">
                <EnergyFactBubble
                  intensity={intensity}
                  generationMix={generationMix}
                  variant="plain"
                  className="mx-auto max-w-prose text-center"
                />
              </div>

              <AnimatePresence mode="wait">
                {isError ? (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.25 }}
                    className="py-8 bg-card rounded-2xl border border-border shadow-lg"
                  >
                    <ErrorState
                      title={getErrorInfo(error).title}
                      description={getErrorInfo(error).description}
                      steps={getErrorInfo(error).steps}
                      retry={refetch}
                    />
                  </motion.div>
                ) : isLoading && forecast.length === 0 ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <DashboardSkeleton />
                  </motion.div>
                ) : (
                  <motion.div
                    key="content"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    className="space-y-4"
                  >
                    <DashboardViewTabs
                      viewMode={viewMode}
                      onViewModeChange={setViewMode}
                      onSelectionHaptic={selection}
                      onKeyDown={handleKeyDown}
                    />

                    <AnimatePresence mode="wait">
                      <motion.div
                        key={viewMode}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3, ease: 'easeOut' as const }}
                        className="w-full pb-10"
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
                          />
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>
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

        <YearWrapped
          open={showYearWrapped}
          onOpenChange={setShowYearWrapped}
          year={wrappedYear}
        />
      </div>
    </TooltipProvider>
  );
};

export default Index;
