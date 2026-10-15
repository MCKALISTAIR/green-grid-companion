import { getIntensityTextColor } from '@/lib/carbonApi';

interface IntensityGaugeProps {
  value: number;
  index: string;
  label?: string;
}

export function IntensityGauge({ value, index, label }: IntensityGaugeProps) {
  // Map intensity to angle (0-180 degrees for half circle)
  const maxIntensity = 400;
  const angle = Math.min(180, (value / maxIntensity) * 180);

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-20 h-10 overflow-hidden">
        {/* Background arc */}
        <div className="absolute inset-0 rounded-t-full bg-gradient-to-r from-intensity-very-low via-intensity-moderate to-intensity-very-high opacity-30" />

        {/* Gauge needle */}
        <div
          className="absolute bottom-0 left-1/2 w-0.5 h-8 bg-foreground origin-bottom transition-transform duration-500"
          style={{ transform: `translateX(-50%) rotate(${angle - 90}deg)` }}
        />

        {/* Center dot */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-foreground" />
      </div>

      <div className="text-center mt-1">
        <span className={`text-lg font-bold ${getIntensityTextColor(index)}`}>{value}</span>
        <span className="text-xs text-muted-foreground ml-0.5">g</span>
      </div>

      {label && <span className="text-xs text-muted-foreground mt-0.5">{label}</span>}
    </div>
  );
}
