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
}

export function ForecastSummary({ forecast }: ForecastSummaryProps) {
    const stats = useMemo(() => {
        const grouped = new Map<string, number[]>();

        // Group intensity values by date
        forecast.forEach(item => {
            if (item.intensity.forecast === null) return;

            const date = parseISO(item.from);
            const dateKey = format(date, 'yyyy-MM-dd');

            if (!grouped.has(dateKey)) {
                grouped.set(dateKey, []);
            }
            grouped.get(dateKey)?.push(item.intensity.forecast);
        });

        const result: DailyStats[] = [];

        // Calculate stats for each day
        grouped.forEach((values, dateKey) => {
            const date = parseISO(dateKey);
            let label = format(date, 'EEEE'); // e.g., "Monday"

            if (isToday(date)) label = 'Today';
            if (isTomorrow(date)) label = 'Tomorrow';

            const min = Math.min(...values);
            const max = Math.max(...values);
            const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);

            result.push({ date: dateKey, label, min, max, avg });
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
                        <h4 className="font-semibold text-sm mb-3 text-foreground/90 pb-2 border-b border-border/50">
                            {day.label}
                        </h4>

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
                    </Card>
                ))}
            </div>
        </div>
    );
}
