import { GenerationMix } from '@/lib/carbonApi';

interface GenerationMixBarProps {
  mix: GenerationMix[];
}

const fuelColors: Record<string, string> = {
  wind: 'bg-gen-wind',
  solar: 'bg-gen-solar',
  nuclear: 'bg-gen-nuclear',
  gas: 'bg-gen-gas',
  coal: 'bg-gen-coal',
  hydro: 'bg-gen-hydro',
  biomass: 'bg-gen-biomass',
  imports: 'bg-gen-imports',
  other: 'bg-gen-other',
};

const fuelLabels: Record<string, string> = {
  wind: '💨 Wind',
  solar: '☀️ Solar',
  nuclear: '⚛️ Nuclear',
  gas: '🔥 Gas',
  coal: '⬛ Coal',
  hydro: '💧 Hydro',
  biomass: '🌿 Biomass',
  imports: '🔌 Imports',
  other: '❓ Other',
};

export function GenerationMixBar({ mix }: GenerationMixBarProps) {
  // Filter out zero values and sort by percentage
  const sortedMix = [...mix]
    .filter(m => m.perc > 0)
    .sort((a, b) => b.perc - a.perc);

  const renewables = mix
    .filter(m => ['wind', 'solar', 'hydro', 'biomass'].includes(m.fuel.toLowerCase()))
    .reduce((acc, m) => acc + m.perc, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Generation Mix</h3>
        <span className="text-xs text-primary font-medium">
          {renewables.toFixed(0)}% Renewable
        </span>
      </div>
      
      {/* Bar visualization */}
      <div className="h-4 rounded-full overflow-hidden flex shadow-inner bg-muted/30">
        {sortedMix.map((item) => (
          <div
            key={item.fuel}
            className={`${fuelColors[item.fuel.toLowerCase()] || 'bg-gen-other'} transition-all duration-500`}
            style={{ width: `${item.perc}%` }}
            title={`${item.fuel}: ${item.perc.toFixed(1)}%`}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {sortedMix.slice(0, 6).map((item) => (
          <div 
            key={item.fuel}
            className="flex items-center gap-1.5 text-xs text-muted-foreground"
          >
            <div className={`w-2.5 h-2.5 rounded-full ${fuelColors[item.fuel.toLowerCase()] || 'bg-gen-other'}`} />
            <span>{item.fuel}</span>
            <span className="font-medium text-foreground">{item.perc.toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}