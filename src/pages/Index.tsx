import { useState, useEffect } from 'react';
import { Settings, RefreshCw, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { IntensityScene } from '@/components/IntensityScene';
import { GenerationMixBar } from '@/components/GenerationMixBar';
import { ForecastChart } from '@/components/ForecastChart';
import { RegionSelector } from '@/components/RegionSelector';
import { NotificationSettings } from '@/components/NotificationSettings';
import { BestTimeCard } from '@/components/BestTimeCard';
import { useCarbonData } from '@/hooks/useCarbonData';
import { getIntensityTextColor } from '@/lib/carbonApi';

const Index = () => {
  const [postcode, setPostcode] = useState(() => {
    return localStorage.getItem('gridgreen-postcode') ?? 'SW';
  });

  const { 
    intensity, 
    index, 
    region, 
    generationMix, 
    forecast, 
    isLoading, 
    refetch 
  } = useCarbonData(postcode);

  // Save postcode preference
  useEffect(() => {
    localStorage.setItem('gridgreen-postcode', postcode);
  }, [postcode]);

  const handleRefresh = () => {
    refetch();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header with scene */}
      <div className="relative">
        {/* Animated scene */}
        <IntensityScene intensity={intensity} index={index} />
        
        {/* Overlay header */}
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between">
          <RegionSelector value={postcode} onChange={setPostcode} />
          
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleRefresh}
              disabled={isLoading}
              className="bg-card/60 backdrop-blur-sm hover:bg-card/80"
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            
            <Sheet>
              <SheetTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="bg-card/60 backdrop-blur-sm hover:bg-card/80"
                >
                  <Settings className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent className="bg-card border-border">
                <NotificationSettings />
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Current intensity display */}
        <div className="absolute bottom-8 left-0 right-0 text-center">
          <p className="text-card/80 text-sm font-medium uppercase tracking-wide mb-1">
            {isLoading ? 'Loading...' : region || 'Select a region'}
          </p>
          <div className="flex items-baseline justify-center gap-2">
            {isLoading ? (
              <RefreshCw className="w-10 h-10 text-card animate-spin" />
            ) : (
              <>
                <span className="text-6xl font-bold text-card drop-shadow-lg">
                  {intensity}
                </span>
                <span className="text-card/80 text-lg">gCO₂/kWh</span>
              </>
            )}
          </div>
          {!isLoading && (
            <p className="text-lg font-semibold capitalize mt-1 text-card">
              {index}
            </p>
          )}
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