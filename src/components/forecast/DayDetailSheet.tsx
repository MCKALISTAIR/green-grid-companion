import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile';
import { useHaptics } from '@/hooks/useHaptics';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import type { ForecastData } from '@/lib/carbonApi';
import { useDayIntensity } from '@/hooks/useDayIntensity';
import {
  buildDayDetail,
  defaultIndex,
  formatDayTitle,
  summariseDay,
  type DayDetail,
} from '@/lib/dayForecast';
import { londonDateKey } from '@/lib/londonTime';
import { cn } from '@/lib/utils';
import { DayIntensityChart } from './DayIntensityChart';

const UNIT = 'gCO\u2082/kWh';

export interface DayDetailSheetProps {
  /** London date key ("2026-10-11") of the open day, or null when closed. */
  dateKey: string | null;
  onOpenChange: (open: boolean) => void;
  /** NESO region id; null/0 = GB national. */
  regionId: number | null | undefined;
  /** Display name for the region ("South Scotland"). */
  regionName: string;
  /** Overview data, shown instantly while the full day loads. */
  placeholder?: ForecastData[];
}

const BAND_PILL: Record<string, string> = {
  'very low': 'bg-intensity-very-low/20',
  low: 'bg-intensity-low/20',
  moderate: 'bg-intensity-moderate/25',
  high: 'bg-intensity-high/25',
  'very high': 'bg-intensity-very-high/20',
};

function bandLabel(index: string): string {
  return index.charAt(0).toUpperCase() + index.slice(1);
}

interface BodyProps {
  dateKey: string;
  regionId: number | null | undefined;
  regionName: string;
  placeholder?: ForecastData[];
}

function DayDetailBody({ dateKey, regionId, regionName, placeholder }: BodyProps) {
  const isRegional = !!regionId;
  const query = useDayIntensity(dateKey, regionId, placeholder);
  const reducedMotion = useReducedMotion();
  const { selection } = useHaptics();
  const summaryId = useId();
  const [scrubIndex, setScrubIndex] = useState<number | null>(null);
  const lastHapticIndex = useRef<number | null>(null);

  const detail: DayDetail | null = useMemo(
    () => (query.data ? buildDayDetail(query.data, dateKey, { includeActual: !isRegional }) : null),
    [query.data, dateKey, isRegional],
  );

  const onScrub = useCallback(
    (index: number | null) => {
      setScrubIndex(index);
      if (index !== null && index !== lastHapticIndex.current) void selection();
      lastHapticIndex.current = index;
    },
    [selection],
  );

  useEffect(() => {
    setScrubIndex(null);
    lastHapticIndex.current = null;
  }, [dateKey]);

  const now = new Date();
  const todayKey = londonDateKey(now);
  const isFutureDay = dateKey > todayKey;

  if (query.isError && !detail) {
    return (
      <EmptyState
        title="Can't reach the grid data"
        body={null}
        action={
          <Button size="sm" variant="outline" onClick={() => void query.refetch()}>
            Try again
          </Button>
        }
      />
    );
  }

  if (!detail) {
    return (
      <div className="space-y-3 px-1" aria-busy="true">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-[210px] w-full" />
      </div>
    );
  }

  if (detail.filledCount === 0) {
    return isFutureDay ? (
      <EmptyState title="No forecast for this day yet" body="Forecasts only reach about 48 hours ahead." />
    ) : (
      <EmptyState title="No data for this day" body={`Nothing came back for ${regionName}. Try again later.`} />
    );
  }

  const baseIndex = defaultIndex(detail);
  const shownIndex = scrubIndex ?? baseIndex;
  const shown = shownIndex !== null ? detail.slots[shownIndex] : null;
  const shownValue = shown?.forecast ?? null;
  const caption =
    scrubIndex !== null && shown
      ? `At ${shown.time}`
      : detail.nowIndex !== null && shownIndex === detail.nowIndex
        ? 'Now'
        : shown
          ? `Cleanest at ${shown.time}`
          : '';
  const scrubSlot = scrubIndex !== null ? detail.slots[scrubIndex] : null;
  const summary = summariseDay(detail);

  return (
    <div className="space-y-3">
      {/* Big value */}
      <div className="px-1" aria-live="off">
        <div className="flex items-baseline gap-1.5">
          <span className="text-4xl font-bold tabular-nums tracking-tight text-foreground" data-testid="day-detail-value">
            {shownValue ?? '\u2013'}
          </span>
          <span className="text-sm text-muted-foreground">{UNIT}</span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {shown?.index && shownValue !== null && (
            <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium text-foreground', BAND_PILL[shown.index])}>
              {bandLabel(shown.index)}
            </span>
          )}
          <span className="text-xs text-muted-foreground">{caption}</span>
        </div>
      </div>

      {/* Scrub readout: fixed height so the chart never jumps */}
      <div className="h-5 px-1 text-xs tabular-nums" aria-hidden data-testid="day-detail-readout">
        {scrubSlot ? (
          <span className="flex flex-wrap gap-x-3 text-foreground">
            <span className="font-semibold">{scrubSlot.time}</span>
            <span>Forecast {scrubSlot.forecast ?? 'No data'}</span>
            {scrubSlot.actual !== null && <span>Actual {scrubSlot.actual}</span>}
          </span>
        ) : (
          <span className="text-muted-foreground">Drag across the chart to read each half hour.</span>
        )}
      </div>

      <DayIntensityChart
        detail={detail}
        scrubIndex={scrubIndex}
        onScrub={onScrub}
        reducedMotion={reducedMotion}
        summaryId={summaryId}
      />

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <svg width="18" height="6" aria-hidden>
            <line x1="0" y1="3" x2="18" y2="3" stroke="hsl(var(--chart-2))" strokeWidth="2" strokeDasharray="4 3" />
          </svg>
          Forecast
        </span>
        {detail.hasActualLine ? (
          <span className="flex items-center gap-1.5">
            <svg width="18" height="6" aria-hidden>
              <line x1="0" y1="3" x2="18" y2="3" stroke="hsl(var(--foreground))" strokeWidth="2" />
            </svg>
            Actual
          </span>
        ) : (
          <span>{isRegional ? 'No measured actuals for regions' : 'No actuals yet'}</span>
        )}
      </div>

      <div className="space-y-1 px-1 text-xs text-muted-foreground">
        <p id={summaryId}>{summary}</p>
        {detail.internalGaps > 0 && <p>Some half hours are missing.</p>}
        {detail.missingAfterHorizon > 0 && detail.filledCount > 0 && (
          <p>Forecasts only reach about 48 hours ahead.</p>
        )}
        {detail.allZero && isRegional && (
          <p>
            NESO's regional forecast for {regionName} is 0 when local power is almost all wind and nuclear. Apps
            showing a higher number are usually using the GB-wide figure.
          </p>
        )}
        {!detail.allZero && !detail.showExtremes && <p>About the same all day.</p>}
      </div>

      {/* Data table for screen readers (same pattern as the hourly forecast) */}
      <div className="sr-only">
        <table>
          <caption>{`${formatDayTitle(dateKey)}, ${regionName}. ${summary}`}</caption>
          <thead>
            <tr>
              <th>Time</th>
              <th>Forecast ({UNIT})</th>
              {detail.hasActualLine && <th>Actual ({UNIT})</th>}
            </tr>
          </thead>
          <tbody>
            {detail.slots.map((s) => (
              <tr key={s.from}>
                <td>{s.time}</td>
                <td>{s.forecast ?? 'No data'}</td>
                {detail.hasActualLine && <td>{s.actual ?? 'No data'}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EmptyState({ title, body, action }: { title: string; body: string | null; action?: React.ReactNode }) {
  return (
    <div className="flex min-h-[180px] flex-col items-center justify-center gap-2 px-4 py-8 text-center" role="status">
      <p className="text-sm font-medium text-foreground">{title}</p>
      {body && <p className="text-xs text-muted-foreground">{body}</p>}
      {action}
    </div>
  );
}

/**
 * Day detail: bottom sheet with medium/large detents on mobile, dialog on desktop.
 */
export function DayDetailSheet({ dateKey, onOpenChange, regionId, regionName, placeholder }: DayDetailSheetProps) {
  const isMobile = useIsMobile();
  const open = dateKey !== null;
  const [snap, setSnap] = useState<number | string | null>(0.62);
  const title = dateKey ? formatDayTitle(dateKey) : '';
  const description = regionName;

  useEffect(() => {
    if (open) setSnap(0.62);
  }, [open, dateKey]);

  const body = dateKey ? (
    <DayDetailBody dateKey={dateKey} regionId={regionId} regionName={regionName} placeholder={placeholder} />
  ) : null;

  if (isMobile) {
    return (
      <Drawer
        open={open}
        onOpenChange={onOpenChange}
        snapPoints={[0.62, 1]}
        activeSnapPoint={snap}
        setActiveSnapPoint={setSnap}
        fadeFromIndex={0}
        shouldScaleBackground={false}
      >
        <DrawerContent
          className="h-[calc(100dvh-env(safe-area-inset-top,0px)-12px)] max-h-[calc(100dvh-env(safe-area-inset-top,0px)-12px)]"
          data-testid="day-detail-sheet"
        >
          <div className="flex items-start justify-between gap-3 px-4 pt-3">
            <div className="min-w-0">
              <DrawerTitle className="text-base">{title}</DrawerTitle>
              <DrawerDescription className="text-xs">{description}</DrawerDescription>
            </div>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" className="-mr-2 h-9 w-9 shrink-0" aria-label="Close">
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>
          </div>
          <div
            className={cn(
              'px-3 pb-[calc(env(safe-area-inset-bottom,0px)+16px)] pt-2',
              snap === 1 ? 'overflow-y-auto' : 'overflow-hidden',
            )}
          >
            {body}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl gap-3" data-testid="day-detail-sheet">
        <div className="pr-8">
          <DialogTitle className="text-base">{title}</DialogTitle>
          <DialogDescription className="text-xs">{description}</DialogDescription>
        </div>
        {body}
      </DialogContent>
    </Dialog>
  );
}
