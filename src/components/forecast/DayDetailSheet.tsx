import { useEffect, useMemo, useRef, useState } from 'react';
import type { TouchEvent } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Drawer as Vaul } from 'vaul';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsDesktop } from '@/hooks/useMediaQuery';
import { useDayIntensity } from '@/hooks/useDayIntensity';
import type { ForecastData } from '@/lib/carbonApi';
import {
  buildDayDetail,
  defaultIndex,
  formatDayTitle,
  formatWindow,
  londonDayBounds,
  relativeDayLabel,
  summariseDay,
  type DayDetail,
} from '@/lib/dayForecast';
import { findCleanestWindow, type LoadWindow } from '@/lib/nowOrWait';
import { formatLondonTime } from '@/lib/londonTime';
import { normaliseTone, type CommentaryTone } from '@/lib/tone';
import { IntensityLineChart, bandFill, bandInk, bandName } from './IntensityLineChart';
import { cn } from '@/lib/utils';

const UNIT = 'gCO\u2082/kWh';

export interface DayDetailSheetProps {
  /** London date key of the open day, or null when closed. */
  dateKey: string | null;
  onDateChange: (dateKey: string | null) => void;
  /** Days that have data (for the pager). */
  availableDays: string[];
  regionId: number | null | undefined;
  regionName: string;
  /** The home card's shaded window (used when it falls inside this day). */
  planWindow: LoadWindow | null;
  tone: CommentaryTone | string;
  placeholder?: ForecastData[];
}

export function partOfDay(ms: number): 'morning' | 'afternoon' | 'evening' {
  const h = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: 'numeric', hourCycle: 'h23' }).format(ms));
  return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
}

interface BodyProps {
  dateKey: string;
  regionId: number | null | undefined;
  regionName: string;
  planWindow: LoadWindow | null;
  tone: CommentaryTone | string;
  placeholder?: ForecastData[];
  scope: 'region' | 'gb';
}

function DayBody({ dateKey, regionId, regionName, planWindow, tone, placeholder, scope }: BodyProps) {
  const isGB = scope === 'gb' || !regionId;
  const query = useDayIntensity(dateKey, isGB ? 0 : regionId, isGB ? undefined : placeholder);
  const [now] = useState(() => new Date());
  const [scrub, setScrub] = useState<number | null>(null);
  useEffect(() => setScrub(null), [dateKey, scope]);

  const detail: DayDetail | null = useMemo(
    () => (query.data ? buildDayDetail(query.data, dateKey, { includeActual: isGB, includeEstimate: !isGB, now }) : null),
    [query.data, dateKey, isGB, now],
  );

  if (query.isError && !detail) {
    return (
      <div className="py-10 text-center">
        <p className="text-[15px] font-bold">Can&apos;t reach the grid data</p>
        <button type="button" onClick={() => void query.refetch()} className="mt-3 min-h-11 rounded-full border border-border px-4 text-[14px] font-bold">
          Try again
        </button>
      </div>
    );
  }
  if (!detail) {
    return (
      <div className="mt-3 space-y-3" aria-busy="true" aria-label="Loading">
        <Skeleton className="h-14 w-40" />
        <Skeleton className="h-[230px] w-full" />
      </div>
    );
  }
  if (detail.filledCount === 0) {
    return <p className="py-10 text-center text-[14px] font-semibold text-muted-foreground">No forecast for this day yet.</p>;
  }

  const cheeky = normaliseTone(tone) === 'cheeky';
  const bounds = londonDayBounds(dateKey);
  const isToday = detail.nowIndex !== null;
  const nowSlot = isToday ? detail.slots[detail.nowIndex as number] : null;

  // Cleanest window: the home plan's when it's inside this day (same region), else the day's own.
  let win: LoadWindow | null = null;
  let winTitle = 'Cleanest 3h';
  if (detail.showExtremes) {
    const inside = planWindow && planWindow.start.getTime() >= bounds.start && planWindow.end.getTime() <= bounds.end;
    if (!isGB && inside) win = planWindow;
    else {
      win = findCleanestWindow(query.data ?? [], { fromMs: Math.max(now.getTime(), bounds.start), toMs: bounds.end });
      if (isToday) winTitle = 'Cleanest 3h left today';
    }
  }

  const dirtiest = detail.dirtiest;
  const flatNote = detail.allZero ? (cheeky ? 'Forecast: zero carbon all day. Smug grid alert.' : 'Forecast: zero carbon all day.') : null;
  const highestLine =
    detail.showExtremes && dirtiest
      ? cheeky
        ? `The ${partOfDay(dirtiest.from)}'s the grumpy bit: ${dirtiest.forecast} at ${dirtiest.time}.`
        : `Highest: ${dirtiest.forecast} at ${dirtiest.time}.`
      : null;

  const range = detail.min === detail.max ? `${detail.min}` : `${detail.min}\u2013${detail.max}`;
  const scrubbed = scrub !== null ? detail.slots[scrub] : null;
  const readSlot = scrubbed ?? nowSlot;
  const caption = isGB
    ? "Actual is NESO's figure for GB, published after each half hour. Gaps stay gaps: we never join up missing half hours."
    : "NESO doesn't publish actuals for regions. Est is GridSense's own estimate from the fuel mix, not a NESO figure.";
  let lastFilled: number | null = null;
  detail.slots.forEach((s) => {
    if (s.forecast !== null) lastFilled = s.to;
  });
  const partialTo = detail.missingAfterHorizon > 0 ? lastFilled : null;

  return (
    <div>
      <div className="mt-3 flex flex-wrap items-end gap-x-2 gap-y-1" aria-live="polite" data-testid="day-readout">
        {readSlot && readSlot.forecast !== null ? (
          <>
            <span className="text-[56px] font-extrabold leading-[0.9] tracking-[-0.04em] tabular-nums">{readSlot.forecast}</span>
            <span className="pb-1 text-[13px] font-semibold text-muted-foreground">
              {UNIT} {scrubbed ? `at ${scrubbed.time} (forecast)` : 'now (forecast)'}
            </span>
            {readSlot.index && (
              <span
                className="mb-1 ml-auto inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-[13px] font-extrabold"
                style={{ color: bandInk(readSlot.index) }}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: bandFill(readSlot.index) }} aria-hidden />
                {bandName(readSlot.index)}
              </span>
            )}
          </>
        ) : (
          <>
            <span className="text-[56px] font-extrabold leading-[0.9] tracking-[-0.04em] tabular-nums">{detail.avg ?? '\u2014'}</span>
            <span className="pb-1 text-[13px] font-semibold text-muted-foreground">{UNIT} average (forecast)</span>
          </>
        )}
      </div>

      <div className="mt-4">
        <IntensityLineChart
          mode="day"
          points={detail.slots}
          t0={bounds.start}
          t1={bounds.end}
          height={230}
          nowMs={isToday ? now.getTime() : null}
          window={win}
          windowLabel={win ? formatWindow(win) : null}
          showExtremes={detail.showExtremes}
          extremeLabel={(p) => `Dirtiest ${formatLondonTime(new Date(p.from))} \u00b7 ${p.forecast}`}
          flatNote={flatNote}
          ariaLabel={`${formatDayTitle(dateKey)}, ${isGB ? 'Great Britain' : regionName}, half-hourly`}
          summary={summariseDay(detail)}
          onScrubChange={setScrub}
          defaultIndex={defaultIndex(detail)}
          testId="day-chart"
        />
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11.5px] font-semibold">
        <li className="inline-flex items-center gap-1.5">
          <span className="h-0 w-4 border-t-2 border-dashed border-series-forecast" aria-hidden />
          Forecast
        </li>
        {isGB ? (
          <li className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded bg-series-actual" aria-hidden />
            Actual
          </li>
        ) : (
          <li className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded bg-series-estimate" aria-hidden />
            Est
          </li>
        )}
        {win && (
          <li className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-3 rounded-sm bg-primary/20" aria-hidden />
            Cleanest 3h
          </li>
        )}
        {detail.showExtremes && (
          <li className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-intensity-high" aria-hidden />
            Dirtiest
          </li>
        )}
      </ul>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {[
          { k: 'Forecast range', v: range },
          { k: 'Forecast avg', v: `${detail.avg}` },
          { k: winTitle, v: win ? formatWindow(win) : detail.showExtremes ? '\u2014' : 'Any time' },
        ].map((t) => (
          <div key={t.k} className="min-w-0 rounded-[14px] bg-primary-soft p-2.5">
            <p className="text-[11px] font-semibold leading-tight text-muted-foreground">{t.k}</p>
            <p className="mt-0.5 truncate text-[15px] font-extrabold tabular-nums">{t.v}</p>
          </div>
        ))}
      </div>

      {highestLine && <p className="mt-3 text-[14px] font-bold">{highestLine}</p>}
      <p className="mt-2 text-[12px] font-semibold leading-[1.4] text-muted-foreground">
        {caption}
        {partialTo ? ` Forecast runs to ${formatLondonTime(new Date(partialTo))}.` : ''}
      </p>
    </div>
  );
}

/** Day sheet (spec §5): vaul sheet on phones (60% / 92% detents), 560 px dialog on desktop. */
export function DayDetailSheet(props: DayDetailSheetProps) {
  const { dateKey, onDateChange, availableDays, regionId, regionName } = props;
  const isDesktop = useIsDesktop();
  const [scope, setScope] = useState<'region' | 'gb'>('region');
  const [snap, setSnap] = useState<number | string | null>(0.6);
  useEffect(() => {
    if (dateKey) setSnap(0.6);
  }, [dateKey]);
  const touchX = useRef<number | null>(null);
  const open = dateKey !== null;
  const idx = dateKey ? availableDays.indexOf(dateKey) : -1;
  const prev = idx > 0 ? availableDays[idx - 1] : null;
  const next = idx >= 0 && idx < availableDays.length - 1 ? availableDays[idx + 1] : null;
  const showScope = !!regionId;
  const subtitle = `Half-hourly, ${showScope && scope === 'region' ? regionName : 'Great Britain'}`;

  const onTouchStart = (e: TouchEvent) => (touchX.current = e.touches[0]?.clientX ?? null);
  const onTouchEnd = (e: TouchEvent) => {
    if (touchX.current === null) return;
    const dx = (e.changedTouches[0]?.clientX ?? touchX.current) - touchX.current;
    touchX.current = null;
    if (Math.abs(dx) < 60) return;
    if (dx < 0 && next) onDateChange(next);
    if (dx > 0 && prev) onDateChange(prev);
  };

  const Title = isDesktop ? DialogTitle : Vaul.Title;
  const Desc = isDesktop ? DialogDescription : Vaul.Description;

  const content = dateKey && (
    <div className="px-5 pb-[calc(20px+env(safe-area-inset-bottom))]" data-testid="day-sheet">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Title className="text-[20px] font-extrabold leading-tight">{formatDayTitle(dateKey)}</Title>
          <Desc className="text-[13px] font-semibold text-muted-foreground">{subtitle}</Desc>
        </div>
        <button type="button" aria-label="Close" onClick={() => onDateChange(null)} className="-mr-2 -mt-1 grid h-11 w-11 shrink-0 place-items-center rounded-full hover:bg-muted">
          <X className="h-5 w-5" aria-hidden />
        </button>
      </div>

      {showScope && (
        <div role="tablist" aria-label="Area" className="mt-3 grid grid-cols-2 rounded-full bg-muted p-1">
          {(['region', 'gb'] as const).map((s) => (
            <button
              key={s}
              role="tab"
              type="button"
              aria-selected={scope === s}
              onClick={() => setScope(s)}
              className={cn('min-h-9 truncate rounded-full px-2 text-[13.5px] font-bold', scope === s ? 'bg-card shadow-sm' : 'text-muted-foreground')}
            >
              {s === 'region' ? regionName : 'GB'}
            </button>
          ))}
        </div>
      )}

      <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <DayBody
          dateKey={dateKey}
          regionId={regionId}
          regionName={regionName}
          planWindow={props.planWindow}
          tone={props.tone}
          placeholder={props.placeholder}
          scope={showScope ? scope : 'gb'}
        />
      </div>

      <nav className="mt-3 flex items-center justify-between" aria-label="Other days">
        {prev ? (
          <button type="button" onClick={() => onDateChange(prev)} className="inline-flex min-h-11 items-center gap-1 text-[14px] font-bold text-primary">
            <ChevronLeft className="h-4 w-4" aria-hidden /> {relativeDayLabel(prev)}
          </button>
        ) : (
          <span />
        )}
        {next && (
          <button type="button" onClick={() => onDateChange(next)} className="inline-flex min-h-11 items-center gap-1 text-[14px] font-bold text-primary">
            {relativeDayLabel(next)} <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        )}
      </nav>
    </div>
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={(o) => !o && onDateChange(null)}>
        <DialogContent className="max-h-[90vh] w-[560px] max-w-[calc(100vw-2rem)] gap-0 overflow-y-auto rounded-[24px] p-0 pt-5 [&>button.absolute]:hidden">
          {content}
        </DialogContent>
      </Dialog>
    );
  }
  return (
    <Vaul.Root open={open} onOpenChange={(o) => !o && onDateChange(null)} snapPoints={[0.6, 0.92]} activeSnapPoint={snap} setActiveSnapPoint={setSnap}>
      <Vaul.Portal>
        <Vaul.Overlay className="fixed inset-0 z-50" style={{ background: 'rgba(12,20,28,.42)' }} />
        <Vaul.Content className="fixed inset-x-0 bottom-0 z-50 flex h-[92dvh] flex-col rounded-t-[28px] bg-background outline-none">
          <div className="mx-auto mt-2 h-[5px] w-10 shrink-0 rounded-full bg-muted-foreground/30" aria-hidden />
          <div className={cn('pt-3', snap === 0.92 ? 'overflow-y-auto' : 'overflow-hidden')}>{content}</div>
        </Vaul.Content>
      </Vaul.Portal>
    </Vaul.Root>
  );
}
