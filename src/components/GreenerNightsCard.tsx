import { format } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useOctopusEnergy } from '@/hooks/useOctopusEnergy';
import { Crown, Moon, Star } from 'lucide-react';

export function GreenerNightsCard() {
  const { isLinked, greennessForecast } = useOctopusEnergy();

  if (!isLinked || !greennessForecast || greennessForecast.length === 0) {
    return null;
  }

  const now = new Date();
  const upcoming = greennessForecast
    .filter((f) => new Date(f.validTo) > now)
    .sort((a, b) => new Date(a.validFrom).getTime() - new Date(b.validFrom).getTime())
    .slice(0, 3);

  if (upcoming.length === 0) return null;

  return (
    <Card className="p-4 bg-primary/5 border-primary/20">
      <div className="flex items-center gap-2 mb-3">
        <Moon className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-foreground">Greener Nights Forecast</h3>
      </div>

      <div className="space-y-3">
        {upcoming.map((slot, idx) => {
          const from = new Date(slot.validFrom);
          const score = slot.greennessScore;
          const isCrown = slot.highlightFlag;

          return (
            <div
              key={idx}
              className="flex items-center justify-between p-2 rounded-xl bg-background/70"
            >
              <div className="flex flex-col">
                <span className="font-medium text-sm">
                  {idx === 0 && isCrown ? 'Tonight' : format(from, 'EEEE')} Night
                </span>
                <span className="text-xs text-muted-foreground">
                  {format(from, 'HH:mm')} - 06:00
                </span>
              </div>

              <div className="flex items-center gap-3">
                {isCrown && (
                  <Badge
                    variant="secondary"
                    className="bg-accent/20 text-accent-foreground border-accent/30 gap-1"
                  >
                    <Crown className="w-3 h-3" />
                    <span className="text-[10px]">Best</span>
                  </Badge>
                )}

                <div className="text-right">
                  <div className="text-lg font-bold font-mono tabular-nums text-foreground leading-none">
                    {score}
                    <span className="text-sm font-normal text-muted-foreground">/100</span>
                  </div>
                  <div className="h-1.5 w-16 bg-muted rounded-full mt-1 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        score > 80
                          ? 'bg-primary'
                          : score > 50
                            ? 'bg-accent'
                            : 'bg-muted-foreground/40'
                      }`}
                      style={{ width: `${score}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 text-xs text-muted-foreground flex gap-1 items-center">
        <Star className="w-3 h-3" />
        <span>Higher score = cleaner energy for charging.</span>
      </div>
    </Card>
  );
}
