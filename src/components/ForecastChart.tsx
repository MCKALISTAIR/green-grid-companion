import { ForecastData, getIntensityColor } from '@/lib/carbonApi';
import { format, parseISO, isBefore, startOfHour } from 'date-fns';
import { useRef, useLayoutEffect, useState, useEffect } from 'react';
import { getForecastMax, getForecastDifferences } from '@/lib/forecastUtils';
import { createPortal } from 'react-dom';
import { Target, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ForecastChartProps {
  forecast: ForecastData[];
  showNext?: number;
}

export function ForecastChart({ forecast }: ForecastChartProps) {
  const [visibleDate, setVisibleDate] = useState<Date>(new Date());
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [popupPosition, setPopupPosition] = useState<{ x: number; y: number } | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const currentHourRef = useRef<HTMLDivElement>(null);
  const selectedItemRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Scroll to current time
  const scrollToNow = () => {
    if (scrollContainerRef.current && currentHourRef.current) {
      const container = scrollContainerRef.current;
      const element = currentHourRef.current;

      // Center the element: (element left offset) - (container width / 2) + (element width / 2)
      const scrollLeft = element.offsetLeft - (container.clientWidth / 2) + (element.clientWidth / 2);

      container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
    }
  };

  // Update visible date on scroll
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;

    const container = scrollContainerRef.current;
    const scrollLeft = container.scrollLeft;
    const itemWidth = 56; // approximate width of item + gap
    const index = Math.floor((scrollLeft + container.clientWidth / 2) / itemWidth); // Update index calculation to be center-based

    if (forecast[index]) {
      const date = parseISO(forecast[index].from);
      setVisibleDate(date);
    }
  };

  // Calculate popup position when selection changes
  useEffect(() => {
    if (selectedIndex !== null && selectedItemRefs.current.has(selectedIndex)) {
      const element = selectedItemRefs.current.get(selectedIndex);
      if (element) {
        const rect = element.getBoundingClientRect();
        setPopupPosition({
          x: rect.left + rect.width / 2,
          y: rect.bottom + 8,
        });
      }
    } else {
      setPopupPosition(null);
    }
  }, [selectedIndex]);

  // Dismiss popup on page scroll or tap outside
  useEffect(() => {
    if (selectedIndex === null) return;
    const dismiss = () => setSelectedIndex(null);
    window.addEventListener('scroll', dismiss, { passive: true });
    const handleTap = (e: MouseEvent | TouchEvent) => {
      const container = scrollContainerRef.current;
      if (container && !container.contains(e.target as Node)) {
        dismiss();
      }
    };
    document.addEventListener('pointerdown', handleTap);
    return () => {
      window.removeEventListener('scroll', dismiss);
      document.removeEventListener('pointerdown', handleTap);
    };
  }, [selectedIndex]);

  useLayoutEffect(() => {
    // Initial scroll
    if (scrollContainerRef.current && currentHourRef.current) {
      const container = scrollContainerRef.current;
      const element = currentHourRef.current;

      // Center the element
      const scrollLeft = element.offsetLeft - (container.clientWidth / 2) + (element.clientWidth / 2);

      container.scrollLeft = scrollLeft;
    }
  }, [forecast]);

  const maxForecast = getForecastMax(forecast);
  const now = startOfHour(new Date());

  // Format header date
  const isToday = visibleDate.getDate() === now.getDate();
  const isTomorrow = visibleDate.getDate() === new Date(now.getTime() + 86400000).getDate();
  const headerDateLabel = isToday ? 'Today' : isTomorrow ? 'Tomorrow' : format(visibleDate, 'EEEE, d MMM');

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
          <span>⏱️</span> Hourly Forecast
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground bg-accent/50 px-2 py-0.5 rounded-md">
            {headerDateLabel}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 rounded-full hover:bg-accent"
            onClick={scrollToNow}
            title="Scroll to now"
          >
            <Target className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <div className="sr-only">
        <table aria-label="Hourly Carbon Intensity Forecast">
          <thead>
            <tr>
              <th>Time</th>
              <th>Forecast (gCO₂/kWh)</th>
              <th>Actual (gCO₂/kWh)</th>
            </tr>
          </thead>
          <tbody>
            {forecast.map((item, i) => (
              <tr key={i}>
                <td>{format(parseISO(item.from), 'PPpp')}</td>
                <td>{item.intensity.forecast}</td>
                <td>{item.intensity.actual ?? 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TooltipProvider delayDuration={200}>
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="overflow-x-auto pb-4 pt-4 -mt-2 scrollbar-thin scrollbar-thumb-muted-foreground/20"
        >
          <div className="flex gap-2 min-w-max px-4">
            {forecast.map((item, i) => {
              const { time, isUnknown, isPast, isCurrentHour, hasActual, difference, showDifference } = getForecastDifferences(item, now);
              const height = (item.intensity.forecast / maxForecast) * 100;

              // Determine if we need a separator
              const prevItem = forecast[i - 1];
              const prevTime = prevItem ? parseISO(prevItem.from) : null;
              const showSeparator = !prevTime || time.getDate() !== prevTime.getDate();

              const nextItem = forecast[i + 1];
              const nextTime = nextItem ? parseISO(nextItem.from) : null;
              const nextHasSeparator = nextTime && time.getDate() !== nextTime.getDate();

              const isBest = !isPast && item.intensity.index === 'very low';
              const isPrevBest = prevItem && !getForecastDifferences(prevItem, now).isPast && prevItem.intensity.index === 'very low';
              const isNextBest = nextItem && !getForecastDifferences(nextItem, now).isPast && nextItem.intensity.index === 'very low';

              const connectPrev = isBest && isPrevBest && !showSeparator;
              const connectNext = isBest && isNextBest && !nextHasSeparator;

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
                      <span className="sideways-text text-[10px] font-medium tracking-widest text-muted-foreground uppercase mb-8" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                        {dateLabel}
                      </span>
                    </div>
                  )}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={`relative flex flex-col items-center gap-1 w-12 transition-all duration-300 rounded-lg py-1 ${hasActual ? 'cursor-pointer' : 'cursor-default'
                          } ${isPast ? 'opacity-80' : 'opacity-100'} ${isCurrentHour ? 'bg-accent/20 scale-110 shadow-sm z-10' : ''} ${selectedIndex === i ? 'bg-accent/30 ring-2 ring-primary/50' : ''
                          } ${!isPast && item.intensity.index === 'very low' ? 'bg-green-500/10 shadow-[inset_0_0_10px_rgba(34,197,94,0.1)]' : ''}`}
                        ref={(el) => {
                          if (isCurrentHour && el) currentHourRef.current = el;
                          if (hasActual && el) selectedItemRefs.current.set(i, el);
                        }}
                        onClick={() => {
                          // Toggle selection on click (for mobile touch)
                          if (hasActual) {
                            setSelectedIndex(selectedIndex === i ? null : i);
                          }
                        }}
                      >
                        {/* Best Time Ribbon Connectors */}
                        {isBest && connectNext && (
                          <div className="absolute -top-3 bottom-auto left-1/2 right-[-0.5rem] h-[18px] bg-green-100 dark:bg-green-900 z-10 pointer-events-none transition-colors" />
                        )}
                        {isBest && connectPrev && (
                          <div className="absolute -top-3 bottom-auto left-[-0.5rem] right-1/2 h-[18px] bg-green-100 dark:bg-green-900 z-10 pointer-events-none transition-colors" />
                        )}

                        {/* Start of block (or standalone) badge */}
                        {isBest && !connectPrev && (
                          <div className={`absolute -top-3 left-1/2 -translate-x-1/2 h-[18px] flex items-center justify-center text-[8px] font-bold text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900 px-1.5 rounded-md whitespace-nowrap pointer-events-none z-20 transition-colors ${!connectNext ? 'shadow-sm' : ''}`}>
                            BEST
                          </div>
                        )}

                        {/* End of block cap */}
                        {isBest && connectPrev && !connectNext && (
                          <div className="absolute -top-3 left-1/2 h-[18px] w-3 bg-green-100 dark:bg-green-900 rounded-r-md pointer-events-none z-10 transition-colors" />
                        )}
                        <div className="relative h-24 w-8 flex items-end justify-center mt-2">
                          {/* Single bar showing actual (if available) or forecast */}
                          <div
                            className={`relative w-full rounded-t-md transition-[height,background-color] duration-500 ease-out border-x border-t ${hasActual
                              ? 'border-white/30' // More prominent border for actual
                              : 'border-white/10'
                              } ${getIntensityColor(item.intensity.index)}`}
                            style={{
                              height: `${Math.max(
                                ((item.intensity.actual ?? item.intensity.forecast) / maxForecast) * 100,
                                10
                              )}%`,
                            }}
                          >
                            {/* Subtle pattern overlay for actual values to distinguish from forecast */}
                            {hasActual && (
                              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNCIgaGVpZ2h0PSI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxjaXJjbGUgY3g9IjIiIGN5PSIyIiByPSIxIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMTUpIi8+PC9zdmc+')] opacity-30" />
                            )}
                          </div>

                          {isCurrentHour && (
                            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-2 h-2 bg-primary rounded-full animate-pulse shadow-[0_0_8px_rgba(var(--primary),0.5)] z-20" />
                          )}
                        </div>
                        <span className={`text-xs font-medium ${isCurrentHour ? 'text-primary font-bold' : 'text-foreground'}`}>
                          {isUnknown ? '?' : (item.intensity.actual ?? item.intensity.forecast)}
                        </span>

                        {/* Difference indicator */}
                        {showDifference && (
                          <div className={`flex items-center gap-0.5 text-[9px] font-medium ${difference > 0 ? 'text-destructive' : 'text-primary'
                            }`}>
                            {difference > 0 ? (
                              <ArrowUp className="w-2.5 h-2.5" />
                            ) : (
                              <ArrowDown className="w-2.5 h-2.5" />
                            )}
                            <span>{Math.abs(difference)}</span>
                          </div>
                        )}

                        <span className={`text-[10px] whitespace-nowrap ${isCurrentHour ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                          {isCurrentHour ? 'Now' : format(time, 'HH:mm')}
                        </span>
                      </div>
                    </TooltipTrigger>
                    {hasActual && (
                      <TooltipContent side="top" className="text-xs">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Forecast:</span>
                            <span className="font-medium">{item.intensity.forecast}g</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Actual:</span>
                            <span className="font-medium">{item.intensity.actual}g</span>
                          </div>
                          <div className={`flex items-center gap-2 text-[10px] ${difference > 0 ? 'text-destructive' : difference < 0 ? 'text-primary' : 'text-muted-foreground'
                            }`}>
                            <span>Difference:</span>
                            <span className="font-medium">{difference > 0 ? '+' : ''}{difference}g</span>
                          </div>
                        </div>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </div>
              );
            })}
          </div>
        </div>
      </TooltipProvider>

      {/* Legend */}
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

      {/* Mobile popup rendered via portal for correct positioning */}
      {selectedIndex !== null && popupPosition && forecast[selectedIndex] && createPortal(
        <div
          className="fixed bg-popover border border-border rounded-md p-2 shadow-lg z-50 min-w-[120px] -translate-x-1/2 pointer-events-none"
          style={{
            left: `${popupPosition.x}px`,
            top: `${popupPosition.y}px`,
          }}
        >
          <div className="flex flex-col gap-1 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Forecast:</span>
              <span className="font-medium">{forecast[selectedIndex].intensity.forecast}g</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Actual:</span>
              <span className="font-medium">{forecast[selectedIndex].intensity.actual}g</span>
            </div>
            <div className={`flex items-center justify-between gap-2 text-[10px] ${(forecast[selectedIndex].intensity.actual ?? 0) - forecast[selectedIndex].intensity.forecast > 0
              ? 'text-destructive'
              : (forecast[selectedIndex].intensity.actual ?? 0) - forecast[selectedIndex].intensity.forecast < 0
                ? 'text-primary'
                : 'text-muted-foreground'
              }`}>
              <span>Difference:</span>
              <span className="font-medium">
                {(forecast[selectedIndex].intensity.actual ?? 0) - forecast[selectedIndex].intensity.forecast > 0 ? '+' : ''}
                {(forecast[selectedIndex].intensity.actual ?? 0) - forecast[selectedIndex].intensity.forecast}g
              </span>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>

  );
}