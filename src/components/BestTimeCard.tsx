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
  return format(date, 'EEEE');
}

function useBestWorstTimes(forecast: ForecastData[]) {
  if (forecast.length < 6) return null;

  const now = new Date();
  const futureForecast = forecast.filter(f => new Date(f.to) > now);
  if (futureForecast.length < 6) return null;

  let minSum = Infinity, minStartIndex = 0;
  let maxSum = 0, maxStartIndex = 0;

  for (let i = 0; i <= futureForecast.length - 6; i++) {
    const sum = futureForecast.slice(i, i + 6).reduce((acc, f) => acc + f.intensity.forecast, 0);
    if (sum < minSum) { minSum = sum; minStartIndex = i; }
    if (sum > maxSum) { maxSum = sum; maxStartIndex = i; }
  }

  return {
    bestStart: parseISO(futureForecast[minStartIndex].from),
    bestEnd: parseISO(futureForecast[minStartIndex + 5].to),
    worstStart: parseISO(futureForecast[maxStartIndex].from),
    worstEnd: parseISO(futureForecast[maxStartIndex + 5].to),
    minAvg: Math.round(minSum / 6),
    maxAvg: Math.round(maxSum / 6),
  };
}

export function BestTimeSlot({ forecast }: BestTimeCardProps) {
  const data = useBestWorstTimes(forecast);
  if (!data) return null;

  return (
    <Card className="p-4 bg-intensity-very-low/10 border-intensity-very-low/30">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-intensity-very-low/20 flex items-center justify-center shrink-0">
          <TrendingDown className="w-5 h-5 text-intensity-very-low" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <BatteryCharging className="w-4 h-4 text-intensity-very-low" />
            <span className="text-sm font-medium text-foreground">Best time to load-shift</span>
          </div>
          <p className="text-lg font-bold text-intensity-very-low">
            {format(data.bestStart, 'HH:mm')} → {format(data.bestEnd, 'HH:mm')} <span className="text-sm font-medium ml-1 text-muted-foreground">{getDayLabel(data.bestStart)}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            Average: {data.minAvg} gCO₂/kWh
          </p>
        </div>
      </div>
    </Card>
  );
}

export function WorstTimeSlot({ forecast }: BestTimeCardProps) {
  const data = useBestWorstTimes(forecast);
  if (!data) return null;

  return (
    <Card className="p-4 bg-intensity-high/10 border-intensity-high/30">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-intensity-high/20 flex items-center justify-center shrink-0">
          <TrendingUp className="w-5 h-5 text-intensity-high" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">Avoid high usage</span>
          </div>
          <p className="text-lg font-bold text-intensity-high">
            {format(data.worstStart, 'HH:mm')} → {format(data.worstEnd, 'HH:mm')} <span className="text-sm font-medium ml-1 text-muted-foreground">{getDayLabel(data.worstStart)}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            Average: {data.maxAvg} gCO₂/kWh
          </p>
        </div>
      </div>
    </Card>
  );
}

/** @deprecated Use BestTimeSlot and WorstTimeSlot individually */
export function BestTimeCard({ forecast }: BestTimeCardProps) {
  return (
    <div className="space-y-3">
      <BestTimeSlot forecast={forecast} />
      <WorstTimeSlot forecast={forecast} />
    </div>
  );
}