import { useMemo } from 'react';
import { ForecastData } from '@/lib/carbonApi';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { Card } from '@/components/ui/card';
import { TrendingDown, TrendingUp, Activity } from 'lucide-react';

interface ForecastSummaryProps {
    forecast: ForecastData[];
}

interface DailyStats {
    date: string;
    label: string;
    min: number;
    max: number;
    avg: number;
    avgActual?: number;
    hasActuals: boolean;
}

export function ForecastSummary({ forecast }: ForecastSummaryProps) {
    const stats = useMemo(() => {
        const grouped = new Map<string, { forecast: number[], actual: number[] }>();

        // Group intensity values by date
        forecast.forEach(item => {
            if (item.intensity.forecast === null) return;

            const date = parseISO(item.from);
            const dateKey = format(date, 'yyyy-MM-dd');

            if (!grouped.has(dateKey)) {
                grouped.set(dateKey, { forecast: [], actual: [] });
            }
            const group = grouped.get(dateKey)!;
            group.forecast.push(item.intensity.forecast);

            if (item.intensity.actual !== undefined && item.intensity.actual !== null) {
                group.actual.push(item.intensity.actual);
            }
        });

        const result: DailyStats[] = [];

        // Calculate stats for each day
        grouped.forEach((values, dateKey) => {
            const date = parseISO(dateKey);
            let label = format(date, 'EEEE'); // e.g., "Monday"

            if (isToday(date)) label = 'Today';
            if (isTomorrow(date)) label = 'Tomorrow';

            const min = Math.min(...values.forecast);
            const max = Math.max(...values.forecast);
            const avg = Math.round(values.forecast.reduce((a, b) => a + b, 0) / values.forecast.length);

            const now = new Date();
            now.setHours(0, 0, 0, 0); // Start of today
            const isFutureDay = date.getTime() > now.getTime();

            const hasActuals = !isFutureDay && values.actual.length > 0;
            const avgActual = hasActuals
                ? Math.round(values.actual.reduce((a, b) => a + b, 0) / values.actual.length)
                : undefined;

            result.push({ date: dateKey, label, min, max, avg, avgActual, hasActuals });
        });

        // Sort by date to ensure correct order
        return result.sort((a, b) => a.date.localeCompare(b.date));
    }, [forecast]);

    if (stats.length === 0) return null;

    return (
        <div className="space-y-3">
            <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                <span>📅</span> 48-Hour Overview
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {stats.map((day) => (
                    <Card key={day.date} className="p-3 bg-card/50">
                        <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/50">
                            <h4 className="font-semibold text-sm text-foreground/90">
                                {day.label}
                            </h4>
                            {day.hasActuals && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary/20 text-secondary-foreground font-medium">
                                    Actuals Available
                                </span>
                            )}
                        </div>

                        {day.hasActuals ? (
                            <div className="flex items-center justify-around gap-2">
                                {/* Predicted Avg */}
                                <div className="flex flex-col items-center gap-1">
                                    <div className="p-1.5 rounded-full bg-muted/20">
                                        <Activity className="w-4 h-4 text-muted-foreground" />
                                    </div>
                                    <span className="text-sm font-bold text-muted-foreground">{day.avg}</span>
                                    <span className="text-[10px] text-muted-foreground uppercase">Pred. Avg</span>
                                </div>

                                {/* Divider */}
                                <div className="h-8 w-px bg-border/50" />

                                {/* Actual Avg */}
                                <div className="flex flex-col items-center gap-1">
                                    <div className="p-1.5 rounded-full bg-primary/10">
                                        <Activity className="w-4 h-4 text-primary" />
                                    </div>
                                    <span className="text-sm font-bold text-foreground">{day.avgActual}</span>
                                    <span className="text-[10px] text-primary uppercase font-semibold">Act. Avg</span>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-3 gap-2 text-center">
                                {/* Lowest */}
                                <div className="flex flex-col items-center gap-1">
                                    <div className="p-1.5 rounded-full bg-intensity-very-low/10">
                                        <TrendingDown className="w-4 h-4 text-intensity-very-low" />
                                    </div>
                                    <span className="text-sm font-bold text-foreground">{day.min}</span>
                                    <span className="text-[10px] text-muted-foreground uppercase">Low</span>
                                </div>

                                {/* Average */}
                                <div className="flex flex-col items-center gap-1 border-l border-r border-border/30">
                                    <div className="p-1.5 rounded-full bg-intensity-moderate/10">
                                        <Activity className="w-4 h-4 text-intensity-moderate" />
                                    </div>
                                    <span className="text-sm font-bold text-foreground">{day.avg}</span>
                                    <span className="text-[10px] text-muted-foreground uppercase">Avg</span>
                                </div>

                                {/* Highest */}
                                <div className="flex flex-col items-center gap-1">
                                    <div className="p-1.5 rounded-full bg-intensity-very-high/10">
                                        <TrendingUp className="w-4 h-4 text-intensity-very-high" />
                                    </div>
                                    <span className="text-sm font-bold text-foreground">{day.max}</span>
                                    <span className="text-[10px] text-muted-foreground uppercase">High</span>
                                </div>
                            </div>
                        )}
                    </Card>
                ))}
            </div>
        </div>
    );
}
