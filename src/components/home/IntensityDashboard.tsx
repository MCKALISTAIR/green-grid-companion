import type { ReactNode } from 'react';
import { ComponentErrorBoundary } from '@/components/ComponentErrorBoundary';
import { NowOrWaitDecision } from '@/components/home/NowOrWaitDecision';
import { NextForecastCard } from '@/components/home/NextForecastCard';
import { MixExplainerCard } from '@/components/home/MixExplainerCard';
import { GenerationMixCard } from '@/components/home/GenerationMixCard';
import { MoreInsights } from '@/components/home/MoreInsights';
import type { ForecastData, GenerationMix, IntensityData, GenerationSnapshot } from '@/lib/carbonApi';
import type { NowOrWaitDecision as Decision } from '@/lib/nowOrWait';
import type { CommentaryTone } from '@/lib/tone';
import type { GenerationSourceMW } from '@/hooks/useGridDemand';

export interface HomeCardsModel {
  decision: Decision;
  tone: CommentaryTone;
  forecast: ForecastData[];
  region: string;
  isRegional: boolean;
  intensity: number;
  regionalMix: GenerationMix[];
  gbGeneration: GenerationSnapshot | null;
  gbGenerationError: boolean;
  onRetryGeneration?: () => void;
  gridMix: GenerationSourceMW[];
  gridTimestamp: string | null | undefined;
  gbIntensity: IntensityData['intensity'] | null;
  now: Date;
  showNowDot: boolean;
  /** Offline cached caption, shown on the chart card. */
  note?: string | null;
  onOpenDay: (dateKey: string) => void;
}

function Boundary({ name, children }: { name: string; children: ReactNode }) {
  return <ComponentErrorBoundary name={name}>{children}</ComponentErrorBoundary>;
}

/** The home cards (spec §4.1), split so phones stack them and desktop puts them in two columns. */
export function HomeCards({ m, slot }: { m: HomeCardsModel; slot: 'nowOrWait' | 'next24' | 'explainer' | 'genMix' | 'insights' }) {
  switch (slot) {
    case 'nowOrWait':
      return (
        <Boundary name="Now or wait">
          <NowOrWaitDecision decision={m.decision} tone={m.tone} />
        </Boundary>
      );
    case 'next24':
      return (
        <Boundary name="Next 24 hours">
          <NextForecastCard forecast={m.forecast} plan={m.decision.plan} region={m.region} now={m.now} showNow={m.showNowDot} note={m.note} />
        </Boundary>
      );
    case 'explainer':
      return (
        <Boundary name="What's behind">
          <MixExplainerCard mix={m.regionalMix} region={m.region} intensity={m.intensity} />
        </Boundary>
      );
    case 'genMix':
      return (
        <Boundary name="Generation mix">
          <GenerationMixCard
            mix={m.gbGeneration?.generationmix}
            slotFrom={m.gbGeneration?.from ?? null}
            slotTo={m.gbGeneration?.to ?? null}
            live={m.gridMix}
            liveTimestamp={m.gridTimestamp ?? null}
            error={m.gbGenerationError && !m.gbGeneration}
            onRetry={m.onRetryGeneration}
          />
        </Boundary>
      );
    case 'insights':
      return (
        <Boundary name="More insights">
          <MoreInsights
            forecast={m.forecast}
            region={m.region}
            isRegional={m.isRegional}
            intensity={m.intensity}
            gbIntensity={m.gbIntensity}
            now={m.now}
            onOpenDay={m.onOpenDay}
          />
        </Boundary>
      );
  }
}

/** Card skeletons at their final sizes (first load). */
export function HomeCardSkeletons() {
  return (
    <div className="space-y-[14px]" aria-hidden>
      {[176, 300, 160].map((h) => (
        <div key={h} className="animate-shimmer rounded-[20px]" style={{ height: h }} />
      ))}
    </div>
  );
}
