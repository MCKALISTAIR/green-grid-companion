import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAllRegions, getIntensityColor, getIntensityTextColor, RegionListItem } from '@/lib/carbonApi';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BottomNav } from '@/components/BottomNav';
import { PullToRefresh } from '@/components/PullToRefresh';
import { ArrowUp, ArrowDown, Map as MapIcon } from 'lucide-react';

export default function MapPage() {
    const { data: regions, isLoading, refetch } = useQuery({
        queryKey: ['all-regions'],
        queryFn: getAllRegions,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    const sortedRegions = regions ? [...regions].sort((a, b) => a.intensity.forecast - b.intensity.forecast) : [];

    return (
        <div className="min-h-screen bg-background pb-[calc(6rem+env(safe-area-inset-bottom))]">
            <PullToRefresh onRefresh={async () => { await refetch(); }}>
                <div className="p-4 space-y-4 pt-[max(2rem,env(safe-area-inset-top))]">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold">National View</h1>
                            <p className="text-muted-foreground">Live carbon intensity across the UK.</p>
                        </div>
                        <MapIcon className="w-6 h-6 text-muted-foreground opacity-20" />
                    </div>

                    {isLoading ? (
                        <div className="space-y-3">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="h-16 bg-muted/20 animate-pulse rounded-lg" />
                            ))}
                        </div>
                    ) : (
                        <div className="grid gap-3">
                            {sortedRegions.map((region, idx) => (
                                <Card key={region.regionid} className="p-4 flex items-center justify-between transition-all hover:scale-[1.01] active:scale-[0.99]">
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs font-mono text-muted-foreground w-4 text-center">#{idx + 1}</span>
                                        <div>
                                            <h3 className="font-semibold">{region.shortname}</h3>
                                            <div className={`text-xs inline-flex items-center px-1.5 py-0.5 rounded-full ${getIntensityColor(region.intensity.index)} bg-opacity-20`}>
                                                <span className={`capitalize font-medium opacity-100`}>
                                                    {region.intensity.index}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <div className="text-2xl font-bold">{region.intensity.forecast}</div>
                                        <div className="text-[10px] text-muted-foreground">gCO₂/kWh</div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </PullToRefresh>
            <BottomNav />
        </div>
    );
}
