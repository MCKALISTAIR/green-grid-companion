import { ForecastData, getIntensityColor } from '@/lib/carbonApi';
import { format, parseISO, isBefore, startOfHour } from 'date-fns';
import { useRef, useLayoutEffect, useState } from 'react';
import { Target } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ForecastChartProps {
  forecast: ForecastData[];
  showNext?: number;
}

export function ForecastChart({ forecast }: ForecastChartProps) {
  const [visibleDate, setVisibleDate] = useState<Date>(new Date());
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const currentHourRef = useRef<HTMLDivElement>(null);

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

  const maxForecast = Math.max(...forecast.map(d => d.intensity.forecast), 200);
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

      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="overflow-x-auto pb-4 pt-4 -mt-2 scrollbar-thin scrollbar-thumb-muted-foreground/20"
      >
        <div className="flex gap-2 min-w-max px-4">
          {forecast.map((item, i) => {
            const height = (item.intensity.forecast / maxForecast) * 100;
            const time = parseISO(item.from);
            const isUnknown = item.intensity.forecast === null || item.intensity.forecast === 0;
            const isPast = isBefore(time, now);
            const isCurrentHour = time.getTime() === now.getTime();

            // Determine if we need a separator
            const prevItem = forecast[i - 1];
            const prevTime = prevItem ? parseISO(prevItem.from) : null;
            const showSeparator = !prevTime || time.getDate() !== prevTime.getDate();

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
                <div
                  className={`flex flex-col items-center gap-1 w-12 transition-all duration-300 rounded-lg py-1 ${isPast ? 'opacity-80' : 'opacity-100'} ${isCurrentHour ? 'bg-accent/20 scale-110 shadow-sm z-10' : ''}`}
                  ref={isCurrentHour ? currentHourRef : null}
                >
                  <div className="relative h-24 w-8 flex items-end justify-center">
                    {/* Forecast Bar (Background/Ghost) */}
                    <div
                      className={`absolute bottom-0 w-full rounded-t-md transition-[height,background-color] duration-500 ease-out border-x border-t border-white/10 ${getIntensityColor(item.intensity.index)}`}
                      style={{
                        height: `${Math.max(height, 10)}%`,
                        opacity: item.intensity.actual ? 0.3 : 0.9
                      }}
                    />

                    {/* Actual Bar (Foreground/Solid) */}
                    {item.intensity.actual !== undefined && item.intensity.actual !== null && (
                      <div
                        className={`relative w-4/5 rounded-t-md transition-[height,background-color] duration-500 ease-out ${getIntensityColor(item.intensity.index)} border-x border-t border-white/20`}
                        style={{ height: `${Math.max((item.intensity.actual / maxForecast) * 100, 10)}%` }}
                      >
                        {/* Dotted pattern overlay for actual to distinguish it */}
                        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNCIgaGVpZ2h0PSI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxjaXJjbGUgY3g9IjIiIGN5PSIyIiByPSIxIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMjUpIi8+PC9zdmc+')] opacity-30" />
                      </div>
                    )}

                    {isCurrentHour && (
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-2 h-2 bg-primary rounded-full animate-pulse shadow-[0_0_8px_rgba(var(--primary),0.5)] z-20" />
                    )}
                  </div>
                  <span className={`text-xs font-medium ${isCurrentHour ? 'text-primary font-bold' : 'text-foreground'}`}>
                    {isUnknown ? '?' : (item.intensity.actual ?? item.intensity.forecast)}
                  </span>
                  <span className={`text-[10px] whitespace-nowrap ${isCurrentHour ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                    {isCurrentHour ? 'Now' : format(time, 'HH:mm')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-intensity-very-low" />
          <span>Very Low</span>
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
      <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground opacity-70">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-primary border" />
          <span>Actual</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-primary/30" />
          <span>Forecast</span>
        </div>
      </div>
    </div>

  );
}