import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, RefreshCw, Zap, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { IntensityScene } from '@/components/IntensityScene';
import { GenerationMixBar } from '@/components/GenerationMixBar';
import { ForecastChart } from '@/components/ForecastChart';
import { ForecastSummary } from '@/components/ForecastSummary';
import { RegionSelector } from '@/components/RegionSelector';
import { NotificationSettings } from '@/components/NotificationSettings';
import { BestTimeCard } from '@/components/BestTimeCard';
import { useCarbonData } from '@/hooks/useCarbonData';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DEFINITIONS } from '@/lib/definitions';

const Index = () => {
  const navigate = useNavigate();
  const [postcode, setPostcode] = useState(() => {
    return localStorage.getItem('gridgreen-postcode') || '';
  });

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

  // Save postcode preference
  useEffect(() => {
    if (postcode) {
      localStorage.setItem('gridgreen-postcode', postcode);
    }
  }, [postcode]);

  const handleRefresh = () => {
    refetch();
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen min-h-[100dvh] bg-background flex flex-col animate-in fade-in duration-700 pb-[env(safe-area-inset-bottom)]">
        {/* Header with scene */}
        <div className="relative">
          {/* Animated scene */}
          <IntensityScene intensity={intensity} index={index} />

          {/* Overlay header */}
          <div className="absolute top-0 left-0 right-0 p-4 pt-[max(1rem,env(safe-area-inset-top))] flex items-center justify-between z-20">
            <RegionSelector value={postcode} onChange={setPostcode} />

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefresh}
                disabled={isLoading}
                className="bg-card/60 backdrop-blur-sm hover:bg-card/80"
                aria-label="Refresh data"
              >
                <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
              </Button>

              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="bg-card/60 backdrop-blur-sm hover:bg-card/80"
                    aria-label="Notification settings"
                  >
                    <Settings className="w-5 h-5" aria-hidden="true" />
                  </Button>
                </SheetTrigger>
                <SheetContent className="bg-card border-border">
                  <NotificationSettings />
                </SheetContent>
              </Sheet>
            </div>
          </div>

          {/* Current intensity display */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-center w-auto max-w-[90%]">
            <div className="bg-white/30 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-white/20">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <p className="text-card/90 text-sm font-medium uppercase tracking-wide">
                  {isLoading ? 'Loading...' : region || 'Select a region'}
                </p>
                {!isLoading && region && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full p-0 hover:bg-transparent" aria-label="More info about Carbon Intensity">
                        <Info className="w-3.5 h-3.5 text-card/70 cursor-help" aria-hidden="true" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="w-[200px] text-xs">{DEFINITIONS['Carbon Intensity']}</p>
                    </TooltipContent>
                  </Tooltip>
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
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full p-0 hover:bg-transparent" aria-label="More info about gCO2/kWh">
                            <Info className="w-4 h-4 text-card/70 cursor-help" aria-hidden="true" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="w-[200px] text-xs">{DEFINITIONS['gCO2/kWh']}</p>
                        </TooltipContent>
                      </Tooltip>
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
        </div>

        {/* Content cards */}
        <div className="flex-1 px-4 py-6 space-y-4 -mt-4 relative z-10">
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

          {/* Tip of the day */}
          <Card className="p-4 shadow-lg bg-accent/30 border-accent/50">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                <Zap className="w-4 h-4 text-accent-foreground" />
              </div>
              <div>
                <h3 className="font-medium text-foreground">Tip of the day</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {getTipForIndex(index)}
                </p>
              </div>
            </div>
          </Card>

          {/* Footer spacing */}
          <div className="h-4" />
        </div>
      </div>
    </TooltipProvider>
  );
};

function getTipForIndex(index: string): string {
  const tips: Record<string, string[]> = {
    'very low': [
      "Perfect time to charge your EV or run energy-intensive appliances!",
      "Grid is running clean - great time for laundry or dishwasher.",
      "Renewable energy is abundant right now. Use it while you can!",
    ],
    'low': [
      "Good time to use electricity - carbon intensity is below average.",
      "Consider starting any scheduled charges now.",
      "The grid is relatively clean - a good time for everyday tasks.",
    ],
    'moderate': [
      "Average carbon levels - consider delaying non-essential usage.",
      "Check the forecast for a better time to run heavy appliances.",
      "If possible, wait a few hours for cleaner energy.",
    ],
    'high': [
      "High carbon period - best to reduce electricity usage if possible.",
      "Avoid charging EVs or running large appliances now.",
      "Check when the next low period is and schedule tasks then.",
    ],
    'very high': [
      "Very high carbon intensity - minimize electricity use.",
      "Gas and coal are dominating the grid right now.",
      "The best time to save energy is now - every kWh counts!",
    ],
  };

  const indexTips = tips[index] || tips['moderate'];
  return indexTips[Math.floor(Math.random() * indexTips.length)];
}

export default Index;