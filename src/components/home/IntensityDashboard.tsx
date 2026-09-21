import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { GenerationMixBar } from '@/components/GenerationMixBar';
import { ForecastChart } from '@/components/ForecastChart';
import { ForecastSummary } from '@/components/ForecastSummary';
import { WorstTimeSlot } from '@/components/BestTimeCard';
import { WeatherWidget } from '@/components/WeatherWidget';
import { GreenerNightsCard } from '@/components/GreenerNightsCard';
import { ComponentErrorBoundary } from '@/components/ComponentErrorBoundary';
import { StaleDataBadge } from '@/components/StaleDataBadge';
import { NowOrWaitDecision } from '@/components/home/NowOrWaitDecision';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import type { ForecastData, GenerationMix } from '@/lib/carbonApi';
import { cn } from '@/lib/utils';

interface IntensityDashboardProps {
  intensity: number;
  forecast: ForecastData[];
  generationMix: GenerationMix[];
  gridFrequency: number | null | undefined;
  lastUpdated: string | null | undefined;
  glowClass: string;
  showWeatherInInsights: boolean;
  /** Optional garden-stage hint under the decision (temporal scene life). */
  gardenDays?: number;
  growthStage?: number;
}

/**
 * Quiet content sheet: one primary now-or-wait decision, then mix + forecast.
 * Secondary insights (worst window, weather, greener nights, daily summary)
 * live behind a single "More insights" disclosure.
 */
export function IntensityDashboard({
  intensity,
  forecast,
  generationMix,
  gridFrequency,
  lastUpdated,
  glowClass,
  showWeatherInInsights,
  gardenDays = 0,
  growthStage = 0,
}: IntensityDashboardProps) {
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <div className="space-y-5">
      <NowOrWaitDecision intensity={intensity} forecast={forecast} />

      {growthStage > 0 && gardenDays > 0 && (
        <p
          className="text-center text-xs text-muted-foreground -mt-2"
          data-testid="scene-garden-day"
        >
          Scene garden · day {gardenDays}
          {growthStage >= 3 ? ' · lush' : growthStage >= 2 ? ' · blooming' : ' · sprouting'}
        </p>
      )}

      <section
        className={cn('sheet-surface px-3 py-3', glowClass)}
        data-tour="generation-mix"
      >
        <ComponentErrorBoundary name="Generation Mix">
          <div className="flex items-center justify-between mb-1.5 px-1">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Generation mix
            </h3>
            <StaleDataBadge lastUpdated={lastUpdated} />
          </div>
          <GenerationMixBar mix={generationMix} frequency={gridFrequency} />
        </ComponentErrorBoundary>
      </section>

      {forecast.length > 0 && (
        <section
          className={cn('sheet-surface p-3', glowClass)}
          data-tour="forecast-chart"
        >
          <ComponentErrorBoundary name="Hourly Forecast">
            <ForecastChart forecast={forecast} showNext={24} />
          </ComponentErrorBoundary>
        </section>
      )}

      {forecast.length > 0 && (
        <Collapsible open={moreOpen} onOpenChange={setMoreOpen}>
          <CollapsibleTrigger
            className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
            aria-expanded={moreOpen}
          >
            <span>More insights</span>
            <motion.span animate={{ rotate: moreOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown className="w-4 h-4" />
            </motion.span>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 pt-2 data-[state=open]:animate-in data-[state=closed]:animate-out">
            <ComponentErrorBoundary name="Worst Time">
              <WorstTimeSlot forecast={forecast} />
            </ComponentErrorBoundary>

            <ComponentErrorBoundary name="Daily Forecast">
              <ForecastSummary forecast={forecast} />
            </ComponentErrorBoundary>

            {showWeatherInInsights && (
              <div className="rounded-2xl border border-border/40 px-3 py-3">
                <ComponentErrorBoundary name="Weather Widget">
                  <WeatherWidget />
                </ComponentErrorBoundary>
              </div>
            )}

            <ComponentErrorBoundary name="Greener Nights">
              <GreenerNightsCard />
            </ComponentErrorBoundary>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
