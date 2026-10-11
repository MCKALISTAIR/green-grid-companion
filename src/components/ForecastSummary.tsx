import { useMemo } from 'react';
import { ForecastData } from '@/lib/carbonApi';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { Card } from '@/components/ui/card';
import { TrendingDown, TrendingUp, Activity } from 'lucide-react';
import { motion, type Variants } from 'framer-motion';

interface ForecastSummaryProps {
    forecast: ForecastData[];
}

interface DailyStats {
    date: string;
    label: string;
    min: number;
    max: number;
    avg: number;
    minActual?: number;
    maxActual?: number;
    avgActual?: number;
    hasActuals: boolean;
    /** Past values were calculated by GridSense from the fuel mix, not published by NESO. */
    actualsEstimated?: boolean;
}

const cardVariants: Variants = {
    hidden: { opacity: 0, y: 10 },
    show: (idx: number) => ({
        opacity: 1,
        y: 0,
        transition: {
            type: 'spring' as const,
            stiffness: 220,
            damping: 22,
            delay: idx * 0.05,
        }
    })
};

const iconLowVariants: Variants = {
    initial: { y: 0 },
    hover: { y: [0, 2.5, 0], transition: { duration: 0.4, ease: 'easeInOut' as const } }
};

const iconAvgVariants: Variants = {
    initial: { scale: 1, rotate: 0 },
    hover: {
        scale: [1, 1.12, 1],
        rotate: [0, -10, 10, -5, 5, 0],
        transition: { duration: 0.5, ease: 'easeInOut' as const }
    }
};

const iconHighVariants: Variants = {
    initial: { y: 0 },
    hover: { y: [0, -2.5, 0], transition: { duration: 0.4, ease: 'easeInOut' as const } }
};

export function ForecastSummary({ forecast }: ForecastSummaryProps) {
    const stats = useMemo(() => {
        const grouped = new Map<string, { forecast: number[], actual: number[], estimated?: boolean }>();

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
                if (item.intensity.actualEstimated) group.estimated = true;
            }
        });

        const result: DailyStats[] = [];

        // Group actuals/forecast values
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
            const isPastDay = date.getTime() < now.getTime(); // Strictly less than (not today)

            const hasActuals = isPastDay && values.actual.length > 0;

            let minActual, maxActual, avgActual;

            if (hasActuals) {
                minActual = Math.min(...values.actual);
                maxActual = Math.max(...values.actual);
                avgActual = Math.round(values.actual.reduce((a, b) => a + b, 0) / values.actual.length);
            }

            result.push({ date: dateKey, label, min, max, avg, minActual, maxActual, avgActual, hasActuals, actualsEstimated: Boolean(values.estimated) });
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
                {stats.map((day, idx) => (
                    <motion.div
                        key={day.date}
                        custom={idx}
                        variants={cardVariants}
                        initial="hidden"
                        animate="show"
                        whileHover="hover"
                        className="cursor-pointer"
                    >
                        <Card className="p-3 bg-card/50 hover:bg-card/75 border-border/40 hover:border-border/80 transition-all duration-350 shadow-sm hover:shadow-md h-full flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/50">
                                    <h4 className="font-semibold text-sm text-foreground/90">
                                        {day.label}
                                    </h4>
                                    {day.hasActuals && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary/20 text-secondary-foreground font-medium transition-colors hover:bg-secondary/30">
                                            {day.actualsEstimated ? 'GridSense estimates' : 'Actuals Available'}
                                        </span>
                                    )}
                                </div>

                                {day.hasActuals ? (
                                    <div className="grid grid-cols-3 gap-2">
                                        {/* Lowest Comparison */}
                                        <div className="flex flex-col items-center gap-1">
                                            <motion.div
                                                variants={iconLowVariants}
                                                className="p-1.5 rounded-full bg-intensity-very-low/10 mb-1"
                                            >
                                                <TrendingDown className="w-4 h-4 text-intensity-very-low" />
                                            </motion.div>
                                            <div className="grid grid-cols-2 gap-x-2 text-center w-full px-1">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-semibold text-muted-foreground/70">{day.min}</span>
                                                    <span className="text-[9px] text-muted-foreground/50 uppercase scale-90">Pred</span>
                                                </div>
                                                <div className="flex flex-col border-l border-border/30">
                                                    <span className="text-xs font-bold text-foreground">{day.minActual}</span>
                                                    <span className="text-[9px] text-primary uppercase scale-90">Act</span>
                                                </div>
                                            </div>
                                            <span className="text-[10px] text-muted-foreground uppercase font-medium mt-1">Low</span>
                                        </div>

                                        {/* Average Comparison */}
                                        <div className="flex flex-col items-center gap-1 border-l border-r border-border/30 px-1">
                                            <motion.div
                                                variants={iconAvgVariants}
                                                className="p-1.5 rounded-full bg-intensity-moderate/10 mb-1"
                                            >
                                                <Activity className="w-4 h-4 text-intensity-moderate" />
                                            </motion.div>
                                            <div className="grid grid-cols-2 gap-x-2 text-center w-full px-1">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-semibold text-muted-foreground/70">{day.avg}</span>
                                                    <span className="text-[9px] text-muted-foreground/50 uppercase scale-90">Pred</span>
                                                </div>
                                                <div className="flex flex-col border-l border-border/30">
                                                    <span className="text-xs font-bold text-foreground">{day.avgActual}</span>
                                                    <span className="text-[9px] text-primary uppercase scale-90">Act</span>
                                                </div>
                                            </div>
                                            <span className="text-[10px] text-muted-foreground uppercase font-medium mt-1">Avg</span>
                                        </div>

                                        {/* Highest Comparison */}
                                        <div className="flex flex-col items-center gap-1">
                                            <motion.div
                                                variants={iconHighVariants}
                                                className="p-1.5 rounded-full bg-intensity-very-high/10 mb-1"
                                            >
                                                <TrendingUp className="w-4 h-4 text-intensity-very-high" />
                                            </motion.div>
                                            <div className="grid grid-cols-2 gap-x-2 text-center w-full px-1">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-semibold text-muted-foreground/70">{day.max}</span>
                                                    <span className="text-[9px] text-muted-foreground/50 uppercase scale-90">Pred</span>
                                                </div>
                                                <div className="flex flex-col border-l border-border/30">
                                                    <span className="text-xs font-bold text-foreground">{day.maxActual}</span>
                                                    <span className="text-[9px] text-primary uppercase scale-90">Act</span>
                                                </div>
                                            </div>
                                            <span className="text-[10px] text-muted-foreground uppercase font-medium mt-1">High</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-3 gap-2 text-center">
                                        {/* Lowest */}
                                        <div className="flex flex-col items-center gap-1">
                                            <motion.div
                                                variants={iconLowVariants}
                                                className="p-1.5 rounded-full bg-intensity-very-low/10"
                                            >
                                                <TrendingDown className="w-4 h-4 text-intensity-very-low" />
                                            </motion.div>
                                            <span className="text-sm font-bold text-foreground">{day.min}</span>
                                            <span className="text-[10px] text-muted-foreground uppercase">Low</span>
                                        </div>

                                        {/* Average */}
                                        <div className="flex flex-col items-center gap-1 border-l border-r border-border/30">
                                            <motion.div
                                                variants={iconAvgVariants}
                                                className="p-1.5 rounded-full bg-intensity-moderate/10"
                                            >
                                                <Activity className="w-4 h-4 text-intensity-moderate" />
                                            </motion.div>
                                            <span className="text-sm font-bold text-foreground">{day.avg}</span>
                                            <span className="text-[10px] text-muted-foreground uppercase">Avg</span>
                                        </div>

                                        {/* Highest */}
                                        <div className="flex flex-col items-center gap-1">
                                            <motion.div
                                                variants={iconHighVariants}
                                                className="p-1.5 rounded-full bg-intensity-very-high/10"
                                            >
                                                <TrendingUp className="w-4 h-4 text-intensity-very-high" />
                                            </motion.div>
                                            <span className="text-sm font-bold text-foreground">{day.max}</span>
                                            <span className="text-[10px] text-muted-foreground uppercase">High</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Card>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
