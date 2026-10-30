import {
  ForecastData,
  getIntensityColor,
  getIntensityTextColor,
  isEstimatedActual,
} from '@/lib/carbonApi';
import { parseISO } from 'date-fns';
import {
  formatLondonDateTime,
  formatLondonLongDate,
  formatLondonShortDay,
  formatLondonSlotSpoken,
  londonRepeatedZone,
  formatLondonTime,
  londonDateKey,
  londonDayLabel,
} from '@/lib/londonTime';
import { useRef, useLayoutEffect, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getForecastMax, getForecastDifferences, getSlotDisplayValue } from '@/lib/forecastUtils';

import { Star, Target, ArrowUp, ArrowDown, Clock3, Leaf } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { findDefaultForecastIndex, getForecastHourInsight } from '@/lib/forecastHourInsight';
import { getNowOrWaitDecision } from '@/lib/nowOrWait';
import { useEnergyFacts } from '@/hooks/useEnergyFacts';
import { cn } from '@/lib/utils';
import { hapticSelectionChanged } from '@/lib/haptics';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useChartScrub } from '@/hooks/useChartScrub';

const STRIP_EDGE_FADE =
  'linear-gradient(to right, transparent 0, #000 16px, #000 calc(100% - 16px), transparent 100%)';

interface ForecastChartProps {
  forecast: ForecastData[];
  showNext?: number;
  /** Live intensity — drives vs-now copy in the hour insight strip. */
  currentIntensity?: number;
  /** Half-hour start of the live reading; a stale one never gives a "use now". */
  lastUpdated?: string | null;
}

/**
 * Carrot-style cross-linked forecast: tapping an hour updates chart emphasis
 * and the insight strip (condition + vs-now + action) together.
 */
export function ForecastChart({
  forecast,
  currentIntensity = 0,
  lastUpdated = null,
}: ForecastChartProps) {
  const { tone } = useEnergyFacts();
  const reduceMotion = useReducedMotion();
  const [visibleDate, setVisibleDate] = useState<Date>(new Date());
  const [selectedIndex, setSelectedIndex] = useState<number>(() =>
    findDefaultForecastIndex(forecast),
  );
  const [selectedBestBlock, setSelectedBestBlock] = useState<number | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const currentHourRef = useRef<HTMLButtonElement>(null);
  const selectedItemRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
  // Scrubbing pins the readout to the slot under the finger; release keeps it.
  const scrubbing = useChartScrub(scrollContainerRef, (i) => {
    setSelectedIndex(i);
    setSelectedBestBlock(null);
  });

  // Keep selection valid when forecast refreshes; prefer current hour on first load.
  useEffect(() => {
    if (!forecast.length) return;
    setSelectedIndex((prev) => {
      if (prev >= 0 && prev < forecast.length) return prev;
      return findDefaultForecastIndex(forecast);
    });
  }, [forecast]);

  const scrollToNow = () => {
    if (scrollContainerRef.current && currentHourRef.current) {
      const container = scrollContainerRef.current;
      const element = currentHourRef.current;
      const scrollLeft = element.offsetLeft - container.clientWidth / 2 + element.clientWidth / 2;
      container.scrollTo({ left: scrollLeft, behavior: reduceMotion ? 'auto' : 'smooth' });
    }
    const nowIdx = findDefaultForecastIndex(forecast);
    setSelectedIndex(nowIdx);
    setSelectedBestBlock(null);
    void hapticSelectionChanged();
  };

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const itemWidth = 56;
    const index = Math.floor((scrollLeftSafe(container) + container.clientWidth / 2) / itemWidth);
    if (forecast[index]) {
      setVisibleDate(parseISO(forecast[index].from));
    }
  };

  useLayoutEffect(() => {
    if (scrollContainerRef.current && currentHourRef.current) {
      const container = scrollContainerRef.current;
      const element = currentHourRef.current;
      container.scrollLeft =
        element.offsetLeft - container.clientWidth / 2 + element.clientWidth / 2;
    }
  }, [forecast]);

  const now = new Date();
  const maxForecast = getForecastMax(forecast, now);

  const hasSeparatorArray = forecast.map((item, i) => {
    const prevItem = forecast[i - 1];
    const time = parseISO(item.from);
    const prevTime = prevItem ? parseISO(prevItem.from) : null;
    return !prevTime || londonDateKey(time) !== londonDateKey(prevTime);
  });

  const bestBlocks: { start: number; end: number }[] = [];
  let currentBlock: { start: number; end: number } | null = null;

  forecast.forEach((item, i) => {
    const isPast = getForecastDifferences(item, now).isPast;
    const isBest = !isPast && item.intensity.index === 'very low';
    if (isBest) {
      if (!currentBlock) currentBlock = { start: i, end: i };
      else currentBlock.end = i;
    } else if (currentBlock) {
      bestBlocks.push(currentBlock);
      currentBlock = null;
    }
  });
  if (currentBlock) bestBlocks.push(currentBlock);

  const bestBlockIndexes = new Set<number>();
  bestBlocks.forEach((b) => {
    for (let i = b.start; i <= b.end; i++) bestBlockIndexes.add(i);
  });

  // Same engine as the now-or-wait card, so the current-hour line agrees with it.
  const nowAction =
    currentIntensity > 0
      ? getNowOrWaitDecision(currentIntensity, forecast, now, lastUpdated).action
      : undefined;

  const insight = getForecastHourInsight(
    forecast,
    selectedIndex,
    currentIntensity,
    tone,
    new Date(),
    bestBlockIndexes,
    nowAction,
  );

  const visibleDay = londonDayLabel(visibleDate, now);
  const headerDateLabel =
    visibleDay === ''
      ? 'Today'
      : visibleDay === 'tomorrow'
        ? 'Tomorrow'
        : formatLondonLongDate(visibleDate);

  const selectHour = (i: number) => {
    setSelectedIndex(i);
    setSelectedBestBlock(null);
    void hapticSelectionChanged();
  };

  const pinnedBlock = selectedBestBlock !== null ? bestBlocks[selectedBestBlock] : undefined;
  const pinnedBlockInfo = pinnedBlock
    ? {
        start: formatLondonTime(parseISO(forecast[pinnedBlock.start].from)),
        end: formatLondonTime(parseISO(forecast[pinnedBlock.end].to)),
        hours: (pinnedBlock.end - pinnedBlock.start + 1) * 0.5,
        avg: Math.round(
          forecast
            .slice(pinnedBlock.start, pinnedBlock.end + 1)
            .reduce((sum, f) => sum + f.intensity.forecast, 0) /
            (pinnedBlock.end - pinnedBlock.start + 1),
        ),
      }
    : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Clock3 className="w-3.5 h-3.5" aria-hidden />
          Hourly forecast
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md">
            {headerDateLabel}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 -my-2.5 -mr-2.5 rounded-full hover:bg-accent"
            onClick={scrollToNow}
            title="Jump to now"
            aria-label="Jump to now"
          >
            <Target className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Persistent live region: the visual card remounts per hour, which screen readers
          often skip. One structured sentence instead of run-together fragments. */}
      <p className="sr-only" aria-live="polite" aria-atomic="true" data-testid="forecast-hour-live">
        {insight
          ? [
              `${insight.timeLabel}: ${insight.value} grams of CO₂ per kilowatt hour, ${insight.condition}.`,
              insight.vsNow ? `${insight.vsNow}.` : '',
              insight.inBestWindow ? 'In the best window.' : '',
              insight.action,
            ]
              .filter(Boolean)
              .join(' ')
          : ''}
      </p>

      <AnimatePresence mode="wait">
        {insight && (
          <motion.div
            key={insight.index}
            initial={scrubbing ? false : { opacity: 0, y: reduceMotion ? 0 : 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={scrubbing ? undefined : { opacity: 0, y: reduceMotion ? 0 : -4 }}
            transition={{ duration: scrubbing ? 0 : 0.22, ease: [0.16, 1, 0.3, 1] }}
            className={cn('rounded-2xl border px-3.5 py-3 space-y-1', insight.washClass)}
            data-testid="forecast-hour-insight"
          >
            <div className="flex items-baseline justify-between gap-3 flex-wrap">
              <div className="flex items-baseline gap-2 min-w-0">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground tabular-nums">
                  {insight.timeLabel}
                </span>
                <p
                  className={cn(
                    'font-sans text-xl font-bold tracking-tight truncate',
                    getIntensityTextColor(insight.band),
                  )}
                >
                  {insight.condition}
                </p>
              </div>
              <p className="font-mono text-sm font-semibold tabular-nums text-foreground">
                {insight.value}
                <span className="text-[10px] font-sans font-medium text-muted-foreground ml-1">
                  gCO₂/kWh
                </span>
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
              <span>{insight.vsNow}</span>
              {insight.inBestWindow && (
                <span className="inline-flex items-center gap-1 text-intensity-very-low-text font-semibold">
                  <Clock3 className="w-3 h-3" aria-hidden />
                  Best window
                </span>
              )}
              {insight.isCurrent && !insight.inBestWindow && (
                <span className="inline-flex items-center gap-1 text-primary font-semibold">
                  <Leaf className="w-3 h-3" aria-hidden />
                  Live
                </span>
              )}
            </div>
            {pinnedBlockInfo && (
              <p
                role="note"
                aria-label={`Best window, forecast, ${pinnedBlockInfo.start} to ${pinnedBlockInfo.end}, ${pinnedBlockInfo.hours} hours, average ${pinnedBlockInfo.avg} grams CO2 per kilowatt hour.`}
                className="inline-flex items-center gap-1 text-xs font-semibold text-intensity-very-low-text"
                data-testid="best-window-readout"
              >
                <Star className="h-3 w-3 fill-current" aria-hidden />
                <span aria-hidden>
                  {pinnedBlockInfo.start}–{pinnedBlockInfo.end} · avg {pinnedBlockInfo.avg} g
                </span>
              </p>
            )}
            <p className="text-sm text-foreground/90 leading-snug">{insight.action}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="sr-only">
        <table aria-label="Hourly Carbon Intensity Forecast">
          <thead>
            <tr>
              <th>Time</th>
              <th>Forecast (gCO₂/kWh)</th>
              <th>Actual or GridSense estimate (gCO₂/kWh)</th>
            </tr>
          </thead>
          <tbody>
            {forecast.map((item, i) => (
              <tr key={i}>
                <td>{formatLondonDateTime(parseISO(item.from))}</td>
                <td>{item.intensity.forecast}</td>
                <td>
                  {item.intensity.actual ?? 'N/A'}
                  {item.intensity.actual != null && isEstimatedActual(item)
                    ? ' (GridSense estimate)'
                    : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className={cn(
          'overflow-x-auto pb-4 -mt-2 scrollbar-thin scrollbar-thumb-muted-foreground/20 rounded-xl transition-colors duration-500',
          bestBlocks.length > 0 ? 'pt-10' : 'pt-4',
          insight?.washClass,
        )}
        role="listbox"
        aria-label="Select a forecast hour"
        aria-activedescendant={selectedIndex >= 0 ? `forecast-hour-${selectedIndex}` : undefined}
        data-testid="forecast-strip"
        data-scrubbing={scrubbing || undefined}
        style={{
          WebkitTouchCallout: 'none',
          // G-08: soft 16px fade at both edges instead of a hard clip.
          maskImage: STRIP_EDGE_FADE,
          WebkitMaskImage: STRIP_EDGE_FADE,
        }}
      >
        <div className="flex gap-2 min-w-max px-4 relative">
          {bestBlocks.map((block, idx) => {
            const sepsBeforeStart = hasSeparatorArray
              .slice(0, block.start + 1)
              .filter(Boolean).length;
            const sepsInBlock = hasSeparatorArray
              .slice(block.start + 1, block.end + 1)
              .filter(Boolean).length;

            const leftRem = 1.0 + block.start * 3.5 + sepsBeforeStart * 2.0;
            const widthRem = (block.end - block.start) * 3.5 + sepsInBlock * 2.0 + 3.0;

            const startTime = formatLondonTime(parseISO(forecast[block.start].from));
            const endTime = formatLondonTime(parseISO(forecast[block.end].to));

            return (
              <div
                key={`best-block-${idx}`}
                className="absolute top-0 bottom-0 cursor-pointer"
                data-testid="best-window-block"
                onClick={() => {
                  selectHour(block.start);
                  setSelectedBestBlock(idx);
                }}
                style={{
                  left: `${leftRem}rem`,
                  width: `${widthRem}rem`,
                }}
              >
                {/* Soft wash + one rounded band — same “best window” job as the
                          old hand-drawn [ ] bracket, without competing with Now. */}
                <div
                  aria-hidden
                  className="absolute inset-x-0 top-1 bottom-6 rounded-2xl bg-intensity-very-low/[0.12] dark:bg-intensity-very-low/15 ring-1 ring-inset ring-intensity-very-low/35"
                />
                {/* Chip sits above the column, never wider than it, so it can't
                    cover the band or the bars (G-08). Time wraps to its own line. */}
                <div
                  data-testid="best-window-chip"
                  className="absolute bottom-full mb-2 left-0 right-0 mx-auto w-fit max-w-full flex flex-col items-center bg-intensity-very-low/15 dark:bg-intensity-very-low/25 border border-intensity-very-low/30 px-1 py-px rounded-md shadow-sm z-10 leading-tight"
                >
                  <span className="text-[8px] font-semibold text-intensity-very-low-text whitespace-nowrap">
                    <span className="font-bold tracking-wide">★</span> Best
                  </span>
                  <span className="text-[8px] font-semibold text-intensity-very-low-text whitespace-nowrap tabular-nums tracking-tighter">
                    {startTime}–{endTime}
                  </span>
                </div>
              </div>
            );
          })}
          {forecast.map((item, i) => {
            const {
              time,
              isUnknown,
              isPast,
              isCurrentHour,
              hasActual,
              difference,
              showDifference,
            } = getForecastDifferences(item, now);

            const prevItem = forecast[i - 1];
            const prevTime = prevItem ? parseISO(prevItem.from) : null;
            const showSeparator = !prevTime || londonDateKey(time) !== londonDateKey(prevTime);
            const displayValue = getSlotDisplayValue(item, now);
            const isSelected = selectedIndex === i;
            const dimOthers = selectedIndex !== null && !isSelected;

            let dateLabel = '';
            if (showSeparator) {
              const day = londonDayLabel(time);
              if (day === '') dateLabel = 'Today';
              else if (day === 'tomorrow') dateLabel = 'Tomorrow';
              else dateLabel = formatLondonShortDay(time);
            }

            return (
              <div key={i} className="flex gap-2">
                {showSeparator && (
                  <div className="flex flex-col items-center justify-end w-6 border-l border-dashed border-border/40 pl-2 opacity-70">
                    <span
                      className="sideways-text text-[10px] font-medium tracking-widest text-muted-foreground uppercase mb-8"
                      style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                    >
                      {dateLabel}
                    </span>
                  </div>
                )}
                <button
                  type="button"
                  id={`forecast-hour-${i}`}
                  data-slot-index={i}
                  role="option"
                  aria-selected={isSelected}
                  aria-label={`${formatLondonSlotSpoken(time)}${isCurrentHour ? ' (now)' : ''}: ${
                    isUnknown ? 'no data' : `${displayValue} gCO₂/kWh`
                  }`}
                  className={cn(
                    'relative flex flex-col items-center gap-1 w-12 transition-all duration-300 motion-reduce:transition-none rounded-lg py-1 cursor-pointer',
                    scrubbing && 'transition-none',
                    isPast && '[&>div:first-child]:opacity-80',
                    isCurrentHour && !isSelected && 'bg-accent/20 scale-105 z-10',
                    isSelected && 'bg-accent/30 ring-2 ring-primary/55 scale-110 shadow-sm z-20',
                    dimOthers && '[&>div:first-child]:opacity-45',
                  )}
                  ref={(el) => {
                    if (isCurrentHour && el) currentHourRef.current = el;
                    if (el) selectedItemRefs.current.set(i, el);
                  }}
                  onClick={() => selectHour(i)}
                >
                  {scrubbing && isSelected && (
                    <span
                      aria-hidden
                      data-testid="scrub-rule"
                      className="pointer-events-none absolute -top-3 bottom-0 left-1/2 w-px -translate-x-1/2 bg-primary"
                    >
                      <span className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-primary" />
                    </span>
                  )}
                  <div className="relative h-24 w-8 flex items-end justify-center mt-2">
                    <motion.div
                      className={cn(
                        'relative w-full rounded-t-md border-x border-t',
                        hasActual ? 'border-white/30' : 'border-white/10',
                        getIntensityColor(item.intensity.index),
                        isSelected && 'brightness-110',
                      )}
                      initial={reduceMotion ? false : { height: 0, opacity: 0 }}
                      animate={{
                        height: `${Math.max(((displayValue ?? 0) / maxForecast) * 100, 10)}%`,
                        opacity: 1,
                      }}
                      transition={{
                        height: {
                          duration: 0.5,
                          ease: [0.34, 1.2, 0.64, 1],
                          delay: i * 0.018,
                        },
                        opacity: { duration: 0.25, delay: i * 0.018 },
                      }}
                    >
                      {hasActual && (
                        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNCIgaGVpZ2h0PSI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxjaXJjbGUgY3g9IjIiIGN5PSIyIiByPSIxIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMTUpIi8+PC9zdmc+')] opacity-30" />
                      )}
                      {isCurrentHour && (
                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-primary rounded-full animate-pulse shadow-[0_0_8px_rgba(var(--primary),0.5)] z-25" />
                      )}
                    </motion.div>
                  </div>
                  <span
                    className={cn(
                      'text-xs font-medium font-mono tabular-nums',
                      isSelected || isCurrentHour
                        ? 'text-primary-on-tint font-bold dark:text-foreground'
                        : 'text-foreground dark:text-[#9fb0b5]',
                    )}
                  >
                    {isUnknown || displayValue === null ? '?' : displayValue}
                  </span>

                  {showDifference && (
                    <div
                      className={cn(
                        'flex items-center gap-0.5 text-[9px] font-medium',
                        difference > 0 ? 'text-destructive' : 'text-primary',
                      )}
                    >
                      {difference > 0 ? (
                        <ArrowUp className="w-2.5 h-2.5" />
                      ) : (
                        <ArrowDown className="w-2.5 h-2.5" />
                      )}
                      <span>{Math.abs(difference)}</span>
                    </div>
                  )}

                  <span
                    className={cn(
                      'text-[10px] whitespace-nowrap',
                      isSelected || isCurrentHour
                        ? 'text-primary-on-tint font-bold dark:text-foreground'
                        : 'text-muted-foreground dark:text-[#8a9ba1]',
                    )}
                  >
                    {isCurrentHour ? (
                      'Now'
                    ) : londonRepeatedZone(time) ? (
                      // BH-72: both passes of 01:xx on 25 Oct get a small muted zone tag (fits 48px).
                      <>
                        {formatLondonTime(time)}
                        <span className="ml-px text-[8px] tracking-tight opacity-70">
                          {londonRepeatedZone(time)}
                        </span>
                      </>
                    ) : (
                      formatLondonTime(time)
                    )}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground flex-wrap">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-intensity-very-low" />
          <span>Very Low</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-intensity-low" />
          <span>Low</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-intensity-moderate" />
          <span>Moderate</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-intensity-high" />
          <span>High</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-intensity-very-high" />
          <span>Very High</span>
        </div>
        <span className="text-muted-foreground/80" data-testid="forecast-unit">
          Values in gCO₂/kWh
        </span>
      </div>
    </div>
  );
}

function scrollLeftSafe(container: HTMLDivElement): number {
  return container.scrollLeft;
}
