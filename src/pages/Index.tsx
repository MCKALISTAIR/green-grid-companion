import { useState } from 'react';
import { RefreshCw, Zap, Info, Leaf, Activity, MapPin, ChevronDown, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
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
import { useOctopusEnergy } from '@/hooks/useOctopusEnergy';
import { useNotifications } from '@/hooks/useNotifications';
import { toast } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DEFINITIONS } from '@/lib/definitions';
import { PullToRefresh } from '@/components/PullToRefresh';
import { useSavedLocations } from '@/hooks/useSavedLocations';
import type { ForecastData } from '@/lib/carbonApi';
import { ErrorState } from '@/components/ErrorState';
import { ComponentErrorBoundary } from '@/components/ComponentErrorBoundary';
import { useGridDemand } from '@/hooks/useGridDemand';
import { WeatherWidget } from '@/components/WeatherWidget';
import { GreenerNightsCard } from '@/components/GreenerNightsCard';
import { AnimatedIntensity } from '@/components/AnimatedIntensity';
import { EnergyFactBubble } from '@/components/scene/EnergyFactBubble';
import { StaleDataBadge } from '@/components/StaleDataBadge';
import { LocationMismatchPrompt } from '@/components/LocationMismatchPrompt';
import { YearWrapped } from '@/components/YearWrapped';
import { Skeleton } from '@/components/ui/skeleton';

import { useAppLocation } from '@/contexts/LocationContext';
import { useYearWrappedAutoShow } from '@/hooks/useYearWrappedAutoShow';
import { useEnvironmentalConditions } from '@/hooks/useEnvironmentalConditions';
import { useIndexPageEffects } from '@/hooks/useIndexPageEffects';
import { useThrottledRefetch } from '@/hooks/useThrottledRefetch';

const Index = () => {
  const { postcode, setPostcode } = useAppLocation();
  const [viewMode, setViewMode] = useState<'intensity' | 'footprint' | 'demand'>('intensity');
  const { showYearWrapped, setShowYearWrapped, wrappedYear } = useYearWrappedAutoShow();
  const { selection } = useHaptics();

  const { scheduleGreenAlerts, scheduleDailyForecast, scheduleHighIntensityAlerts, prefs } = useNotifications();
  const { isLinked: isOctopusLinked } = useOctopusEnergy();

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

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const { skyColor } = useEnvironmentalConditions(postcode, intensity);



  return (
    <TooltipProvider>
      <div
        className="min-h-screen bg-background transition-colors duration-1000"
        style={{ background: skyColor }}
      >
        <PullToRefresh onRefresh={handleRefresh} disabled={isLoading}>
          <main className="min-h-[100dvh] flex flex-col animate-in fade-in duration-700 lg:pb-0">
            <h1 className="sr-only">Carbon Intensity Dashboard</h1>
            {/* Header with scene */}
            {/* Header with scene */}
            <div className="relative w-full h-[60vh] min-h-[400px]">
              {/* Animated scene */}
              <ComponentErrorBoundary name="Scene">
                <IntensityScene intensity={intensity} index={index} generationMix={generationMix} className="h-full" style={{ height: '100%' }} />

                {/* Desktop Region Selector - Top Left */}
                <div className="absolute top-6 left-6 z-30 hidden lg:block">
                  <LocationManager
                    value={postcode}
                    onChange={setPostcode}
                    trigger={
                      <button className="flex items-center gap-2 text-white/90 text-sm font-medium uppercase tracking-wide transition-all cursor-pointer bg-black/20 hover:bg-black/30 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 hover:border-white/20 shadow-sm group">
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


              </ComponentErrorBoundary>

              {/* Overlay header - removed, location now in card */}

              {/* Current intensity display - Only show if NOT in demand mode (DemandView has its own header) */}
              {viewMode !== 'demand' && (
                <div className="absolute top-[calc(max(env(safe-area-inset-top),59px)+1rem)] left-1/2 -translate-x-1/2 text-center w-auto max-w-[90%] z-10"
                  data-tour="intensity-gauge">
                  <div className="bg-white/15 backdrop-blur-md rounded-2xl p-3 shadow-sm border border-white/20">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <div className="lg:hidden">
                        <LocationManager
                          value={postcode}
                          onChange={setPostcode}
                          trigger={
                            <button className="flex items-center gap-1.5 text-card/90 text-sm font-medium uppercase tracking-wide hover:text-card transition-colors cursor-pointer group">
                              <MapPin className="w-3.5 h-3.5" />
                              <span>{isLoading ? 'Loading...' : region || 'Select location'}</span>
                              {isBackgroundFetching ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin opacity-75" />
                              ) : (
                                <ChevronDown className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity" />
                              )}
                            </button>
                          }
                        />
                      </div>
                      {!isLoading && region && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full p-0 hover:bg-transparent" aria-label="More info about Carbon Intensity">
                              <Info className="w-3.5 h-3.5 text-card/70 cursor-help" aria-hidden="true" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[240px] p-3 text-xs bg-card border-border backdrop-blur-xl">
                            <p>{DEFINITIONS['Carbon Intensity']}</p>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>

                    <div className="flex items-baseline justify-center gap-2">
                      {isLoading ? (
                        <RefreshCw className="w-10 h-10 text-card animate-spin" aria-label="Loading data" />
                      ) : isError ? (
                        <div className="flex flex-col items-center py-1">
                          <AlertTriangle className="w-8 h-8 text-white/95 animate-pulse mb-1" />
                          <span className="text-sm font-semibold text-white/90 uppercase tracking-wider">Offline</span>
                        </div>
                      ) : (
                        <>
                          <AnimatedIntensity
                            value={intensity}
                            previousValue={previousIntensity}
                          />
                          <div className="flex items-center gap-1">
                            <span className="text-card/90 text-lg font-medium">gCO₂/kWh</span>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full p-0 hover:bg-transparent" aria-label="More info about gCO2/kWh">
                                  <Info className="w-4 h-4 text-card/70 cursor-help" aria-hidden="true" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[240px] p-3 text-xs bg-card border-border backdrop-blur-xl">
                                <p>{DEFINITIONS['gCO2/kWh']}</p>
                              </PopoverContent>
                            </Popover>
                          </div>
                        </>
                      )}
                    </div>
                    {!isLoading && !isError && (
                      <div className="inline-block mt-2 px-3 py-1 rounded-full bg-white/40 shadow-sm">
                        <p className="text-lg font-semibold capitalize text-card">
                          {index}
                        </p>
                      </div>
                    )}
                    {!isLoading && lastUpdated && (
                      <div className="flex flex-col items-center mt-2 gap-1.5">
                        <div className="flex items-center gap-1.5 text-xs text-card/80 font-medium bg-white/20 px-2 py-0.5 rounded-md">
                          <span>Updated {new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          <span>•</span>
                          <span>
                            {(() => {
                              // Prefer the explicit 'valid to' time from the API
                              // This handles misses/variable intervals (e.g. 1hr vs 30m) gracefully
                              if (nextUpdate) {
                                const next = new Date(nextUpdate);
                                // If the API says data is valid until X, and we are past X, 
                                // it means the next update is late.
                                const now = new Date();
                                if (now > next) {
                                  // If we are past the 'valid to' time, the update is late or pending.
                                  // Don't project an hour into the future, just say it's due.
                                  return 'Update Due';
                                }
                                return `Next ${next.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} `;
                              }

                              // Fallback (shouldn't really be hit if nextUpdate is present)
                              const next = getNextUpdate(lastUpdated);
                              if (!next) return '';
                              return `Next ${next.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} `;
                            })()}
                          </span>

                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-4 w-4 rounded-full p-0 hover:bg-transparent ml-0.5" aria-label="More information about data refresh schedule">
                                <Info className="w-3 h-3 text-card/70" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[260px] p-3 text-xs bg-card border-border backdrop-blur-xl">
                              <p className="font-semibold mb-1">Data Refresh Schedule</p>
                              <p>Data is sourced directly from the National Grid ESO. They publish new carbon intensity figures every <span className="font-bold">30 minutes</span>.</p>
                            </PopoverContent>
                          </Popover>
                        </div>
                        <StaleDataBadge lastUpdated={lastUpdated} />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Content cards */}
            <div className="flex-1 px-4 pt-6 pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-6 space-y-4 mt-0 relative z-10 bg-background lg:max-w-7xl lg:mx-auto w-full lg:rounded-t-3xl lg:shadow-xl lg:mt-0 lg:pt-8 lg:space-y-6">

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

              {/* View Toggle - Always show all views */}

              {/* Energy Commentary Quote — constrained so it can't push into the tabs row */}
              <div className="px-2 pb-3 pt-1">
                <EnergyFactBubble
                  intensity={intensity}
                  generationMix={generationMix}
                  variant="plain"
                  className="mx-auto max-w-prose text-center"
                />
              </div>

              {isError ? (
                <div className="py-8 bg-card rounded-2xl border border-border shadow-lg">
                  <ErrorState
                    title={getErrorInfo(error).title}
                    description={getErrorInfo(error).description}
                    steps={getErrorInfo(error).steps}
                    retry={refetch}
                  />
                </div>
              ) : isLoading && forecast.length === 0 ? (
                <DashboardSkeleton />
              ) : (
                <>
                  <div 
                    role="tablist" 
                    aria-label="Dashboard Views" 
                    onKeyDown={handleKeyDown}
                    className="relative flex p-1 bg-muted rounded-lg overflow-hidden select-none"
                  >
                    <button
                      role="tab"
                      tabIndex={viewMode === 'intensity' ? 0 : -1}
                      aria-selected={viewMode === 'intensity'}
                      aria-controls="dashboard-tab-content"
                      className={`relative flex-1 min-w-[100px] h-8 rounded-md text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 z-10 ${
                        viewMode === 'intensity' ? 'text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'
                      }`}
                      onClick={() => { selection(); setViewMode('intensity'); }}
                    >
                      {viewMode === 'intensity' && (
                        <motion.div
                          layoutId="dashboard-view-pill"
                          className="absolute inset-0 bg-background shadow-sm rounded-md"
                          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        />
                      )}
                      <span className="relative z-20 flex items-center justify-center h-full">
                        <Activity className="w-4 h-4 mr-2" />
                        Intensity
                      </span>
                    </button>

                    <button
                      role="tab"
                      tabIndex={viewMode === 'demand' ? 0 : -1}
                      aria-selected={viewMode === 'demand'}
                      aria-controls="dashboard-tab-content"
                      className={`relative flex-1 min-w-[100px] h-8 rounded-md text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 z-10 ${
                        viewMode === 'demand' ? 'text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'
                      }`}
                      onClick={() => { selection(); setViewMode('demand'); }}
                    >
                      {viewMode === 'demand' && (
                        <motion.div
                          layoutId="dashboard-view-pill"
                          className="absolute inset-0 bg-background shadow-sm rounded-md"
                          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        />
                      )}
                      <span className="relative z-20 flex items-center justify-center h-full">
                        <Zap className="w-4 h-4 mr-2" />
                        Demand
                      </span>
                    </button>

                    <button
                      role="tab"
                      tabIndex={viewMode === 'footprint' ? 0 : -1}
                      aria-selected={viewMode === 'footprint'}
                      aria-controls="dashboard-tab-content"
                      className={`relative flex-1 min-w-[100px] h-8 rounded-md text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 z-10 ${
                        viewMode === 'footprint' ? 'text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'
                      }`}
                      onClick={() => { selection(); setViewMode('footprint'); }}
                      data-tour="view-footprint"
                    >
                      {viewMode === 'footprint' && (
                        <motion.div
                          layoutId="dashboard-view-pill"
                          className="absolute inset-0 bg-background shadow-sm rounded-md"
                          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        />
                      )}
                      <span className="relative z-20 flex items-center justify-center h-full">
                        <Leaf className="w-4 h-4 mr-2" />
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
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      className="w-full overflow-auto max-h-[calc(100vh-24rem)] pb-20"
                    >
                      {viewMode === 'demand' ? (
                        <DemandView />
                      ) : viewMode === 'footprint' ? (
                        <FootprintView />
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {/* Energy Insights */}
                          <Card className="p-4 shadow-lg bg-accent/30 border-accent/50 md:col-span-2 lg:col-span-1 lg:row-span-2 flex flex-col">
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

                          {/* Generation Mix */}
                          <Card className="p-4 shadow-lg md:col-span-2 lg:col-span-2 flex flex-col justify-center glass-card" data-tour="generation-mix">
                            <ComponentErrorBoundary name="Generation Mix">
                              <div className="flex items-center justify-between mb-2">
                                <span className="sr-only">Generation Mix</span>
                                <StaleDataBadge lastUpdated={lastUpdated} />
                              </div>
                              <GenerationMixBar mix={generationMix} frequency={gridFrequency} />
                            </ComponentErrorBoundary>
                          </Card>

                          {/* Best time */}
                          {forecast.length > 0 && (
                            <ComponentErrorBoundary name="Best Time">
                              <BestTimeSlot forecast={forecast} />
                            </ComponentErrorBoundary>
                          )}

                          {/* Worst time */}
                          {forecast.length > 0 && (
                            <ComponentErrorBoundary name="Worst Time">
                              <WorstTimeSlot forecast={forecast} />
                            </ComponentErrorBoundary>
                          )}

                          {/* Hourly Forecast */}
                          {forecast.length > 0 && (
                            <Card className="p-4 shadow-lg md:col-span-2 lg:col-span-3 glass-card" data-tour="forecast-chart">
                              <ComponentErrorBoundary name="Hourly Forecast">
                                <ForecastChart forecast={forecast} showNext={24} />
                              </ComponentErrorBoundary>
                            </Card>
                          )}

                          {/* Daily Summary */}
                          {forecast.length > 0 && (
                            <div className="md:col-span-2 lg:col-span-3">
                              <ComponentErrorBoundary name="Daily Forecast">
                                <ForecastSummary forecast={forecast} />
                              </ComponentErrorBoundary>
                            </div>
                          )}
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </>
              )}
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