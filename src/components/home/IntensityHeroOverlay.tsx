import { Check, ChevronDown, Info, MapPin, RefreshCw } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { LocationManager } from '@/components/LocationManager';
import { ComponentErrorBoundary } from '@/components/ComponentErrorBoundary';
import { IntensityScene } from '@/components/IntensityScene';
import { CompactDataAttribution } from '@/components/attribution/DataAttribution';
import { getConditionParts } from '@/lib/conditionLabels';
import { formatLondonTime } from '@/lib/londonTime';
import { COPY } from '@/lib/homeCopy';
import type { CommentaryTone } from '@/lib/tone';
import type { GenerationMix } from '@/lib/carbonApi';
import { useTimeOfDay } from '@/hooks/useTimeOfDay';
import { cn } from '@/lib/utils';

type Band = 'very low' | 'low' | 'moderate' | 'high' | 'very high';

export type HeroStatus = 'loading' | 'ok' | 'refreshing' | 'stale' | 'offline-cached' | 'offline-empty' | 'error';

/** Fresh = the reading's half hour contains now and it was fetched under 35 minutes ago (spec §4.2). */
export function isFreshReading(slotFrom: string | null, slotTo: string | null, fetchedAt: number | null, now = Date.now()): boolean {
  if (!slotFrom || !slotTo || !fetchedAt) return false;
  const a = Date.parse(slotFrom);
  const b = Date.parse(slotTo);
  return a <= now && now < b && now - fetchedAt < 35 * 60_000;
}

/** Stale = more than 35 minutes since the reading's half hour ended. */
export function isStaleReading(slotTo: string | null, now = Date.now()): boolean {
  if (!slotTo) return false;
  return now - Date.parse(slotTo) > 35 * 60_000;
}

interface IntensityHeroOverlayProps {
  postcode: string;
  setPostcode: (value: string) => void;
  region: string | undefined;
  intensity: number;
  index: string;
  generationMix: GenerationMix[] | undefined;
  status: HeroStatus;
  renewablesPct: number;
  slotFrom: string | null;
  slotTo: string | null;
  fetchedAt: number | null;
  tone: CommentaryTone;
  /** Inline "same half hour" note after a pull with no new data. */
  sameHalfHourNote?: string | null;
  onRetry?: () => void;
  /** Desktop: 480×480 card instead of the full-bleed phone hero. */
  variant?: 'phone' | 'card';
}

/**
 * Home hero (spec §4.2): location pill, the number, band pill + Cheeky line,
 * the zero-carbon badge (fresh 0 only) and the meta lines, over the scene.
 * Text sits on sky only; the scene's skyline stays below the meta block.
 */
export function IntensityHeroOverlay({
  postcode,
  setPostcode,
  region,
  intensity,
  index,
  generationMix,
  status,
  renewablesPct,
  slotFrom,
  slotTo,
  fetchedAt,
  tone,
  sameHalfHourNote,
  onRetry,
  variant = 'phone',
}: IntensityHeroOverlayProps) {
  const { isNight } = useTimeOfDay();
  const light = isNight || index === 'very high' || index === 'high';
  const hasNumber = status === 'ok' || status === 'refreshing' || status === 'stale' || status === 'offline-cached';
  const parts = getConditionParts(index, tone, region ?? postcode);
  const badge = hasNumber && intensity === 0 && status !== 'stale' && status !== 'offline-cached' && isFreshReading(slotFrom, slotTo, fetchedAt);
  const slot = slotFrom && slotTo ? `${formatLondonTime(new Date(slotFrom))}\u2013${formatLondonTime(new Date(slotTo))}` : null;
  const ink = light ? 'text-white' : 'text-foreground';
  const shadow = light ? 'drop-shadow-[0_1px_8px_rgba(0,0,0,0.55)]' : '';
  const digits = String(intensity).length;

  let meta2: string | null = null;
  if (status === 'refreshing') meta2 = COPY.updating;
  else if (status === 'stale' && slotFrom) meta2 = COPY.stale(formatLondonTime(new Date(slotFrom)));
  else if (status === 'offline-cached' && slotFrom) meta2 = COPY.offlineCached(formatLondonTime(new Date(slotFrom)));
  else if (sameHalfHourNote) meta2 = sameHalfHourNote;
  else if (fetchedAt && slotTo) meta2 = `Updated ${formatLondonTime(new Date(fetchedAt))} \u00b7 next at ${formatLondonTime(new Date(slotTo))}`;

  const pill = 'bg-[hsl(0_0%_100%/0.78)] backdrop-blur-[12px] border border-[hsl(0_0%_100%/0.9)] text-[hsl(210_28%_14%)] dark:bg-[hsl(220_25%_14%/0.7)] dark:text-white dark:border-white/20';

  return (
    <div
      className={cn(
        'home-scene relative w-full overflow-hidden',
        variant === 'card' && 'rounded-[24px] shadow-[var(--shadow-md)]',
        (status === 'offline-cached' || status === 'offline-empty') && 'home-scene--offline',
      )}
      data-variant={variant}
    >
      <ComponentErrorBoundary name="Scene">
        <div className="home-scene__art absolute inset-0" aria-hidden>
          <IntensityScene
            intensity={intensity}
            index={index}
            generationMix={generationMix}
            hasLiveReading={hasNumber && status !== 'stale'}
            className="h-full"
            style={{ height: '100%' }}
          />
        </div>
      </ComponentErrorBoundary>

      <div
        className={cn(
          'home-scene-gauge absolute inset-x-0 top-0 z-10 px-5',
          variant === 'phone' ? 'pt-[calc(max(env(safe-area-inset-top),20px)+8px)]' : 'pt-5',
        )}
        data-tour="intensity-gauge"
      >
        <div className="flex items-center justify-between gap-3">
          <div data-testid="hero-location" className="min-w-0">
            <LocationManager
              value={postcode}
              onChange={setPostcode}
              trigger={
                <button type="button" className={cn('inline-flex h-[34px] max-w-full items-center gap-1.5 rounded-full px-3 text-[14px] font-bold shadow-sm', pill)} style={{ margin: '5px 0' }}>
                  <MapPin className="h-4 w-4 shrink-0" aria-hidden />
                  <span className="truncate">{status === 'loading' ? 'Loading\u2026' : region || 'Select location'}</span>
                  {status === 'refreshing' ? <RefreshCw className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden /> : <ChevronDown className="h-4 w-4 shrink-0" aria-hidden />}
                </button>
              }
            />
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <button type="button" aria-label="About this number" className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-full shadow-sm', pill)}>
                <Info className="h-[18px] w-[18px]" aria-hidden />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-[270px] space-y-2 p-3 text-[13px]">
              <p className="font-bold">Carbon intensity</p>
              <p>{COPY.info}</p>
              <CompactDataAttribution />
            </PopoverContent>
          </Popover>
        </div>

        <div className={cn('mt-[22px]', ink, shadow)}>
          {status === 'loading' ? (
            <div aria-label="Loading carbon intensity" role="status" className="flex min-h-[91px] items-end">
              <span className="h-[80px] w-[150px] animate-pulse rounded-2xl bg-white/50" style={{ animationDuration: '1.2s' }} />
              <span className="mb-2 ml-3 text-[15px] font-bold">{tone === 'plain' ? COPY.loadingPlain : COPY.loadingCheeky}</span>
            </div>
          ) : status === 'error' || status === 'offline-empty' ? (
            <div className="min-h-[91px]" role="alert">
              <p className="text-[22px] font-extrabold leading-tight">{status === 'error' ? COPY.serviceError : COPY.offlineNoCache}</p>
              {status === 'error' && onRetry && (
                <button type="button" onClick={onRetry} className={cn('mt-3 min-h-11 rounded-full px-5 text-[14px] font-bold', pill)}>
                  {COPY.tryAgain}
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-baseline gap-2" data-testid="hero-number">
                <span
                  className={cn('font-extrabold leading-[0.95] tracking-[-0.045em] tabular-nums', digits >= 3 ? 'text-[80px] min-[375px]:text-[96px]' : 'text-[96px]')}
                >
                  {intensity}
                </span>
                <span className={cn('text-[15px] font-semibold', light ? 'text-white/80' : 'text-foreground/70')}>gCO₂/kWh</span>
              </div>
              <div className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1.5" data-testid="hero-band">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[13px] font-extrabold shadow-sm"
                  style={{ color: `hsl(var(--intensity-${(index || 'moderate').replace(' ', '-')}-ink))` }}
                >
                  <span className="h-2 w-2 rounded-full" style={{ background: `hsl(var(--intensity-${(index || 'moderate').replace(' ', '-')}))` }} aria-hidden />
                  {parts.band}
                </span>
                {parts.quip && <span className="text-[17px] font-bold leading-tight">{parts.quip}</span>}
              </div>
            </>
          )}
        </div>

        {badge && (
          <div
            className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-intensity-very-low-ink px-3 py-1.5 text-[13px] font-bold text-white shadow-sm"
            data-testid="zero-carbon-badge"
            role="status"
          >
            <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
            {COPY.zeroBadge}
          </div>
        )}

        {hasNumber && (
          <div
            className={cn('mt-3 space-y-0.5 text-[13px] font-semibold leading-[1.45]', light ? 'text-white/90' : 'text-foreground/[0.78]', shadow)}
            data-testid="hero-meta"
            aria-live="polite"
          >
            <p>
              {Math.round(renewablesPct)}% renewable{slot ? ` \u00b7 Forecast for ${slot}` : ''}
            </p>
            {meta2 && <p>{meta2}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

export type { Band };
