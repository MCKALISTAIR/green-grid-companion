import {
  ForecastData,
  getIntensityColor,
  getIntensityTextColor,
  isEstimatedActual,
} from '@/lib/carbonApi';
import { format, parseISO } from 'date-fns';
import { useRef, useLayoutEffect, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getForecastMax, getForecastDifferences, getSlotDisplayValue } from '@/lib/forecastUtils';
import { createPortal } from 'react-dom';
import { Target, ArrowUp, ArrowDown, Clock3, Leaf, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { findDefaultForecastIndex, getForecastHourInsight } from '@/lib/forecastHourInsight';
import { getNowOrWaitDecision } from '@/lib/nowOrWait';
import { useEnergyFacts } from '@/hooks/useEnergyFacts';
import { cn } from '@/lib/utils';
import { useHaptics } from '@/hooks/useHaptics';

interface ForecastChartProps {
  forecast: ForecastData[];
  showNext?: number;
  /** Live intensity — drives vs-now copy in the hour insight strip. */
  currentIntensity?: number;
}

/**
 * Carrot-style cross-linked forecast: tapping an hour updates chart emphasis
 * and the insight strip (condition + vs-now + action) together.
 */
export function ForecastChart({ forecast, currentIntensity = 0 }: ForecastChartProps) {
  const { tone } = useEnergyFacts();
  const { selection } = useHaptics();
  const [visibleDate, setVisibleDate] = useState<Date>(new Date());
  const [selectedIndex, setSelectedIndex] = useState<number>(() =>
    findDefaultForecastIndex(forecast),
  );
  const [selectedBestBlock, setSelectedBestBlock] = useState<number | null>(null);
  const [bestBlockPopupPos, setBestBlockPopupPos] = useState<{ x: number; y: number } | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const currentHourRef = useRef<HTMLButtonElement>(null);
  const selectedItemRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
  const bestBlockRefs = useRef<Map<number, HTMLDivElement>>(new Map());

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
      container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
    }
    const nowIdx = findDefaultForecastIndex(forecast);
    setSelectedIndex(nowIdx);
    setSelectedBestBlock(null);
    selection();
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

  useEffect(() => {
    if (selectedBestBlock !== null && bestBlockRefs.current.has(selectedBestBlock)) {
      const element = bestBlockRefs.current.get(selectedBestBlock);
      if (element) {
        const rect = element.getBoundingClientRect();
        setBestBlockPopupPos({
          x: rect.left + rect.width / 2,
          y: rect.top - 8,
        });
      }
    } else {
      setBestBlockPopupPos(null);
    }
  }, [selectedBestBlock]);

  useEffect(() => {
    if (selectedBestBlock === null) return;
    const dismiss = () => setSelectedBestBlock(null);
    window.addEventListener('scroll', dismiss, { passive: true });
    const handleTap = (e: MouseEvent | TouchEvent) => {
      const container = scrollContainerRef.current;
      if (container && !container.contains(e.target as Node)) dismiss();
    };
    document.addEventListener('pointerdown', handleTap);
    return () => {
      window.removeEventListener('scroll', dismiss);
      document.removeEventListener('pointerdown', handleTap);
    };
  }, [selectedBestBlock]);

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
    return !prevTime || time.getDate() !== prevTime.getDate();
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
    currentIntensity > 0 ? getNowOrWaitDecision(currentIntensity, forecast, now).action : undefined;

  const insight = getForecastHourInsight(
    forecast,
    selectedIndex,
    currentIntensity,
    tone,
    new Date(),
    bestBlockIndexes,
    nowAction,
  );

  const isToday = visibleDate.getDate() === now.getDate();
  const isTomorrow = visibleDate.getDate() === new Date(now.getTime() + 86400000).getDate();
  const headerDateLabel = isToday
    ? 'Today'
    : isTomorrow
      ? 'Tomorrow'
      : format(visibleDate, 'EEEE, d MMM');

  const selectHour = (i: number) => {
    setSelectedIndex(i);
    setSelectedBestBlock(null);
    selection();
  };

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
            className="h-6 w-6 rounded-full hover:bg-accent"
            onClick={scrollToNow}
            title="Jump to now"
            aria-label="Jump to now"
          >
            <Target className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {insight && (
          <motion.div
            key={insight.index}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className={cn('rounded-2xl border px-3.5 py-3 space-y-1', insight.washClass)}
            aria-live="polite"
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
                <span className="inline-flex items-center gap-1 text-intensity-very-low font-semibold">
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
                <td>{format(parseISO(item.from), 'PPpp')}</td>
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

      <TooltipProvider delayDuration={200}>
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className={cn(
            'overflow-x-auto pb-4 pt-4 -mt-2 scrollbar-thin scrollbar-thumb-muted-foreground/20 rounded-xl transition-colors duration-500',
            insight?.washClass,
          )}
          role="listbox"
          aria-label="Select a forecast hour"
          aria-activedescendant={selectedIndex >= 0 ? `forecast-hour-${selectedIndex}` : undefined}
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

              const startTime = format(parseISO(forecast[block.start].from), 'HH:mm');
              const endTime = format(parseISO(forecast[block.end].to), 'HH:mm');
              const slotCount = block.end - block.start + 1;
              const avgIntensity = Math.round(
                forecast
                  .slice(block.start, block.end + 1)
                  .reduce((s, f) => s + f.intensity.forecast, 0) / slotCount,
              );

              return (
                <Tooltip key={`best-block-${idx}`}>
                  <TooltipTrigger asChild>
                    <div
                      className="absolute top-0 bottom-0 cursor-pointer"
                      ref={(el) => {
                        if (el) bestBlockRefs.current.set(idx, el);
                      }}
                      onClick={() => {
                        selectHour(block.start);
                        setSelectedBestBlock(selectedBestBlock === idx ? null : idx);
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
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-intensity-very-low/15 dark:bg-intensity-very-low/25 border border-intensity-very-low/30 px-2 py-0.5 rounded-full whitespace-nowrap shadow-sm z-10">
                        <span className="text-[8px] font-bold tracking-wide text-intensity-very-low">
                          ★
                        </span>
                        <span className="text-[8px] font-semibold text-intensity-very-low">
                          Best · {startTime}–{endTime}
                        </span>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs max-w-[200px]">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold text-intensity-very-low">★ Best window</span>
                      <span>
                        {startTime} → {endTime} ({slotCount * 0.5}h)
                      </span>
                      <span className="text-muted-foreground">Avg: {avgIntensity} gCO₂/kWh</span>
                    </div>
                  </TooltipContent>
                </Tooltip>
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
              const showSeparator = !prevTime || time.getDate() !== prevTime.getDate();
              const displayValue = getSlotDisplayValue(item, now);
              const isSelected = selectedIndex === i;
              const dimOthers = selectedIndex !== null && !isSelected;

              let dateLabel = '';
              if (showSeparator) {
                const today = new Date();
                const tomorrow = new Date(today);
                tomorrow.setDate(tomorrow.getDate() + 1);
                if (time.getDate() === today.getDate()) dateLabel = 'Today';
                else if (time.getDate() === tomorrow.getDate()) dateLabel = 'Tomorrow';
                else dateLabel = format(time, 'EEE d');
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
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        id={`forecast-hour-${i}`}
                        role="option"
                        aria-selected={isSelected}
                        aria-label={`${format(time, 'HH:mm')}${isCurrentHour ? ' (now)' : ''}: ${
                          isUnknown ? 'no data' : `${displayValue} gCO₂/kWh`
                        }`}
                        className={cn(
                          'relative flex flex-col items-center gap-1 w-12 transition-all duration-300 rounded-lg py-1 cursor-pointer',
                          isPast ? 'opacity-80' : 'opacity-100',
                          isCurrentHour && !isSelected && 'bg-accent/20 scale-105 z-10',
                          isSelected &&
                            'bg-accent/30 ring-2 ring-primary/55 scale-110 shadow-sm z-20',
                          dimOthers && 'opacity-45',
                        )}
                        ref={(el) => {
                          if (isCurrentHour && el) currentHourRef.current = el;
                          if (el) selectedItemRefs.current.set(i, el);
                        }}
                        onClick={() => selectHour(i)}
                      >
                        <div className="relative h-24 w-8 flex items-end justify-center mt-2">
                          <motion.div
                            className={cn(
                              'relative w-full rounded-t-md border-x border-t',
                              hasActual ? 'border-white/30' : 'border-white/10',
                              getIntensityColor(item.intensity.index),
                              isSelected && 'brightness-110',
                            )}
                            initial={{ height: 0, opacity: 0 }}
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
                              ? 'text-primary font-bold'
                              : 'text-foreground',
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
                              ? 'text-primary font-bold'
                              : 'text-muted-foreground',
                          )}
                        >
                          {isCurrentHour ? 'Now' : format(time, 'HH:mm')}
                        </span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      <div className="flex flex-col gap-1">
                        <span className="font-semibold capitalize">{item.intensity.index}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Forecast:</span>
                          <span className="font-medium">
                            {isUnknown ? 'No data' : `${item.intensity.forecast}g`}
                          </span>
                        </div>
                        {hasActual && (
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">
                              {isEstimatedActual(item) ? 'Estimate (GridSense):' : 'Actual:'}
                            </span>
                            <span className="font-medium">{item.intensity.actual}g</span>
                          </div>
                        )}
                        <span className="text-muted-foreground">Tap to explore this hour</span>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </div>
              );
            })}
          </div>
        </div>
      </TooltipProvider>

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
      </div>

      {selectedBestBlock !== null &&
        bestBlockPopupPos &&
        bestBlocks[selectedBestBlock] &&
        createPortal(
          (() => {
            const block = bestBlocks[selectedBestBlock];
            const startTime = format(parseISO(forecast[block.start].from), 'HH:mm');
            const endTime = format(parseISO(forecast[block.end].to), 'HH:mm');
            const slotCount = block.end - block.start + 1;
            const avgIntensity = Math.round(
              forecast
                .slice(block.start, block.end + 1)
                .reduce((s, f) => s + f.intensity.forecast, 0) / slotCount,
            );
            return (
              <div
                className="fixed bg-popover border border-intensity-very-low/30 rounded-lg p-2.5 shadow-lg z-50 min-w-[140px] -translate-x-1/2 -translate-y-full pointer-events-none"
                style={{
                  left: `${bestBlockPopupPos.x}px`,
                  top: `${bestBlockPopupPos.y}px`,
                }}
              >
                <div className="flex flex-col gap-0.5 text-xs">
                  <span className="font-semibold text-intensity-very-low">★ Best window</span>
                  <span className="text-foreground">
                    {startTime} → {endTime} ({slotCount * 0.5}h)
                  </span>
                  <span className="text-muted-foreground">Avg: {avgIntensity} gCO₂/kWh</span>
                </div>
              </div>
            );
          })(),
          document.body,
        )}
    </div>
  );
}

function scrollLeftSafe(container: HTMLDivElement): number {
  return container.scrollLeft;
}
