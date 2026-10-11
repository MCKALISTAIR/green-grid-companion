import { useMemo } from 'react';
import { ForecastData } from '@/lib/carbonApi';
import { Card } from '@/components/ui/card';
import { TrendingDown, TrendingUp, Activity } from 'lucide-react';
import { motion, type Variants } from 'framer-motion';
import { getDailyStats } from '@/lib/dayForecast';

interface ForecastSummaryProps {
    forecast: ForecastData[];
    /** NESO region id (null/0 = GB national). */
    regionId?: number | null;
    /** Region display name for the zero-forecast note. */
    regionName?: string;
}

/** Missing values render as an en dash with a spoken "no data", never 0. */
function Value({ value, className }: { value: number | null; className?: string }) {
    if (value === null) {
        return (
            <span className={className}>
                <span aria-hidden>{'\u2013'}</span>
                <span className="sr-only">no data</span>
            </span>
        );
    }
    return <span className={className}>{value}</span>;
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

export function ForecastSummary({ forecast, regionId = null, regionName = '' }: ForecastSummaryProps) {
    const stats = useMemo(() => getDailyStats(forecast), [forecast]);
    const isRegional = !!regionId;
    const displayRegion = regionName && regionName !== 'National' ? regionName : 'Great Britain';
    const showZeroNote = isRegional && stats.some((d) => d.allZero);

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
                        data-testid="forecast-day-card"
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

                                {day.avg === null ? (
                                    <p className="py-3 text-center text-sm text-muted-foreground" data-testid="forecast-day-empty">No data yet</p>
                                ) : day.hasActuals ? (
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
                                                    <Value value={day.min} className="text-xs font-semibold text-muted-foreground/70" />
                                                    <span className="text-[9px] text-muted-foreground/50 uppercase scale-90">Pred</span>
                                                </div>
                                                <div className="flex flex-col border-l border-border/30">
                                                    <Value value={day.minActual} className="text-xs font-bold text-foreground" />
                                                    <span className="text-[9px] text-primary uppercase scale-90">{day.actualsEstimated ? 'Est' : 'Act'}</span>
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
                                                    <Value value={day.avg} className="text-xs font-semibold text-muted-foreground/70" />
                                                    <span className="text-[9px] text-muted-foreground/50 uppercase scale-90">Pred</span>
                                                </div>
                                                <div className="flex flex-col border-l border-border/30">
                                                    <Value value={day.avgActual} className="text-xs font-bold text-foreground" />
                                                    <span className="text-[9px] text-primary uppercase scale-90">{day.actualsEstimated ? 'Est' : 'Act'}</span>
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
                                                    <Value value={day.max} className="text-xs font-semibold text-muted-foreground/70" />
                                                    <span className="text-[9px] text-muted-foreground/50 uppercase scale-90">Pred</span>
                                                </div>
                                                <div className="flex flex-col border-l border-border/30">
                                                    <Value value={day.maxActual} className="text-xs font-bold text-foreground" />
                                                    <span className="text-[9px] text-primary uppercase scale-90">{day.actualsEstimated ? 'Est' : 'Act'}</span>
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
                                            <Value value={day.min} className="text-sm font-bold text-foreground" />
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
                                            <Value value={day.avg} className="text-sm font-bold text-foreground" />
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
                                            <Value value={day.max} className="text-sm font-bold text-foreground" />
                                            <span className="text-[10px] text-muted-foreground uppercase">High</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Card>
                    </motion.div>
                ))}
            </div>

            {showZeroNote && (
                <p className="px-1 text-xs text-muted-foreground" data-testid="forecast-zero-note">
                    NESO's regional forecast for {displayRegion} is 0 when local power is almost all wind and nuclear.
                    Apps showing a higher number are usually using the GB-wide figure.
                </p>
            )}

        </div>
    );
}
