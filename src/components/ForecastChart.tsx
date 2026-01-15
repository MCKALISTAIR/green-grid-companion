import { ForecastData, getIntensityColor } from '@/lib/carbonApi';
import { format, parseISO } from 'date-fns';

interface ForecastChartProps {
  forecast: ForecastData[];
  showNext?: number;
}

export function ForecastChart({ forecast, showNext = 12 }: ForecastChartProps) {
  const data = forecast.slice(0, showNext);
  const maxValue = Math.max(...data.map(d => d.intensity.forecast), 200);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
        <span>⏱️</span> Hourly Forecast
      </h3>
      
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-2 min-w-max px-1">
          {data.map((item, i) => {
            const height = (item.intensity.forecast / maxValue) * 100;
            const time = parseISO(item.from);
            
            return (
              <div key={i} className="flex flex-col items-center gap-1 w-12">
                <div className="relative h-20 w-8 flex items-end">
                  <div 
                    className={`w-full rounded-t-md transition-all duration-300 ${getIntensityColor(item.intensity.index)}`}
                    style={{ height: `${Math.max(height, 10)}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-foreground">
                  {item.intensity.forecast}
                </span>
                <span className="text-xs text-muted-foreground">
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
          <div className="w-2 h-2 rounded-full bg-intensity-very-high" />
          <span>Very High</span>
        </div>
      </div>
    </div>
  );
}