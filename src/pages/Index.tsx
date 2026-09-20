import { useState, useEffect, useRef, useMemo } from 'react';
import { RefreshCw, Zap, Leaf, Activity, MapPin, ChevronDown, AlertTriangle, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { IntensityScene } from '@/components/IntensityScene';
import { getErrorInfo } from "@/lib/errorUtils";
import { GenerationMixBar } from '@/components/GenerationMixBar';
import { ForecastChart } from '@/components/ForecastChart';
import { ForecastSummary } from '@/components/ForecastSummary';
import { LocationManager } from '@/components/LocationManager';
import { BestTimeSlot, WorstTimeSlot } from '@/components/BestTimeCard';
import { FootprintView } from '@/components/FootprintView';
import { DemandView } from '@/components/DemandView';
import { useCarbonData } from '@/hooks/useCarbonData';
import { useHaptics } from '@/hooks/useHaptics';
import { NotificationType } from '@capacitor/haptics';
import { useNotifications } from '@/hooks/useNotifications';
import { toast } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { PullToRefresh } from '@/components/PullToRefresh';
import type { ForecastData } from '@/lib/carbonApi';
import { ErrorState } from '@/components/ErrorState';
import { ComponentErrorBoundary } from '@/components/ComponentErrorBoundary';
import { useGridDemand } from '@/hooks/useGridDemand';
import { WeatherWidget } from '@/components/WeatherWidget';
import { GreenerNightsCard } from '@/components/GreenerNightsCard';
import { SceneWaveDivider } from '@/components/scene/SceneWaveDivider';
import { EnergyFactBubble } from '@/components/scene/EnergyFactBubble';
import { StaleDataBadge } from '@/components/StaleDataBadge';
import { LocationMismatchPrompt } from '@/components/LocationMismatchPrompt';
import { YearWrapped } from '@/components/YearWrapped';
import { Skeleton } from '@/components/ui/skeleton';
import { HeroIntensityOverlay } from '@/components/HeroIntensityOverlay';
import { getRenewablesPercentage } from '@/lib/generationUtils';

import { useAppLocation } from '@/contexts/LocationContext';
import { useYearWrappedAutoShow } from '@/hooks/useYearWrappedAutoShow';
import { useEnvironmentalConditions } from '@/hooks/useEnvironmentalConditions';
import { useIndexPageEffects } from '@/hooks/useIndexPageEffects';
import { useThrottledRefetch } from '@/hooks/useThrottledRefetch';
import { useRelativeTime } from '@/hooks/useRelativeTime';

const Index = () => {
  const { postcode, setPostcode } = useAppLocation();
  const [viewMode, setViewMode] = useState<'intensity' | 'footprint' | 'demand'>('intensity');
  const { showYearWrapped, setShowYearWrapped, wrappedYear } = useYearWrappedAutoShow();
  const { selection, notification } = useHaptics();

  // Sparkle burst: fires when renewables cross 50 / 70 / 80%
  const [sparkleTrigger, setSparkleTrigger] = useState(false);

  const { scheduleGreenAlerts, scheduleDailyForecast, scheduleHighIntensityAlerts, prefs } = useNotifications();

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
    nextUpdate
  } = useCarbonData(postcode);

  const { frequency: gridFrequency } = useGridDemand();

  // Compute renewables % for badge + sparkle
  const renewablesPct = getRenewablesPercentage(generationMix);

  // Derived cleanliness rating for wave shape styling
  const cleanliness = useMemo(() => {
    const band = index || 'moderate';
    if (band === 'very low') return 1;
    if (band === 'low') return 0.75;
    if (band === 'moderate') return 0.45;
    if (band === 'high') return 0.2;
    return 0.05; // very high
  }, [index]);

  // Detect threshold crossings (50 / 70 / 80) and fire sparkle
  const prevRenRef = useRef<number | null>(null);
  useEffect(() => {
    const thresholds = [50, 70, 80];
    const prev = prevRenRef.current;
    if (prev !== null && !isLoading) {
      const crossed = thresholds.some(t => prev < t && renewablesPct >= t);
      if (crossed) {
        setSparkleTrigger(true);
        notification(NotificationType.Success);
      }
    }
    prevRenRef.current = renewablesPct;
  }, [renewablesPct, isLoading, notification]);

  // Composite hook for all page-level effects (notifications, tour, periodic refresh, routing)
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

  // Throttle manual refreshes to prevent rapid-fire API calls.
  // The hook surfaces its own toast when a refresh is skipped.
  const throttledRefetch = useThrottledRefetch(refetch, {
    cooldownMs: 10_000,
    skipToastDescription: 'Grid data updates every 30 minutes — give it a sec.',
  });

  const handleRefresh = async () => {
    const ran = await throttledRefetch();
    if (!ran) return; // Throttled — hook already showed feedback

    if (lastUpdated) {
      // Calculate next expected update time
      const last = new Date(lastUpdated).getTime();
      const next = last + (30 * 60 * 1000); // +30 mins
      const now = new Date().getTime();

      // If next update is in the future, we still have valid data
      if (next > now) {
        const timeStr = new Date(next).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        toast.info("Up to date", {
          description: `Next Grid data update expected around ${timeStr}.`,
        });
      } else {
        // Maybe API IS just lagging, still show 'refreshed'
        toast.info("Checked for updates", {
          description: "No new data from National Grid yet.",
        });
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const tabs: ('intensity' | 'demand' | 'footprint')[] = ['intensity', 'demand', 'footprint'];
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
        const activeTabEl = document.querySelector(`[role="tab"][aria-selected="true"]`) as HTMLButtonElement | null;
        activeTabEl?.focus();
      }, 50);
    }
  };

  const { skyColor } = useEnvironmentalConditions(postcode, intensity);

  // Relative timestamp + freshness dot for hero overlay
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

  const nextUpdateLabel = (() => {
    if (!lastUpdated) return '';
    if (nextUpdate) {
      const next = new Date(nextUpdate);
      const now = new Date();
      if (now > next) return 'Update due';
      return `Next ${next.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    const next = getNextUpdate(lastUpdated);
    if (!next) return '';
    return `Next ${next.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  })();

  return (
    <TooltipProvider>
      <div
        className="min-h-screen bg-background transition-colors duration-1000"
        style={{ background: skyColor }}
      >
        <PullToRefresh onRefresh={handleRefresh} disabled={isLoading}>
          <main className="min-h-[100dvh] flex flex-col animate-in fade-in duration-700 lg:pb-0">
            <h1 className="sr-only">Carbon Intensity Dashboard</h1>
            {/* Scene hero — illustration leads; HUD stays light */}
            <div className="relative w-full h-[62vh] min-h-[420px] max-h-[720px]">
              <ComponentErrorBoundary name="Scene">
                <IntensityScene intensity={intensity} index={index} generationMix={generationMix} className="h-full" style={{ height: '100%' }} />

                {/* Desktop Region Selector - Top Left */}
                <div className="absolute top-6 left-6 z-30 hidden lg:block">
                  <LocationManager
                    value={postcode}
                    onChange={setPostcode}
                    trigger={
                      <button className="flex items-center gap-2 text-white/90 text-sm font-semibold tracking-wide transition-all cursor-pointer bg-black/25 hover:bg-black/35 backdrop-blur-md px-4 py-2 rounded-full border border-white/15 hover:border-white/25 shadow-sm group">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{isLoading ? 'Loading...' : region || 'Select location'}</span>
                        {isBackgroundFetching ? (
                          <RefreshCw className="w-3 h-3 animate-spin opacity-70" />
                        ) : (
                          <ChevronDown className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity" />
                        )}
                      </button>
                    }
                  />
                </div>

                {/* Achievements Shortcut - Top Right */}
                <div className="absolute top-[calc(max(env(safe-area-inset-top),24px)+0.5rem)] right-4 z-30 lg:top-6 lg:right-6">
                  <Link to="/achievements">
                    <button className="flex items-center justify-center text-white/90 transition-all cursor-pointer bg-black/25 hover:bg-black/35 active:scale-95 hover:scale-105 backdrop-blur-md p-2.5 rounded-full border border-white/15 hover:border-white/25 shadow-sm" aria-label="Trophy Room">
                      <Trophy className="w-4 h-4 text-amber-300" />
                    </button>
                  </Link>
                </div>
              </ComponentErrorBoundary>

              {viewMode !== 'demand' && (
                <HeroIntensityOverlay
                  postcode={postcode}
                  onPostcodeChange={setPostcode}
                  region={region}
                  intensity={intensity}
                  previousIntensity={previousIntensity}
                  index={index}
                  renewablesPct={renewablesPct}
                  sparkleTrigger={sparkleTrigger}
                  onSparkleComplete={() => setSparkleTrigger(false)}
                  isLoading={isLoading}
                  isError={isError}
                  isBackgroundFetching={isBackgroundFetching}
                  lastUpdated={lastUpdated}
                  relativeTime={relativeTime}
                  freshnessColor={freshnessColor}
                  nextUpdateLabel={nextUpdateLabel}
                />
              )}
            </div>

            {/* Content sheet — paper pull-up under the scene */}
            <div className="flex-1 px-4 pt-5 pb-[calc(7.5rem+env(safe-area-inset-bottom))] lg:pb-6 space-y-4 -mt-8 relative z-10 bg-card rounded-t-[1.75rem] shadow-[0_-12px_40px_-20px_rgba(15,23,42,0.18)] lg:max-w-7xl lg:mx-auto w-full lg:rounded-t-3xl lg:shadow-xl lg:-mt-10 lg:pt-8 lg:space-y-6">
              {/* Organic wave divider — blends scene into content below */}
              <div className="absolute -top-[79px] left-0 right-0 h-[80px] pointer-events-none overflow-hidden z-20">
                <SceneWaveDivider cleanliness={cleanliness} />
              </div>

              {/* Sheet grab affordance */}
              <div className="flex justify-center pt-0.5 pb-1 lg:hidden" aria-hidden>
                <div className="h-1 w-10 rounded-full bg-muted-foreground/25" />
              </div>

              {/* Degradation Alert */}
              {isDegraded && (
                <div className="mx-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg flex items-start gap-3 text-sm text-amber-800 dark:text-amber-200 animate-in fade-in">
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-500" />
                  <div>
                    <p className="font-semibold">Regional data degraded</p>
                    <p>We're currently unable to fetch data for {postcode} and are showing National Grid averages instead.</p>
                  </div>
                </div>
              )}

              {/* Energy commentary — Carrot-style personality line */}
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
                  <div 
                    role="tablist" 
                    aria-label="Dashboard Views" 
                    onKeyDown={handleKeyDown}
                    className="relative flex p-1.5 bg-muted/80 rounded-2xl overflow-hidden select-none border border-border/40"
                  >
                    <button
                      role="tab"
                      tabIndex={viewMode === 'intensity' ? 0 : -1}
                      aria-selected={viewMode === 'intensity'}
                      aria-controls="dashboard-tab-content"
                      className={`relative flex-1 min-w-[100px] h-9 rounded-xl text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 z-10 ${
                        viewMode === 'intensity' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                      }`}
                      onClick={() => { selection(); setViewMode('intensity'); }}
                    >
                      {viewMode === 'intensity' && (
                        <motion.div
                          layoutId="dashboard-view-pill"
                          className="absolute inset-0 bg-background shadow-sm rounded-xl"
                          transition={{ type: 'spring' as const, stiffness: 380, damping: 30 }}
                        />
                      )}
                      <span className="relative z-20 flex items-center justify-center h-full">
                        <motion.span
                          key={viewMode === 'intensity' ? 'active' : 'inactive'}
                          initial={viewMode === 'intensity' ? { scale: 1.3 } : false}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring' as const, stiffness: 400, damping: 20 }}
                        >
                          <Activity className="w-4 h-4 mr-2" />
                        </motion.span>
                        Intensity
                      </span>
                    </button>

                    <button
                      role="tab"
                      tabIndex={viewMode === 'demand' ? 0 : -1}
                      aria-selected={viewMode === 'demand'}
                      aria-controls="dashboard-tab-content"
                      className={`relative flex-1 min-w-[100px] h-9 rounded-xl text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 z-10 ${
                        viewMode === 'demand' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                      }`}
                      onClick={() => { selection(); setViewMode('demand'); }}
                    >
                      {viewMode === 'demand' && (
                        <motion.div
                          layoutId="dashboard-view-pill"
                          className="absolute inset-0 bg-background shadow-sm rounded-xl"
                          transition={{ type: 'spring' as const, stiffness: 380, damping: 30 }}
                        />
                      )}
                      <span className="relative z-20 flex items-center justify-center h-full">
                        <motion.span
                          key={viewMode === 'demand' ? 'active' : 'inactive'}
                          initial={viewMode === 'demand' ? { scale: 1.3 } : false}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring' as const, stiffness: 400, damping: 20 }}
                        >
                          <Zap className="w-4 h-4 mr-2" />
                        </motion.span>
                        Demand
                      </span>
                    </button>

                    <button
                      role="tab"
                      tabIndex={viewMode === 'footprint' ? 0 : -1}
                      aria-selected={viewMode === 'footprint'}
                      aria-controls="dashboard-tab-content"
                      className={`relative flex-1 min-w-[100px] h-9 rounded-xl text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 z-10 ${
                        viewMode === 'footprint' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                      }`}
                      onClick={() => { selection(); setViewMode('footprint'); }}
                      data-tour="view-footprint"
                    >
                      {viewMode === 'footprint' && (
                        <motion.div
                          layoutId="dashboard-view-pill"
                          className="absolute inset-0 bg-background shadow-sm rounded-xl"
                          transition={{ type: 'spring' as const, stiffness: 380, damping: 30 }}
                        />
                      )}
                      <span className="relative z-20 flex items-center justify-center h-full">
                        <motion.span
                          key={viewMode === 'footprint' ? 'active' : 'inactive'}
                          initial={viewMode === 'footprint' ? { scale: 1.3 } : false}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring' as const, stiffness: 400, damping: 20 }}
                        >
                          <Leaf className="w-4 h-4 mr-2" />
                        </motion.span>
                        Footprint
                      </span>
                    </button>
                  </div>


                  {/* Render View */}
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
                        <motion.div
                          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                          variants={{
                            hidden: {},
                            show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
                          }}
                          initial="hidden"
                          animate="show"
                        >
                          {/* Energy Insights */}
                          <motion.div
                            className="md:col-span-2 lg:col-span-1 lg:row-span-2"
                            variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 220, damping: 22 } } }}
                          >
                            <Card className={`p-4 shadow-lg bg-accent/15 border-accent/30 glass-card h-full flex flex-col ${glowClass}`}>
                              <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                                  <Zap className="w-4 h-4 text-accent-foreground" />
                                </div>
                                <div>
                                  <h3 className="font-medium text-foreground">Energy Insights</h3>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {getSmartTip(intensity, forecast)}
                                  </p>
                                </div>
                              </div>

                              {prefs.showWeatherInInsights && (
                                <div className="mt-3 pt-3 border-t border-accent-foreground/10">
                                  <ComponentErrorBoundary name="Weather Widget">
                                    <WeatherWidget />
                                  </ComponentErrorBoundary>
                                </div>
                              )}

                              <div className="mt-3">
                                <ComponentErrorBoundary name="Greener Nights">
                                  <GreenerNightsCard />
                                </ComponentErrorBoundary>
                              </div>
                            </Card>
                          </motion.div>

                          {/* Generation Mix */}
                          <motion.div
                            className="md:col-span-2 lg:col-span-2"
                            variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 220, damping: 22 } } }}
                          >
                            <Card className={`p-4 shadow-lg flex flex-col justify-center glass-card h-full ${glowClass}`} data-tour="generation-mix">
                              <ComponentErrorBoundary name="Generation Mix">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="sr-only">Generation Mix</span>
                                  <StaleDataBadge lastUpdated={lastUpdated} />
                                </div>
                                <GenerationMixBar mix={generationMix} frequency={gridFrequency} />
                              </ComponentErrorBoundary>
                            </Card>
                          </motion.div>

                          {/* Best time */}
                          {forecast.length > 0 && (
                            <motion.div
                              variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 220, damping: 22 } } }}
                              className="transition-transform active:scale-[0.985]"
                            >
                              <ComponentErrorBoundary name="Best Time">
                                <BestTimeSlot forecast={forecast} />
                              </ComponentErrorBoundary>
                            </motion.div>
                          )}

                          {/* Worst time */}
                          {forecast.length > 0 && (
                            <motion.div
                              variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 220, damping: 22 } } }}
                              className="transition-transform active:scale-[0.985]"
                            >
                              <ComponentErrorBoundary name="Worst Time">
                                <WorstTimeSlot forecast={forecast} />
                              </ComponentErrorBoundary>
                            </motion.div>
                          )}

                          {/* Hourly Forecast */}
                          {forecast.length > 0 && (
                            <motion.div
                              className="md:col-span-2 lg:col-span-3"
                              variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 220, damping: 22 } } }}
                            >
                              <Card className={`p-4 shadow-lg glass-card ${glowClass}`} data-tour="forecast-chart">
                                <ComponentErrorBoundary name="Hourly Forecast">
                                  <ForecastChart forecast={forecast} showNext={24} />
                                </ComponentErrorBoundary>
                              </Card>
                            </motion.div>
                          )}

                          {/* Daily Summary */}
                          {forecast.length > 0 && (
                            <motion.div
                              className="md:col-span-2 lg:col-span-3"
                              variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 220, damping: 22 } } }}
                            >
                              <ComponentErrorBoundary name="Daily Forecast">
                                <ForecastSummary forecast={forecast} />
                              </ComponentErrorBoundary>
                            </motion.div>
                          )}
                        </motion.div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
            </div>
          </main>
        </PullToRefresh >


        {/* Location Mismatch Prompt */}
        <LocationMismatchPrompt
          currentPostcode={postcode}
          onUpdate={(newPostcode) => {
            setPostcode(newPostcode);
            toast.success("Location updated to match your current region");
          }}
        />

        <YearWrapped
          open={showYearWrapped}
          onOpenChange={setShowYearWrapped}
          year={wrappedYear}
        />
      </div >
    </TooltipProvider >
  );
};
function getSmartTip(current: number, forecast: ForecastData[]): string {
  if (!forecast || forecast.length < 12) {
    return "Check back later for a more tailored energy tip.";
  }

  // Filter for next 12 hours (approx 24 slots)
  const now = new Date();
  const future = forecast.filter(f => new Date(f.from) > now).slice(0, 24);

  if (future.length === 0) return "Keep an eye on your energy usage today.";

  const avg = future.reduce((acc, f) => acc + f.intensity.forecast, 0) / future.length;
  const min = future.reduce((min, f) => f.intensity.forecast < min.intensity.forecast ? f : min, future[0]);
  const max = future.reduce((max, f) => f.intensity.forecast > max.intensity.forecast ? f : max, future[0]);

  // Pre-check: If current intensity is already very low, don't tell them to wait.
  // 50g is roughly the "Very Low" threshold.
  if (current <= 50) {
    return "Carbon intensity is excellent right now! Perfect time to charge or run appliances.";
  }

  // Scenario 1: Currently much cleaner than average (Good time!)
  if (current < avg - 30) {
    return `It's much greener than usual right now. Good time to use energy before levels rise.`;
  }

  // Scenario 2: High now, but significantly better later
  // Only suggest waiting if:
  // 1. Savings are substantial (> 50g difference)
  // 2. AND we are not already in a "Low" period (< 100g)
  if (current > min.intensity.forecast + 50 && current > 100) {
    const bestTime = new Date(min.from).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    return `Intensity is relatively high. If you can, wait until around ${bestTime} for much cleaner energy.`;
  }

  // Scenario 3: Generally Low all day
  if (avg < 100) {
    return "Great news! The grid is running very green today. Feel free to use energy as needed.";
  }

  // Scenario 4: Generally High all day
  if (avg > 250) {
    return "Carbon intensity is high throughout the day. Every bit of energy saved counts today!";
  }

  // Default: Stable/Moderate
  return "Carbon levels are stable. Check the 'Best Time' chart for specific charging slots.";
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {/* Segmented Control tablist skeleton */}
      <div className="flex p-1 bg-muted rounded-lg w-full h-10 mb-2">
        <Skeleton className="flex-1 h-full rounded-md" />
        <Skeleton className="flex-1 h-full rounded-md ml-2" />
        <Skeleton className="flex-1 h-full rounded-md ml-2" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Energy Insights Skeleton */}
        <Card className="p-5 shadow-lg flex flex-col justify-between h-[220px]">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="w-8 h-8 rounded-full" />
              <Skeleton className="h-5 w-1/3 rounded-md" />
            </div>
            <div className="space-y-2 pt-2">
              <Skeleton className="h-4 w-full rounded-md" />
              <Skeleton className="h-4 w-5/6 rounded-md" />
              <Skeleton className="h-4 w-2/3 rounded-md" />
            </div>
          </div>
          <Skeleton className="h-10 w-full rounded-xl mt-4" />
        </Card>

        {/* Generation Mix Skeleton */}
        <Card className="p-5 shadow-lg md:col-span-2 lg:col-span-2 flex flex-col justify-between h-[220px]">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-1/4 rounded-md" />
              <Skeleton className="h-4 w-12 rounded-md" />
            </div>
            {/* Simulated bars */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-16 rounded-md" />
                <Skeleton className="h-3 flex-1 rounded-full" />
                <Skeleton className="h-4 w-8 rounded-md" />
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-16 rounded-md" />
                <Skeleton className="h-3 flex-1 rounded-full" />
                <Skeleton className="h-4 w-8 rounded-md" />
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-16 rounded-md" />
                <Skeleton className="h-3 flex-1 rounded-full" />
                <Skeleton className="h-4 w-8 rounded-md" />
              </div>
            </div>
          </div>
        </Card>

        {/* Best time Skeleton */}
        <Card className="p-5 shadow-lg flex flex-col justify-between h-[150px]">
          <div className="space-y-3">
            <Skeleton className="h-4 w-1/2 rounded-md" />
            <Skeleton className="h-8 w-2/3 rounded-md" />
          </div>
          <Skeleton className="h-3 w-1/3 rounded-md" />
        </Card>

        {/* Worst time Skeleton */}
        <Card className="p-5 shadow-lg flex flex-col justify-between h-[150px]">
          <div className="space-y-3">
            <Skeleton className="h-4 w-1/2 rounded-md" />
            <Skeleton className="h-8 w-2/3 rounded-md" />
          </div>
          <Skeleton className="h-3 w-1/3 rounded-md" />
        </Card>

        {/* Forecast Chart Skeleton */}
        <Card className="p-5 shadow-lg md:col-span-2 lg:col-span-3 h-[280px] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-1/6 rounded-md" />
            <div className="flex gap-2">
              <Skeleton className="h-7 w-12 rounded-md" />
              <Skeleton className="h-7 w-12 rounded-md" />
            </div>
          </div>
          {/* Simulated chart bars */}
          <div className="flex items-end justify-between h-40 px-2 pt-4">
            <Skeleton className="h-[20%] w-6 rounded-t-sm" />
            <Skeleton className="h-[40%] w-6 rounded-t-sm" />
            <Skeleton className="h-[60%] w-6 rounded-t-sm" />
            <Skeleton className="h-[80%] w-6 rounded-t-sm" />
            <Skeleton className="h-[90%] w-6 rounded-t-sm" />
            <Skeleton className="h-[70%] w-6 rounded-t-sm" />
            <Skeleton className="h-[50%] w-6 rounded-t-sm" />
            <Skeleton className="h-[30%] w-6 rounded-t-sm" />
            <Skeleton className="h-[20%] w-6 rounded-t-sm" />
            <Skeleton className="h-[40%] w-6 rounded-t-sm" />
            <Skeleton className="h-[60%] w-6 rounded-t-sm" />
            <Skeleton className="h-[75%] w-6 rounded-t-sm" />
          </div>
        </Card>
      </div>
    </div>
  );
}

export default Index;