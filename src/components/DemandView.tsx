import { Zap, RefreshCw, AlertTriangle, Info, Activity, Home } from 'lucide-react';
import { motion, useSpring, useTransform } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { GenerationMixBar, getFuelIcon, getFuelHex } from '@/components/GenerationMixBar';
import { useGridDemand, MixWithTrend } from '@/hooks/useGridDemand';
import { useSettings } from '@/hooks/useSettings';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useFuelStreaks } from '@/hooks/useFuelStreaks';
import { useFuelMilestones } from '@/hooks/useFuelMilestones';
import { FuelInsightBadge } from '@/components/FuelInsightBadge';
import { FuelRecordList } from '@/components/FuelRecordCelebration';
import { FuelTrendIndicator } from '@/components/FuelTrendIndicator';
import { DEFINITIONS } from '@/lib/definitions';
import { StaleDataBadge } from '@/components/StaleDataBadge';
import { useRelativeTime } from '@/hooks/useRelativeTime';
import { useEffect, useState } from 'react';

export function DemandView() {
    const { demand, mix, mixWithTrends, frequency: gridFrequency, embeddedSolarMW, isLoading, error, refetch, lastUpdated } = useGridDemand();
    const { showGridFrequency } = useSettings();
    const { streaks, newRecords, dismissRecord } = useFuelStreaks(mix);
    const { milestones } = useFuelMilestones(mix);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-8 space-y-4 animate-in fade-in">
                <RefreshCw className="w-8 h-8 text-muted-foreground animate-spin" />
                <p className="text-sm text-muted-foreground">Loading grid demand...</p>
            </div>
        );
    }

    // Only show full error if we have NO data at all (no mix)
    if (error && !mix.length) {
        return (
            <div className="flex flex-col items-center justify-center p-8 space-y-4 animate-in fade-in text-center">
                <AlertTriangle className="w-8 h-8 text-yellow-500" />
                <div className="space-y-1">
                    <p className="font-medium">Unable to load grid data</p>
                    <p className="text-sm text-muted-foreground">
                        Current grid data is temporarily unavailable.
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                    Retry
                </Button>
            </div>
        );
    }

    // Convert demand to GW if available
    const demandGW = demand ? (demand / 1000).toFixed(2) : null;
    const updatedTime = lastUpdated ? new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null;
    const relativeTime = useRelativeTime(lastUpdated);

    // Spring-animated GW number
    const rawDemandGW = demand ? demand / 1000 : 0;
    const springDemand = useSpring(rawDemandGW, { stiffness: 160, damping: 22 });
    const springDemandDisplay = useTransform(springDemand, (v) => v.toFixed(2));
    const [displayDemandGW, setDisplayDemandGW] = useState(rawDemandGW.toFixed(2));
    useEffect(() => {
      springDemand.set(rawDemandGW);
      const unsub = springDemandDisplay.on('change', setDisplayDemandGW);
      return unsub;
    }, [rawDemandGW, springDemand, springDemandDisplay]);

    // Freshness dot: green < 10 min, amber 10-35 min, red > 35 min
    const freshnessColor = (() => {
      if (!lastUpdated) return 'bg-muted-foreground/40';
      const ageMins = (Date.now() - new Date(lastUpdated).getTime()) / 60000;
      if (ageMins < 10) return 'bg-emerald-500';
      if (ageMins < 35) return 'bg-amber-400';
      return 'bg-destructive';
    })();

    // Sort mix by percentage descending (use mixWithTrends for the cards)
    const sortedMix = [...mix].sort((a, b) => b.perc - a.perc);
    const sortedMixWithTrends = [...mixWithTrends].sort((a, b) => b.perc - a.perc);

    // Create lookup maps for streaks and milestones by fuel
    const streakByFuel = Object.fromEntries(streaks.map(s => [s.fuel, s]));
    const milestoneByFuel = Object.fromEntries(milestones.map(m => [m.fuel, m]));

    // Active streaks (fossil fuels currently at 0%)
    const activeStreaks = streaks.filter(s => s.isActive && s.days > 0);

    // Has any interesting insights to show
    const hasInsights = activeStreaks.length > 0 || milestones.length > 0;

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Record celebrations */}
            {newRecords.length > 0 && (
                <FuelRecordList records={newRecords} onDismiss={dismissRecord} />
            )}

            {/* Insights Summary - shows active streaks and milestones */}
            {hasInsights && (
                <Card className="p-4 shadow-lg bg-gradient-to-br from-card to-accent/5 border-primary/10">
                    <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                        Grid Insights
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {activeStreaks.map(streak => (
                            <FuelInsightBadge key={`streak-${streak.fuel}`} streak={streak} />
                        ))}
                        {milestones.map(milestone => (
                            <FuelInsightBadge key={`milestone-${milestone.fuel}`} milestone={milestone} />
                        ))}
                    </div>
                </Card>
            )}

            {/* Demand Highlights Card */}
            <div className={`grid gap-4 ${showGridFrequency ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
                <Card className="p-5 shadow-lg bg-card/50 backdrop-blur-sm border-primary/10">
                    <div className="flex items-start justify-between">
                        <div>
                            <div className="flex items-center gap-1.5">
                                <p className="text-sm font-medium text-muted-foreground">Total Grid Demand</p>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full p-0 hover:bg-transparent">
                                            <Info className="w-3.5 h-3.5 text-muted-foreground/70 cursor-help" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[280px] p-3 text-xs bg-card border-border backdrop-blur-xl">
                                        <p className="font-semibold mb-1">UK-Wide Data</p>
                                        <p>This shows total demand for the entire UK electricity grid. The grid operates as a single synchronized system.</p>

                                        <div className="mt-3 pt-2 border-t border-border/50">
                                            <p className="font-semibold mb-1">Units (GW)</p>
                                            <p>{DEFINITIONS['GW']}</p>
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <h2 className="text-4xl font-bold tracking-tight mt-1 text-primary">
                                {demandGW ? (
                                    <>
                                        <motion.span key={demandGW}>{displayDemandGW}</motion.span>{' '}
                                        <span className="text-lg font-medium text-muted-foreground/80">GW</span>
                                    </>
                                ) : (
                                    <span className="text-2xl text-muted-foreground/50">Unavailable</span>
                                )}
                            </h2>
                            {lastUpdated && (
                                <div className="flex items-center gap-2 mt-2">
                                    {/* Pulsing freshness dot */}
                                    <span className="relative flex h-2 w-2 flex-shrink-0">
                                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-60 ${freshnessColor}`} />
                                        <span className={`relative inline-flex h-2 w-2 rounded-full ${freshnessColor}`} />
                                    </span>
                                    <p className="text-xs text-muted-foreground">
                                        {relativeTime}
                                    </p>
                                    <StaleDataBadge lastUpdated={lastUpdated} />
                                </div>
                            )}
                        </div>
                        <div className="p-3 bg-primary/10 rounded-full">
                            <Zap className="w-6 h-6 text-primary" />
                        </div>
                    </div>
                </Card>

                {/* Grid Frequency Card - only shown when enabled in settings */}
                {showGridFrequency && (
                    <Card className="p-5 shadow-lg bg-card/50 backdrop-blur-sm border-primary/10 flex flex-col justify-center">
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-medium text-muted-foreground">Grid Frequency</p>
                                    {typeof gridFrequency === 'number' && !isNaN(gridFrequency) && (
                                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                                            LIVE
                                        </span>
                                    )}
                                </div>
                                {typeof gridFrequency === 'number' && !isNaN(gridFrequency) ? (
                                    <>
                                        <div className="flex items-baseline gap-2 mt-1">
                                            <h2 className="text-4xl font-bold tracking-tight text-primary">
                                                {gridFrequency.toFixed(3)}
                                            </h2>
                                            <span className="text-lg font-medium text-muted-foreground/80">Hz</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-2">Target: 50.00 Hz</p>
                                    </>
                                ) : (
                                    <div className="mt-2">
                                        <p className="text-sm text-muted-foreground/70">
                                            Live frequency unavailable
                                        </p>
                                        <p className="text-xs text-muted-foreground/50 mt-1">
                                            Real-time data temporarily inaccessible
                                        </p>
                                    </div>
                                )}
                            </div>
                            <div className="p-3 bg-primary/10 rounded-full">
                                <Activity className="w-6 h-6 text-primary" />
                            </div>
                        </div>
                    </Card>
                )}
            </div>

            {/* Generation Breakdown */}
            <Card className="p-4 shadow-lg">
                <GenerationMixBar mix={sortedMix} showMW={true} embeddedSolarMW={embeddedSolarMW} />
            </Card>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3" style={{ perspective: '900px' }}>
                {sortedMixWithTrends.map((source, idx) => {
                    const fuelKey = source.fuel?.toLowerCase() || source.name?.toLowerCase() || '';
                    const streak = streakByFuel[fuelKey];
                    const milestone = milestoneByFuel[fuelKey];
                    const hasInsight = (streak?.isActive) || milestone;
                    const Icon = getFuelIcon(fuelKey);
                    const hex = getFuelHex(fuelKey);
                    const r = parseInt(hex.slice(1, 3), 16);
                    const g = parseInt(hex.slice(3, 5), 16);
                    const b = parseInt(hex.slice(5, 7), 16);
                    const isRenewable = ['wind', 'solar', 'hydro', 'biomass'].includes(fuelKey);
                    const isZero = source.perc === 0;

                    return (
                    <motion.div
                            key={source.id}
                            initial={{ opacity: 0, rotateY: 90 }}
                            animate={{ opacity: 1, rotateY: 0 }}
                            transition={{
                              delay: idx * 0.05,
                              duration: 0.4,
                              ease: [0.25, 0.46, 0.45, 0.94],
                            }}
                            style={{ transformOrigin: 'left center', transformStyle: 'preserve-3d' }}
                            whileHover={{ y: -2 }}
                        >
                            <Card
                                className={`relative p-3 pb-4 overflow-hidden shadow-sm hover:shadow-md transition-shadow ${hasInsight ? 'ring-1 ring-primary/30' : ''}`}
                                style={{
                                    background: `linear-gradient(135deg, rgba(${r},${g},${b},0.10) 0%, rgba(${r},${g},${b},0.02) 60%, transparent 100%)`,
                                    borderColor: `rgba(${r},${g},${b},0.25)`,
                                }}
                            >
                                {/* Accent stripe */}
                                <div
                                    className="absolute left-0 top-0 bottom-0 w-1"
                                    style={{ backgroundColor: hex, opacity: isZero ? 0.2 : 0.85 }}
                                    aria-hidden
                                />

                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <motion.div
                                            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm"
                                            style={{ backgroundColor: hex, opacity: isZero ? 0.35 : 1 }}
                                            animate={
                                                !isZero && fuelKey === 'solar'
                                                    ? { rotate: [0, 8, -8, 0] }
                                                    : !isZero && fuelKey === 'wind'
                                                        ? { rotate: [0, 360] }
                                                        : !isZero && fuelKey === 'gas'
                                                            ? { scale: [1, 1.08, 1] }
                                                            : {}
                                            }
                                            transition={
                                                fuelKey === 'wind'
                                                    ? { duration: 8, repeat: Infinity, ease: 'linear' }
                                                    : { duration: fuelKey === 'gas' ? 1.6 : 4, repeat: Infinity, ease: 'easeInOut' }
                                            }
                                        >
                                            <Icon className="w-4 h-4 text-white" aria-hidden="true" />
                                        </motion.div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-1">
                                                <span className="text-sm font-semibold capitalize truncate">{source.name}</span>
                                                <FuelTrendIndicator
                                                    currentPerc={source.perc}
                                                    previousPerc={source.previousPerc}
                                                    trend={source.trend}
                                                    showDiff={false}
                                                />
                                            </div>
                                            {isRenewable && !isZero && (
                                                <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: hex }}>
                                                    Renewable
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        {source.mw !== null && (
                                            <span className="block text-base font-bold tabular-nums leading-tight">
                                                {(source.mw / 1000).toFixed(2)}
                                                <span className="text-xs font-medium text-muted-foreground ml-0.5">GW</span>
                                            </span>
                                        )}
                                        <div className="flex items-center justify-end gap-1">
                                            <span className="text-xs text-muted-foreground tabular-nums">{source.perc}%</span>
                                            {source.previousPerc !== null && source.trend && source.trend !== 'stable' && (
                                                <span className={`text-[10px] tabular-nums ${source.trend === 'up' ? 'text-emerald-500' : 'text-destructive'}`}>
                                                    ({source.trend === 'up' ? '+' : ''}{(source.perc - source.previousPerc).toFixed(1)})
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Animated share bar */}
                                <div
                                    className="mt-3 h-1.5 w-full rounded-full overflow-hidden"
                                    style={{ backgroundColor: `rgba(${r},${g},${b},0.15)` }}
                                >
                                    <motion.div
                                        className="h-full rounded-full"
                                        style={{ backgroundColor: hex, opacity: isZero ? 0.2 : 0.9 }}
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.min(source.perc, 100)}%` }}
                                        transition={{ duration: 0.8, ease: 'easeOut', delay: idx * 0.04 }}
                                    />
                                </div>

                                {/* Solar: show utility vs rooftop split */}
                                {fuelKey === 'solar' && embeddedSolarMW !== null && source.mw !== null && source.mw > 0 && (
                                    <div className="mt-2 pt-2 border-t border-border/40 space-y-1">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-muted-foreground">Utility-scale</span>
                                            <span className="font-medium tabular-nums">{((source.mw - embeddedSolarMW) / 1000).toFixed(2)} GW</span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-muted-foreground flex items-center gap-1">
                                                <Home className="w-3 h-3" /> Rooftop
                                            </span>
                                            <span className="font-medium tabular-nums">{(embeddedSolarMW / 1000).toFixed(2)} GW</span>
                                        </div>
                                    </div>
                                )}

                                {hasInsight && (
                                    <div className="mt-2 pt-2 border-t border-border/40">
                                        <FuelInsightBadge
                                            streak={streak?.isActive ? streak : undefined}
                                            milestone={milestone}
                                            compact
                                        />
                                    </div>
                                )}
                            </Card>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
