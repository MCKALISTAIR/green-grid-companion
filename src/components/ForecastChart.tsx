import { ForecastData, getIntensityColor } from '@/lib/carbonApi';
import { format, parseISO, isBefore, startOfHour } from 'date-fns';
import { useRef, useLayoutEffect } from 'react';

interface ForecastChartProps {
  forecast: ForecastData[];
  showNext?: number;
}

export function ForecastChart({ forecast }: ForecastChartProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const currentHourRef = useRef<HTMLDivElement>(null);

  // Scroll to current time on mount/update
  useLayoutEffect(() => {
    if (scrollContainerRef.current && currentHourRef.current) {
      const container = scrollContainerRef.current;
      const element = currentHourRef.current;

      // Center the current hour or align to start
      const scrollLeft = element.offsetLeft - 20; // 20px padding
      container.scrollLeft = scrollLeft;
    }
  }, [forecast]);

  const maxForecast = Math.max(...forecast.map(d => d.intensity.forecast), 200);
  const now = startOfHour(new Date());

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
        <span>⏱️</span> Hourly Forecast
      </h3>

      <div
        ref={scrollContainerRef}
        className="overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-muted-foreground/20"
      >
        <div className="flex gap-2 min-w-max px-4">
          {forecast.map((item, i) => {
            const height = (item.intensity.forecast / maxForecast) * 100;
            const time = parseISO(item.from);
            const isUnknown = item.intensity.forecast === null || item.intensity.forecast === 0;
            const isPast = isBefore(time, now);
            const isCurrentHour = time.getTime() === now.getTime();

            return (
              <div
                key={i}
                className={`flex flex-col items-center gap-1 w-12 transition-opacity duration-300 ${isPast ? 'opacity-50' : 'opacity-100'}`}
                ref={isCurrentHour ? currentHourRef : null}
              >
                <div className="relative h-24 w-8 flex items-end">
                  <div
                    className={`w-full rounded-t-md transition-[height,background-color] duration-500 ease-out ${getIntensityColor(item.intensity.index)}`}
                    style={{ height: `${Math.max(height, 10)}%` }}
                  >
                    {isCurrentHour && (
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-primary rounded-full animate-pulse shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
                    )}
                  </div>
                </div>
                <span className="text-xs font-medium text-foreground">
                  {isUnknown ? '?' : item.intensity.forecast}
                </span>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                  {format(time, 'HH:mm')}
                </span>
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
    </div>
  );
}