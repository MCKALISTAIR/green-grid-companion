import { Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { GenerationMixBar } from '@/components/GenerationMixBar';
import { ForecastChart } from '@/components/ForecastChart';
import { ForecastSummary } from '@/components/ForecastSummary';
import { BestTimeSlot, WorstTimeSlot } from '@/components/BestTimeCard';
import { WeatherWidget } from '@/components/WeatherWidget';
import { GreenerNightsCard } from '@/components/GreenerNightsCard';
import { ComponentErrorBoundary } from '@/components/ComponentErrorBoundary';
import { StaleDataBadge } from '@/components/StaleDataBadge';
import type { ForecastData, GenerationMix } from '@/lib/carbonApi';
import { getSmartTip } from '@/lib/getSmartTip';

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 220, damping: 22 },
  },
};

interface IntensityDashboardProps {
  intensity: number;
  forecast: ForecastData[];
  generationMix: GenerationMix[];
  gridFrequency: number | null | undefined;
  lastUpdated: string | null | undefined;
  glowClass: string;
  showWeatherInInsights: boolean;
}

export function IntensityDashboard({
  intensity,
  forecast,
  generationMix,
  gridFrequency,
  lastUpdated,
  glowClass,
  showWeatherInInsights,
}: IntensityDashboardProps) {
  return (
    <motion.div
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
      }}
      initial="hidden"
      animate="show"
    >
      <motion.div className="md:col-span-2 lg:col-span-1 lg:row-span-2" variants={cardVariants}>
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

          {showWeatherInInsights && (
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

      <motion.div className="md:col-span-2 lg:col-span-2" variants={cardVariants}>
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

      {forecast.length > 0 && (
        <motion.div variants={cardVariants} className="transition-transform active:scale-[0.985]">
          <ComponentErrorBoundary name="Best Time">
            <BestTimeSlot forecast={forecast} />
          </ComponentErrorBoundary>
        </motion.div>
      )}

      {forecast.length > 0 && (
        <motion.div variants={cardVariants} className="transition-transform active:scale-[0.985]">
          <ComponentErrorBoundary name="Worst Time">
            <WorstTimeSlot forecast={forecast} />
          </ComponentErrorBoundary>
        </motion.div>
      )}

      {forecast.length > 0 && (
        <motion.div className="md:col-span-2 lg:col-span-3" variants={cardVariants}>
          <Card className={`p-4 shadow-lg glass-card ${glowClass}`} data-tour="forecast-chart">
            <ComponentErrorBoundary name="Hourly Forecast">
              <ForecastChart forecast={forecast} showNext={24} />
            </ComponentErrorBoundary>
          </Card>
        </motion.div>
      )}

      {forecast.length > 0 && (
        <motion.div className="md:col-span-2 lg:col-span-3" variants={cardVariants}>
          <ComponentErrorBoundary name="Daily Forecast">
            <ForecastSummary forecast={forecast} />
          </ComponentErrorBoundary>
        </motion.div>
      )}
    </motion.div>
  );
}
