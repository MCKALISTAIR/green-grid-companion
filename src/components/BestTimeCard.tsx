import { ForecastData } from '@/lib/carbonApi';
import { format, parseISO, isTomorrow, isToday } from 'date-fns';
import { BatteryCharging, TrendingDown, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface BestTimeCardProps {
  forecast: ForecastData[];
}

function getDayLabel(date: Date) {
  if (isToday(date)) return '';
  if (isTomorrow(date)) return 'tomorrow';
  return format(date, 'EEEE'); // e.g. "Monday"
}

export function BestTimeCard({ forecast }: BestTimeCardProps) {
  if (forecast.length < 6) return null;

  // Filter for future times only (or current window)
  const now = new Date();
  const futureForecast = forecast.filter(f => new Date(f.to) > now);

  if (futureForecast.length < 6) return null;

  // Find the 3-hour window with lowest average intensity
  let minSum = Infinity;
  let minStartIndex = 0;

  for (let i = 0; i <= futureForecast.length - 6; i++) {
    const sum = futureForecast.slice(i, i + 6).reduce((acc, f) => acc + f.intensity.forecast, 0);
    if (sum < minSum) {
      minSum = sum;
      minStartIndex = i;
    }
  }

  // Find the worst 3-hour window too
  let maxSum = 0;
  let maxStartIndex = 0;

  for (let i = 0; i <= futureForecast.length - 6; i++) {
    const sum = futureForecast.slice(i, i + 6).reduce((acc, f) => acc + f.intensity.forecast, 0);
    if (sum > maxSum) {
      maxSum = sum;
      maxStartIndex = i;
    }
  }

  const bestStart = parseISO(futureForecast[minStartIndex].from);
  const bestEnd = parseISO(futureForecast[minStartIndex + 5].to);
  const worstStart = parseISO(futureForecast[maxStartIndex].from);
  const worstEnd = parseISO(futureForecast[maxStartIndex + 5].to);

  return (
    <div className="space-y-3">
      {/* Best time */}
      <Card className="p-4 bg-intensity-very-low/10 border-intensity-very-low/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-intensity-very-low/20 flex items-center justify-center">
            <TrendingDown className="w-5 h-5 text-intensity-very-low" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <BatteryCharging className="w-4 h-4 text-intensity-very-low" />
              <span className="text-sm font-medium text-foreground">Best time to load-shift</span>
            </div>
            <p className="text-lg font-bold text-intensity-very-low">
              {format(bestStart, 'HH:mm')} → {format(bestEnd, 'HH:mm')} <span className="text-sm font-medium ml-1 text-muted-foreground">{getDayLabel(bestStart)}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Average: {Math.round(minSum / 6)} gCO₂/kWh
            </p>
          </div>
        </div>
      </Card>

      {/* Worst time */}
      <Card className="p-4 bg-intensity-high/10 border-intensity-high/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-intensity-high/20 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-intensity-high" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">Avoid high usage</span>
            </div>
            <p className="text-lg font-bold text-intensity-high">
              {format(worstStart, 'HH:mm')} → {format(worstEnd, 'HH:mm')} <span className="text-sm font-medium ml-1 text-muted-foreground">{getDayLabel(worstStart)}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Average: {Math.round(maxSum / 6)} gCO₂/kWh
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}