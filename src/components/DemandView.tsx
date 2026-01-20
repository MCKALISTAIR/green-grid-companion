import { Zap, RefreshCw, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { GenerationMixBar } from '@/components/GenerationMixBar';
import { useGridDemand } from '@/hooks/useGridDemand';
import { Button } from '@/components/ui/button';

export function DemandView() {
    const { demand, mix, isLoading, error, refetch, lastUpdated } = useGridDemand();

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

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Demand Highlights Card */}
            <Card className="p-5 shadow-lg bg-card/50 backdrop-blur-sm border-primary/10">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Grid Demand</p>
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

            {/* Generation Breakdown */}
            <Card className="p-4 shadow-lg">
                <GenerationMixBar mix={mix} showMW={true} />
            </Card>

            <div className="grid grid-cols-2 gap-3">
                {mix.slice(0, 4).map((source) => (
                    <Card key={source.id} className="p-3 flex items-center justify-between shadow-sm">
                        <span className="text-sm font-medium capitalize">{source.name}</span>
                        <div className="text-right">
                            {source.mw !== null && (
                                <span className="block text-sm font-bold">{(source.mw / 1000).toFixed(1)} GW</span>
                            )}
                            <span className="text-xs text-muted-foreground">{source.perc}%</span>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}
