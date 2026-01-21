import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, RefreshCw, Zap, Info, Leaf, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { IntensityScene, getSkyStartColor } from '@/components/IntensityScene';
import { GenerationMixBar } from '@/components/GenerationMixBar';
import { ForecastChart } from '@/components/ForecastChart';
import { ForecastSummary } from '@/components/ForecastSummary';
import { RegionSelector } from '@/components/RegionSelector';
import { NotificationSettings } from '@/components/NotificationSettings';
import { BestTimeCard } from '@/components/BestTimeCard';
import { FootprintView } from '@/components/FootprintView';
import { DemandView } from '@/components/DemandView';
import { useCarbonData } from '@/hooks/useCarbonData';
import { useOctopusEnergy } from '@/hooks/useOctopusEnergy';
import { useNotifications } from '@/hooks/useNotifications';
import { useToast } from '@/hooks/use-toast';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DEFINITIONS } from '@/lib/definitions';
import { BottomNav } from '@/components/BottomNav';
import { PullToRefresh } from '@/components/PullToRefresh';
import type { ForecastData } from '@/lib/carbonApi';

const Index = () => {
  const navigate = useNavigate();
  const [postcode, setPostcode] = useState(() => {
    return localStorage.getItem('gridgreen-postcode') || '';
  });
  const [viewMode, setViewMode] = useState<'intensity' | 'footprint' | 'demand'>('intensity');

  const { scheduleGreenAlerts } = useNotifications();
  const { isLinked: isOctopusLinked } = useOctopusEnergy();

  useEffect(() => {
    if (!postcode) {
      navigate('/onboarding');
    }
  }, [postcode, navigate]);

  const {
    intensity,
    index,
    region,
    generationMix,
    forecast,
    lastUpdated,
    isLoading,
    refetch
  } = useCarbonData(postcode);

  // Auto-schedule notifications when forecast updates
  useEffect(() => {
    if (forecast && forecast.length > 0) {
      scheduleGreenAlerts(forecast);
    }
  }, [forecast, scheduleGreenAlerts]);

  // Save postcode preference
  useEffect(() => {
    if (postcode) {
      localStorage.setItem('gridgreen-postcode', postcode);
    }
  }, [postcode]);

  const { toast } = useToast();

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
        toast({
          title: "Up to date",
          description: `Next Grid data update expected around ${timeStr}.`,
          duration: 3000,
        });
      } else {
        // Maybe API IS just lagging, still show 'refreshed'
        toast({
          title: "Checked for updates",
          description: "No new data from National Grid yet.",
          duration: 2000,
        });
      }
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const skyColor = getSkyStartColor(index);

  return (
    <TooltipProvider>
      <div
        className="min-h-screen bg-background transition-colors duration-1000"
        style={{ background: skyColor }}
      >
        <PullToRefresh onRefresh={handleRefresh} disabled={isLoading}>
          <div className="min-h-[100dvh] flex flex-col animate-in fade-in duration-700 pb-[calc(4rem+env(safe-area-inset-bottom))]">
            {/* Header with scene */}
            <div className="relative">
              {/* Animated scene */}
              <IntensityScene intensity={intensity} index={index} />

              {/* Overlay header */}
              <div className="absolute top-0 left-0 right-0 p-4 pt-[max(1rem,env(safe-area-inset-top))] flex items-center justify-between z-30">
                <RegionSelector value={postcode} onChange={setPostcode} />
                {/* Right side buttons removed */}
              </div>

              {/* Current intensity display - Only show if NOT in demand mode (DemandView has its own header) */}
              {viewMode !== 'demand' && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-center w-auto max-w-[90%]">
                  <div className="bg-white/30 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-white/20">
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                      <p className="text-card/90 text-sm font-medium uppercase tracking-wide">
                        {isLoading ? 'Loading...' : region || 'Select a region'}
                      </p>
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
                          <span className="text-6xl font-bold text-card drop-shadow-md">
                            {intensity}
                          </span>
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
                      <p className="text-xs text-card/80 mt-1 font-medium">
                        Updated {new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Content cards */}
            <div className="flex-1 px-4 py-6 space-y-4 -mt-4 relative z-10 bg-background">

              {/* View Toggle - Always show, simplified if no Octopus */}
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
                {isOctopusLinked && (
                  <Button
                    variant={viewMode === 'footprint' ? 'default' : 'ghost'}
                    size="sm"
                    className="flex-1 min-w-[100px]"
                    onClick={() => setViewMode('footprint')}
                  >
                    <Leaf className="w-4 h-4 mr-2" />
                    Footprint
                  </Button>
                )}
              </div>

              {/* Render View */}
              {viewMode === 'demand' ? (
                <DemandView />
              ) : viewMode === 'footprint' && isOctopusLinked ? (
                <FootprintView />
              ) : (
                <>
                  {/* Energy Insights (formerly Tip of the day) */}
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
                      </div>
                    </div>
                  </Card>

                  {/* Generation Mix */}
                  <Card className="p-4 shadow-lg">
                    <GenerationMixBar mix={generationMix} />
                  </Card>

                  {/* Best/Worst Times */}
                  {forecast.length > 0 && (
                    <BestTimeCard forecast={forecast} />
                  )}

                  {/* Hourly Forecast */}
                  {forecast.length > 0 && (
                    <Card className="p-4 shadow-lg">
                      <ForecastChart forecast={forecast} showNext={12} />
                    </Card>
                  )}

                  {/* Daily Summary */}
                  {forecast.length > 0 && (
                    <ForecastSummary forecast={forecast} />
                  )}
                </>
              )}
            </div>
          </div>
        </PullToRefresh>

        <BottomNav onHomeClick={scrollToTop} />
      </div>
    </TooltipProvider>
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

  // Scenario 1: Currently much cleaner than average (Good time!)
  if (current < avg - 30) {
    return `It's much greener than usual right now! Great time to run your appliances before levels rise.`;
  }

  // Scenario 2: High now, but significantly better later
  if (current > min.intensity.forecast + 40) {
    const bestTime = new Date(min.from).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    return `Intensity is high right now. If you can, wait until around ${bestTime} for much cleaner energy.`;
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