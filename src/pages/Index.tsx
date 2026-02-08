import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Zap, Info, Leaf, Activity, MapPin, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { IntensityScene } from '@/components/IntensityScene';
import { useTimeOfDay } from '@/hooks/useTimeOfDay';
import { useWeatherData } from '@/hooks/useWeatherData';
import { useSceneDirector } from '@/hooks/useSceneDirector';
import { getSkyTopColor, getCarbonIndex } from '@/lib/sceneUtils';
import { getErrorInfo } from "@/lib/errorUtils";
import { GenerationMixBar } from '@/components/GenerationMixBar';
import { ForecastChart } from '@/components/ForecastChart';
import { ForecastSummary } from '@/components/ForecastSummary';
import { LocationManager } from '@/components/LocationManager';
import { BestTimeSlot, WorstTimeSlot } from '@/components/BestTimeCard';
import { FootprintView } from '@/components/FootprintView';
import { DemandView } from '@/components/DemandView';
import { useCarbonData } from '@/hooks/useCarbonData';
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
import { logger } from '@/lib/logger';
import { LocationMismatchPrompt } from '@/components/LocationMismatchPrompt';
import { YearWrapped } from '@/components/YearWrapped';

import { useProductTour } from '@/hooks/useProductTour';

// Check if Year Wrapped should auto-show (December, once per year)
function shouldShowYearWrapped(): { shouldShow: boolean; year: number } {
  const now = new Date();
  const currentMonth = now.getMonth(); // 0-indexed, December = 11
  const currentYear = now.getFullYear();

  // Only show in December
  if (currentMonth !== 11) {
    return { shouldShow: false, year: currentYear };
  }

  // Check if already shown this year
  const storageKey = `year-wrapped-auto-shown-${currentYear}`;
  const alreadyShown = localStorage.getItem(storageKey) === 'true';

  return { shouldShow: !alreadyShown, year: currentYear };
}

function markYearWrappedShown(year: number) {
  localStorage.setItem(`year-wrapped-auto-shown-${year}`, 'true');
}

const Index = () => {
  const navigate = useNavigate();
  const [postcode, setPostcode] = useState(() => {
    return localStorage.getItem('gridgreen-postcode') || '';
  });
  const [viewMode, setViewMode] = useState<'intensity' | 'footprint' | 'demand'>('intensity');
  const [showYearWrapped, setShowYearWrapped] = useState(false);
  const [wrappedYear, setWrappedYear] = useState(new Date().getFullYear());

  const { scheduleGreenAlerts, scheduleDailyForecast, scheduleHighIntensityAlerts, prefs } = useNotifications();
  const { isLinked: isOctopusLinked } = useOctopusEnergy();

  // Auto-show Year Wrapped in December (once per year)
  useEffect(() => {
    const { shouldShow, year } = shouldShowYearWrapped();
    if (shouldShow) {
      // Delay slightly so the main UI loads first
      const timer = setTimeout(() => {
        setWrappedYear(year);
        setShowYearWrapped(true);
        markYearWrappedShown(year);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    if (!postcode) {
      navigate('/onboarding');
    }
  }, [postcode, navigate]);

  const {
    intensity,
    previousIntensity,
    index,
    region,
    generationMix,
    forecast,
    lastUpdated,
    isLoading,
    isError,
    error,
    refetch,
    getNextUpdate,
    nextUpdate
  } = useCarbonData(postcode);

  const { frequency: gridFrequency } = useGridDemand();

  // Auto-schedule notifications when forecast updates
  useEffect(() => {
    if (forecast && forecast.length > 0) {
      scheduleGreenAlerts(forecast);
      scheduleDailyForecast(forecast);
      scheduleHighIntensityAlerts(forecast);
    }
  }, [forecast, scheduleGreenAlerts, scheduleDailyForecast, scheduleHighIntensityAlerts]);

  // Save postcode preference
  useEffect(() => {
    if (postcode) {
      localStorage.setItem('gridgreen-postcode', postcode);
    }
  }, [postcode]);

  // Start Tour
  const { startTour } = useProductTour();
  useEffect(() => {
    if (!isLoading && intensity) {
      startTour();
    }
  }, [isLoading, intensity, startTour]);

  // Periodic stale data check - ensures data refreshes even if intervals miss
  useEffect(() => {
    const checkAndRefresh = () => {
      if (lastUpdated) {
        const nextExpected = new Date(lastUpdated).getTime() + (30 * 60 * 1000);
        const now = Date.now();

        // If we're more than 2 minutes past expected update, force refresh
        if (now > nextExpected + (2 * 60 * 1000)) {
          logger.info('Carbon data appears stale, triggering refresh');
          refetch();
        }
      }
    };

    // Check every minute
    const intervalId = setInterval(checkAndRefresh, 60 * 1000);

    // Also check immediately on mount
    checkAndRefresh();

    return () => clearInterval(intervalId);
  }, [lastUpdated]); // Only depend on lastUpdated, not refetch (prevents infinite loop)



  const handleRefresh = async () => {
    await refetch();
    // Simple feedback logic:
    // If the data hasn't changed (checked via lastUpdated timestamp comparison or just assume usually valid),
    // and the last update was recent, we inform the user.
    // For now, simpler approach:

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

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const { timeOfDay: realTimeOfDay, isNight: realIsNight } = useTimeOfDay();
  const { weather: realWeather } = useWeatherData(postcode);
  const { active: isDirectorMode, overrides } = useSceneDirector();

  // Compute overrides
  const timeOfDay = (isDirectorMode && overrides.timeOfDay) ? overrides.timeOfDay : realTimeOfDay;

  const derivedIntensity = (isDirectorMode && overrides.intensity !== undefined)
    ? overrides.intensity
    : intensity;

  const weather = (isDirectorMode && overrides.weather)
    ? { ...realWeather, ...overrides.weather }
    : realWeather;

  // Derive cleanliness from intensity (reused formula)
  const cleanliness = Math.max(0, Math.min(1, 1 - (derivedIntensity - 50) / 300));

  // Use the effective intensity for the effective index string
  const effectiveIndex = getCarbonIndex(derivedIntensity);

  const skyColor = getSkyTopColor(effectiveIndex, timeOfDay, cleanliness, weather);

  if (isError) {
    const errorInfo = getErrorInfo(error);
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex-1 flex items-center justify-center p-4">
          <ErrorState
            title={errorInfo.title}
            description={errorInfo.description}
            steps={errorInfo.steps}
            retry={refetch}
            fullScreen
          />
        </div>
      </div>
    );
  }

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
            <div className="relative w-full h-[40vh] min-h-[320px]">
              {/* Animated scene */}
              <ComponentErrorBoundary name="Scene">
                <IntensityScene intensity={intensity} index={index} generationMix={generationMix} className="h-full" />

                {/* Desktop Region Selector - Top Left */}
                <div className="absolute top-6 left-6 z-30 hidden lg:block">
                  <LocationManager
                    value={postcode}
                    onChange={setPostcode}
                    trigger={
                      <button className="flex items-center gap-2 text-white/90 text-sm font-medium uppercase tracking-wide transition-all cursor-pointer bg-black/20 hover:bg-black/30 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 hover:border-white/20 shadow-sm group">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{isLoading ? 'Loading...' : region || 'Select location'}</span>
                        <ChevronDown className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity" />
                      </button>
                    }
                  />
                </div>


              </ComponentErrorBoundary>

              {/* Overlay header - removed, location now in card */}

              {/* Current intensity display - Only show if NOT in demand mode (DemandView has its own header) */}
              {viewMode !== 'demand' && (
                <div className="absolute top-[calc(env(safe-area-inset-top)+1rem)] left-1/2 -translate-x-1/2 text-center w-auto max-w-[90%] z-10"
                  data-tour="intensity-gauge">
                  <div className="bg-white/30 backdrop-blur-md rounded-2xl p-3 shadow-sm border border-white/20">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <div className="lg:hidden">
                        <LocationManager
                          value={postcode}
                          onChange={setPostcode}
                          trigger={
                            <button className="flex items-center gap-1.5 text-card/90 text-sm font-medium uppercase tracking-wide hover:text-card transition-colors cursor-pointer group">
                              <MapPin className="w-3.5 h-3.5" />
                              <span>{isLoading ? 'Loading...' : region || 'Select location'}</span>
                              <ChevronDown className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity" />
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
                    {!isLoading && (
                      <div className="inline-block mt-2 px-3 py-1 rounded-full bg-white/40 shadow-sm">
                        <p className="text-lg font-semibold capitalize text-card">
                          {index}
                        </p>
                      </div>
                    )}
                    {!isLoading && lastUpdated && (
                      <div className="flex flex-col items-center mt-2">
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
                              <Button variant="ghost" size="icon" className="h-4 w-4 rounded-full p-0 hover:bg-transparent ml-0.5">
                                <Info className="w-3 h-3 text-card/70" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[260px] p-3 text-xs bg-card border-border backdrop-blur-xl">
                              <p className="font-semibold mb-1">Data Refresh Schedule</p>
                              <p>Data is sourced directly from the National Grid ESO. They publish new carbon intensity figures every <span className="font-bold">30 minutes</span>.</p>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Content cards */}
            <div className="flex-1 px-4 pt-6 pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-6 space-y-4 -mt-4 relative z-10 bg-background lg:max-w-7xl lg:mx-auto w-full lg:rounded-t-3xl lg:shadow-xl lg:mt-0 lg:space-y-6">

              {/* View Toggle - Always show all views */}

              {/* Energy Commentary Quote */}
              <div className="px-2 pb-2">
                <EnergyFactBubble
                  intensity={intensity}
                  generationMix={generationMix}
                  variant="plain"
                  className="flex justify-center"
                />
              </div>

              <div className="flex gap-2 p-1 bg-muted rounded-lg overflow-x-auto scrollbar-none">
                <Button
                  variant={viewMode === 'intensity' ? 'default' : 'ghost'}
                  size="sm"
                  className="flex-1 min-w-[100px]"
                  onClick={() => setViewMode('intensity')}
                >
                  <Activity className="w-4 h-4 mr-2" />
                  Intensity
                </Button>
                <Button
                  variant={viewMode === 'demand' ? 'default' : 'ghost'}
                  size="sm"
                  className="flex-1 min-w-[100px]"
                  onClick={() => setViewMode('demand')}
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Demand
                </Button>
                <Button
                  variant={viewMode === 'footprint' ? 'default' : 'ghost'}
                  size="sm"
                  className="flex-1 min-w-[100px]"
                  onClick={() => setViewMode('footprint')}
                  data-tour="view-footprint"
                >
                  <Leaf className="w-4 h-4 mr-2" />
                  Footprint
                </Button>
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
                      <Card className="p-4 shadow-lg bg-accent/30 border-accent/50">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                            <Zap className="w-4 h-4 text-accent-foreground" />
                          </div>
                          <div>
                            <h3 className="font-medium text-foreground">Energy Insights</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              {getSmartTip(intensity, forecast)}
                            </p>



                            {prefs.showWeatherInInsights && (
                              <div className="mt-3">
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
                          </div>
                        </div>
                      </Card>

                      {/* Best time - under Energy Insights */}
                      {forecast.length > 0 && (
                        <ComponentErrorBoundary name="Best Time">
                          <BestTimeSlot forecast={forecast} />
                        </ComponentErrorBoundary>
                      )}

                      {/* Generation Mix */}
                      <Card className="p-4 shadow-lg" data-tour="generation-mix">
                        <ComponentErrorBoundary name="Generation Mix">
                          <GenerationMixBar mix={generationMix} frequency={gridFrequency} />
                        </ComponentErrorBoundary>
                      </Card>

                      {/* Worst time - under Generation Mix */}
                      {forecast.length > 0 && (
                        <ComponentErrorBoundary name="Worst Time">
                          <WorstTimeSlot forecast={forecast} />
                        </ComponentErrorBoundary>
                      )}

                      {/* Hourly Forecast */}
                      {forecast.length > 0 && (
                        <Card className="p-4 shadow-lg md:col-span-2 lg:col-span-3" data-tour="forecast-chart">
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

export default Index;