import { Zap, RefreshCw, AlertTriangle, Info, Activity } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { GenerationMixBar } from '@/components/GenerationMixBar';
import { useGridDemand } from '@/hooks/useGridDemand';
import { useSettings } from '@/hooks/useSettings';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export function DemandView() {
    const { demand, mix, frequency: gridFrequency, isLoading, error, refetch, lastUpdated } = useGridDemand();
    const { showGridFrequency } = useSettings();

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

    // Sort mix by percentage descending
    const sortedMix = [...mix].sort((a, b) => b.perc - a.perc);

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <h2 className="text-4xl font-bold tracking-tight mt-1 text-primary">
                                {demandGW ? (
                                    <>
                                        {demandGW} <span className="text-lg font-medium text-muted-foreground/80">GW</span>
                                    </>
                                ) : (
                                    <span className="text-2xl text-muted-foreground/50">Unavailable</span>
                                )}
                            </h2>
                            {lastUpdated && (
                                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
                                    <RefreshCw className="w-3 h-3" />
                                    Updated {updatedTime}
                                </p>
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
                <GenerationMixBar mix={sortedMix} showMW={true} />
            </Card>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {sortedMix.map((source) => (
                    <Card key={source.id} className="p-3 flex items-center justify-between shadow-sm hover:bg-accent/5 transition-colors">
                        <span className="text-sm font-medium capitalize">{source.name}</span>
                        <div className="text-right">
                            {source.mw !== null && (
                                <span className="block text-sm font-bold">{(source.mw / 1000).toFixed(2)} GW</span>
                            )}
                            <span className="text-xs text-muted-foreground">{source.perc}%</span>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}
