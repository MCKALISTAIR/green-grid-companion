import { format } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useOctopusEnergy } from '@/hooks/useOctopusEnergy';
import { Crown, Moon, Star } from 'lucide-react';

export function GreenerNightsCard() {
    const { status, isLinked, greennessForecast } = useOctopusEnergy();

    // 1. Safety Check: Only show if linked
    if (!isLinked || !greennessForecast || greennessForecast.length === 0) {
        return null;
    }

    // 2. Process data: Find upcoming windows (future only)
    const now = new Date();
    const upcoming = greennessForecast
        .filter(f => new Date(f.validTo) > now)
        .sort((a, b) => new Date(a.validFrom).getTime() - new Date(b.validFrom).getTime())
        .slice(0, 3); // Show next 3 slots

    if (upcoming.length === 0) return null;

    return (
        <Card className="p-4 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20 border-purple-100 dark:border-purple-900">
            <div className="flex items-center gap-2 mb-3">
                <Moon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <h3 className="font-semibold text-foreground">Greener Nights Forecast</h3>
            </div>

            <div className="space-y-3">
                {upcoming.map((slot, idx) => {
                    const from = new Date(slot.validFrom);
                    const score = slot.greennessScore;
                    const isCrown = slot.highlightFlag;

                    return (
                        <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-white/60 dark:bg-black/20">
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
                                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-yellow-200 gap-1">
                                        <Crown className="w-3 h-3" />
                                        <span className="text-[10px]">Best</span>
                                    </Badge>
                                )}

                                <div className="text-right">
                                    <div className="text-lg font-bold text-slate-700 dark:text-slate-200 leading-none">
                                        {score}<span className="text-sm font-normal text-muted-foreground">/100</span>
                                    </div>
                                    <div className="h-1.5 w-16 bg-slate-200 rounded-full mt-1 overflow-hidden">
                                        <div
                                            className={`h-full rounded-full ${score > 80 ? 'bg-green-500' : score > 50 ? 'bg-yellow-500' : 'bg-slate-400'
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
