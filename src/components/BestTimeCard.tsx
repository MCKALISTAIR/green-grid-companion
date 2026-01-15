import { ForecastData } from '@/lib/carbonApi';
import { format, parseISO } from 'date-fns';
import { BatteryCharging, TrendingDown, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface BestTimeCardProps {
  forecast: ForecastData[];
}

export function BestTimeCard({ forecast }: BestTimeCardProps) {
  if (forecast.length < 4) return null;

  // Find the 4-hour window with lowest average intensity
  let minSum = Infinity;
  let minStartIndex = 0;

  for (let i = 0; i <= forecast.length - 4; i++) {
    const sum = forecast.slice(i, i + 4).reduce((acc, f) => acc + f.intensity.forecast, 0);
    if (sum < minSum) {
      minSum = sum;
      minStartIndex = i;
    }
  }

  // Find the worst 4-hour window too
  let maxSum = 0;
  let maxStartIndex = 0;

  for (let i = 0; i <= forecast.length - 4; i++) {
    const sum = forecast.slice(i, i + 4).reduce((acc, f) => acc + f.intensity.forecast, 0);
    if (sum > maxSum) {
      maxSum = sum;
      maxStartIndex = i;
    }
  }

  const bestStart = parseISO(forecast[minStartIndex].from);
  const bestEnd = parseISO(forecast[minStartIndex + 3].to);
  const worstStart = parseISO(forecast[maxStartIndex].from);
  const worstEnd = parseISO(forecast[maxStartIndex + 3].to);

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
              <span className="text-sm font-medium text-foreground">Best time to charge</span>
            </div>
            <p className="text-lg font-bold text-intensity-very-low">
              {format(bestStart, 'HH:mm')} → {format(bestEnd, 'HH:mm')}
            </p>
            <p className="text-xs text-muted-foreground">
              Average: {Math.round(minSum / 4)} gCO₂/kWh
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
              {format(worstStart, 'HH:mm')} → {format(worstEnd, 'HH:mm')}
            </p>
            <p className="text-xs text-muted-foreground">
              Average: {Math.round(maxSum / 4)} gCO₂/kWh
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}