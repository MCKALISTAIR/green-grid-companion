import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useYearWrapped } from '@/hooks/useYearWrapped';
import { YearWrappedData } from '@/lib/yearWrappedUtils';
import { format, parse } from 'date-fns';
import {
    Wind, Sun, Flame, Leaf, TrendingDown, TrendingUp,
    Calendar, Sparkles, ChevronRight, ChevronLeft, X,
    Zap, Trophy, TreeDeciduous
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface YearWrappedProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    year?: number;
}

type SlideType = 'intro' | 'coal' | 'renewables' | 'intensity' | 'highlights' | 'summary';

const SLIDES: SlideType[] = ['intro', 'coal', 'renewables', 'intensity', 'highlights', 'summary'];

export function YearWrapped({ open, onOpenChange, year = new Date().getFullYear() - 1 }: YearWrappedProps) {
    const { data, isLoading, progress, error, fetchYearData } = useYearWrapped();
    const [currentSlide, setCurrentSlide] = useState(0);

    useEffect(() => {
        if (open && !data && !isLoading) {
            fetchYearData(year);
            setCurrentSlide(0);
        }
    }, [open, year, data, isLoading, fetchYearData]);

    const nextSlide = () => {
        if (currentSlide < SLIDES.length - 1) {
            setCurrentSlide(prev => prev + 1);
        }
    };

    const prevSlide = () => {
        if (currentSlide > 0) {
            setCurrentSlide(prev => prev - 1);
        }
    };

    const handleClose = () => {
        onOpenChange(false);
        // Reset for next open
        setTimeout(() => setCurrentSlide(0), 300);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg p-0 overflow-hidden bg-gradient-to-br from-background via-background to-primary/5 border-primary/20">
                {isLoading ? (
                    <LoadingSlide progress={progress} year={year} />
                ) : error ? (
                    <ErrorSlide error={error} onClose={handleClose} />
                ) : data ? (
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentSlide}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                            className="min-h-[500px] flex flex-col"
                        >
                            {SLIDES[currentSlide] === 'intro' && <IntroSlide data={data} />}
                            {SLIDES[currentSlide] === 'coal' && <CoalSlide data={data} />}
                            {SLIDES[currentSlide] === 'renewables' && <RenewablesSlide data={data} />}
                            {SLIDES[currentSlide] === 'intensity' && <IntensitySlide data={data} />}
                            {SLIDES[currentSlide] === 'highlights' && <HighlightsSlide data={data} />}
                            {SLIDES[currentSlide] === 'summary' && <SummarySlide data={data} onClose={handleClose} />}

                            {/* Navigation */}
                            <div className="p-4 flex items-center justify-between border-t border-border/50">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={prevSlide}
                                    disabled={currentSlide === 0}
                                    className="gap-1"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    Back
                                </Button>

                                <div className="flex gap-1.5">
                                    {SLIDES.map((_, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setCurrentSlide(i)}
                                            aria-label={`Go to slide ${i + 1}`}
                                            className={cn(
                                                "w-2 h-2 rounded-full transition-all",
                                                i === currentSlide
                                                    ? "bg-primary w-4"
                                                    : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                                            )}
                                        />
                                    ))}
                                </div>

                                {currentSlide < SLIDES.length - 1 ? (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={nextSlide}
                                        className="gap-1"
                                    >
                                        Next
                                        <ChevronRight className="w-4 h-4" />
                                    </Button>
                                ) : (
                                    <Button
                                        variant="default"
                                        size="sm"
                                        onClick={handleClose}
                                    >
                                        Done
                                    </Button>
                                )}
                            </div>
                        </motion.div>
                    </AnimatePresence>
                ) : null}
            </DialogContent>
        </Dialog>
    );
}

function LoadingSlide({ progress, year }: { progress: number; year: number }) {
    return (
        <div className="p-8 flex flex-col items-center justify-center min-h-[500px] text-center gap-6">
            <Sparkles className="w-16 h-16 text-primary animate-pulse" />
            <div>
                <h2 className="text-2xl font-bold mb-2">Your {year} Grid Wrapped</h2>
                <p className="text-muted-foreground">Crunching the numbers...</p>
            </div>
            <div className="w-full max-w-xs">
                <Progress value={progress} className="h-2" />
                <p className="text-sm text-muted-foreground mt-2">{progress}% complete</p>
            </div>
        </div>
    );
}

function ErrorSlide({ error, onClose }: { error: string; onClose: () => void }) {
    return (
        <div className="p-8 flex flex-col items-center justify-center min-h-[500px] text-center gap-6">
            <X className="w-16 h-16 text-destructive" />
            <div>
                <h2 className="text-2xl font-bold mb-2">Oops!</h2>
                <p className="text-muted-foreground">{error}</p>
            </div>
            <Button onClick={onClose}>Close</Button>
        </div>
    );
}

function IntroSlide({ data }: { data: YearWrappedData }) {
    return (
        <div className="p-8 flex flex-col items-center justify-center flex-1 text-center gap-6">
            <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring' as const, delay: 0.2 }}
            >
                <Zap className="w-20 h-20 text-primary" />
            </motion.div>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
            >
                <h1 className="text-4xl font-bold mb-2">{data.year}</h1>
                <h2 className="text-2xl font-semibold text-primary">Grid Wrapped</h2>
            </motion.div>
            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-muted-foreground max-w-xs"
            >
                Your year in UK electricity, from {data.totalDataPoints.toLocaleString()} data points
            </motion.p>
        </div>
    );
}

function CoalSlide({ data }: { data: YearWrappedData }) {
    const formatDateRange = (start: string, end: string) => {
        const startDate = parse(start, 'yyyy-MM-dd', new Date());
        const endDate = parse(end, 'yyyy-MM-dd', new Date());
        return `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d')}`;
    };

    return (
        <div className="p-8 flex flex-col items-center justify-center flex-1 text-center gap-6">
            <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring' as const }}
                className="relative"
            >
                <Flame className="w-20 h-20 text-muted-foreground/30" />
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3 }}
                    className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full p-1"
                >
                    <X className="w-5 h-5" />
                </motion.div>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
            >
                <h2 className="text-xl font-semibold text-muted-foreground mb-1">Coal-Free Days</h2>
                <p className="text-5xl font-bold text-primary">{data.coalFreeDays}</p>
            </motion.div>

            {data.longestCoalFree && data.longestCoalFree.days > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="bg-card/50 rounded-lg p-4 border border-border/50"
                >
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <Trophy className="w-4 h-4 text-chart-4" />
                        Longest streak
                    </div>
                    <p className="text-2xl font-bold">{data.longestCoalFree.days} days</p>
                    <p className="text-xs text-muted-foreground">
                        {formatDateRange(data.longestCoalFree.startDate, data.longestCoalFree.endDate)}
                    </p>
                </motion.div>
            )}
        </div>
    );
}

function RenewablesSlide({ data }: { data: YearWrappedData }) {
    return (
        <div className="p-8 flex flex-col items-center justify-center flex-1 text-center gap-6">
            <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring' as const }}
                className="flex gap-2"
            >
                <Wind className="w-12 h-12 text-gen-wind" />
                <Sun className="w-12 h-12 text-gen-solar" />
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                <h2 className="text-xl font-semibold text-muted-foreground mb-1">Average Renewable Share</h2>
                <p className="text-5xl font-bold text-primary">{data.avgRenewableShare}%</p>
            </motion.div>

            <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
                {data.peakWind && (
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 }}
                        className="bg-card/50 rounded-lg p-3 border border-border/50 text-left"
                    >
                        <Wind className="w-5 h-5 text-gen-wind mb-1" />
                        <p className="text-xs text-muted-foreground">Peak Wind</p>
                        <p className="text-xl font-bold">{data.peakWind.percentage.toFixed(1)}%</p>
                        <p className="text-xs text-muted-foreground">{data.peakWind.date}</p>
                    </motion.div>
                )}

                {data.peakSolar && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 }}
                        className="bg-card/50 rounded-lg p-3 border border-border/50 text-left"
                    >
                        <Sun className="w-5 h-5 text-gen-solar mb-1" />
                        <p className="text-xs text-muted-foreground">Peak Solar</p>
                        <p className="text-xl font-bold">{data.peakSolar.percentage.toFixed(1)}%</p>
                        <p className="text-xs text-muted-foreground">{data.peakSolar.date}</p>
                    </motion.div>
                )}
            </div>
        </div>
    );
}

function IntensitySlide({ data }: { data: YearWrappedData }) {
    return (
        <div className="p-8 flex flex-col items-center justify-center flex-1 text-center gap-6">
            <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring' as const }}
            >
                <Leaf className="w-16 h-16 text-primary" />
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                <h2 className="text-xl font-semibold text-muted-foreground mb-1">Average Carbon Intensity</h2>
                <p className="text-5xl font-bold">{data.avgIntensity}</p>
                <p className="text-sm text-muted-foreground">gCO₂/kWh</p>
            </motion.div>

            <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
                {data.bestMonth && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="bg-primary/10 rounded-lg p-3 border border-primary/20 text-left"
                    >
                        <TrendingDown className="w-5 h-5 text-primary mb-1" />
                        <p className="text-xs text-muted-foreground">Greenest Month</p>
                        <p className="text-lg font-bold text-primary">{data.bestMonth}</p>
                    </motion.div>
                )}

                {data.worstMonth && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="bg-destructive/10 rounded-lg p-3 border border-destructive/20 text-left"
                    >
                        <TrendingUp className="w-5 h-5 text-destructive mb-1" />
                        <p className="text-xs text-muted-foreground">Carbon-Heavy Month</p>
                        <p className="text-lg font-bold text-destructive">{data.worstMonth}</p>
                    </motion.div>
                )}
            </div>

            {data.lowestIntensity && (
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="text-sm text-muted-foreground"
                >
                    Lowest ever: <span className="font-semibold text-primary">{data.lowestIntensity.value} gCO₂/kWh</span> on {data.lowestIntensity.date}
                </motion.p>
            )}
        </div>
    );
}

function HighlightsSlide({ data }: { data: YearWrappedData }) {
    return (
        <div className="p-8 flex flex-col items-center justify-center flex-1 text-center gap-6">
            <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring' as const }}
            >
                <Sparkles className="w-16 h-16 text-chart-4" />
            </motion.div>

            <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-2xl font-bold"
            >
                Highlights
            </motion.h2>

            <div className="space-y-3 w-full max-w-xs">
                {data.greenestDay && (
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-primary/10 rounded-lg p-4 border border-primary/20 text-left flex items-center gap-3"
                    >
                        <TreeDeciduous className="w-8 h-8 text-primary shrink-0" />
                        <div>
                            <p className="text-sm text-muted-foreground">Greenest Day</p>
                            <p className="font-bold">{format(parse(data.greenestDay.date, 'yyyy-MM-dd', new Date()), 'MMMM d')}</p>
                            <p className="text-xs text-primary">{data.greenestDay.renewableShare.toFixed(1)}% renewable</p>
                        </div>
                    </motion.div>
                )}

                {data.lowestIntensity && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 }}
                        className="bg-chart-1/10 rounded-lg p-4 border border-chart-1/20 text-left flex items-center gap-3"
                    >
                        <Zap className="w-8 h-8 text-chart-1 shrink-0" />
                        <div>
                            <p className="text-sm text-muted-foreground">Cleanest Moment</p>
                            <p className="font-bold">{data.lowestIntensity.date} at {data.lowestIntensity.time}</p>
                            <p className="text-xs text-chart-1">{data.lowestIntensity.value} gCO₂/kWh</p>
                        </div>
                    </motion.div>
                )}

                {data.highestIntensity && (
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 }}
                        className="bg-muted rounded-lg p-4 border border-border/50 text-left flex items-center gap-3"
                    >
                        <Flame className="w-8 h-8 text-muted-foreground shrink-0" />
                        <div>
                            <p className="text-sm text-muted-foreground">Peak Carbon</p>
                            <p className="font-bold">{data.highestIntensity.date} at {data.highestIntensity.time}</p>
                            <p className="text-xs text-muted-foreground">{data.highestIntensity.value} gCO₂/kWh</p>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
}

function SummarySlide({ data, onClose }: { data: YearWrappedData; onClose: () => void }) {
    return (
        <div className="p-8 flex flex-col items-center justify-center flex-1 text-center gap-6">
            <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring' as const }}
            >
                <Trophy className="w-16 h-16 text-chart-4" />
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                <h2 className="text-2xl font-bold mb-2">That's a Wrap!</h2>
                <p className="text-muted-foreground">Your {data.year} in numbers</p>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="grid grid-cols-2 gap-3 w-full max-w-xs text-left"
            >
                <div className="bg-card/50 rounded-lg p-3 border border-border/50">
                    <p className="text-2xl font-bold text-primary">{data.coalFreeDays}</p>
                    <p className="text-xs text-muted-foreground">Coal-free days</p>
                </div>
                <div className="bg-card/50 rounded-lg p-3 border border-border/50">
                    <p className="text-2xl font-bold">{data.avgRenewableShare}%</p>
                    <p className="text-xs text-muted-foreground">Avg renewable</p>
                </div>
                <div className="bg-card/50 rounded-lg p-3 border border-border/50">
                    <p className="text-2xl font-bold">{data.avgIntensity}</p>
                    <p className="text-xs text-muted-foreground">Avg gCO₂/kWh</p>
                </div>
                <div className="bg-card/50 rounded-lg p-3 border border-border/50">
                    <p className="text-2xl font-bold">{data.totalDataPoints.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Data points</p>
                </div>
            </motion.div>

            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-sm text-muted-foreground"
            >
                Thanks for tracking the UK grid with us! 💚
            </motion.p>
        </div>
    );
}
