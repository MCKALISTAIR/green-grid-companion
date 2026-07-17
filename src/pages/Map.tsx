import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAllRegions, getIntensityColor } from '@/lib/carbonApi';
import { UKMap } from '@/components/UKMap';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ErrorState } from '@/components/ErrorState';
import { EmptyState } from '@/components/EmptyState';
import { getErrorInfo } from '@/lib/errorUtils';

import { PullToRefresh } from '@/components/PullToRefresh';
import { Map as MapIcon, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function MapPage() {
    const [showMap, setShowMap] = useState(true);
    const [selectedRegionId, setSelectedRegionId] = useState<number | null>(null);

    const { data: regions, isLoading, isError, error, refetch } = useQuery({
        queryKey: ['all-regions'],
        queryFn: ({ signal }) => getAllRegions(signal),
        staleTime: 1000 * 60 * 5, // 5 minutes
        gcTime: 1000 * 60 * 30, // 30 minutes
    });

    const sortedRegions = regions ? [...regions].sort((a, b) => a.intensity.forecast - b.intensity.forecast) : [];

    // Handle error state
    if (isError) {
        const errorInfo = getErrorInfo(error);
        return (
            <div className="min-h-screen bg-background pb-[calc(6rem+env(safe-area-inset-bottom))]">
                <div className="p-4 pt-[max(env(safe-area-inset-top),59px)]">
                    <h1 className="text-2xl font-bold mb-4">Leaderboard</h1>
                    <ErrorState
                        title={errorInfo.title}
                        description={errorInfo.description}
                        retry={() => refetch()}
                        fullScreen
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pb-[calc(6rem+env(safe-area-inset-bottom))]">
            <PullToRefresh onRefresh={async () => { await refetch(); }}>
                <div className="p-4 space-y-4 pt-[max(env(safe-area-inset-top),59px)]">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold">Leaderboard</h1>
                            <p className="text-muted-foreground">Regional carbon intensity ranking.</p>
                        </div>
                        <Button
                            variant={showMap ? "default" : "outline"}
                            size="icon"
                            onClick={() => setShowMap(!showMap)}
                            className="rounded-full w-10 h-10 shadow-sm"
                        >
                            {showMap ? <X className="w-5 h-5" /> : <MapIcon className="w-5 h-5" />}
                        </Button>
                    </div>

                    {isLoading ? (
                        <div className="space-y-3">
                            {[1, 2, 3, 4, 5, 6, 7].map(i => (
                                <div key={i} className="h-16 bg-muted/20 animate-pulse rounded-lg" />
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Toggleable Map View */}
                            <AnimatePresence>
                                {showMap && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <UKMap
                                            regions={regions || []}
                                            selectedRegionId={selectedRegionId || undefined}
                                            onRegionSelect={(id) => {
                                                setSelectedRegionId(id);
                                                const element = document.getElementById(`region-card-${id}`);
                                                if (element) {
                                                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                }
                                            }}
                                        />
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="grid gap-3">
                                {sortedRegions.map((region, idx) => (
                                    <div
                                        key={region.regionid}
                                        id={`region-card-${region.regionid}`}
                                        className="scroll-mt-4"
                                    >
                                        <Card
                                            className={cn(
                                                "p-4 flex items-center justify-between transition-all duration-350 cursor-pointer active:scale-[0.99]",
                                                selectedRegionId === region.regionid
                                                    ? "ring-2 ring-primary bg-primary/10 border-primary/30 shadow-md scale-[1.015]"
                                                    : "hover:bg-card/80 hover:shadow-sm"
                                            )}
                                            onClick={() => setSelectedRegionId(region.regionid)}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                                                    idx === 1 ? 'bg-gray-100 text-gray-700' :
                                                        idx === 2 ? 'bg-orange-100 text-orange-800' : 'bg-muted text-muted-foreground'
                                                    }`}>
                                                    {idx + 1}
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-sm">{region.shortname}</h3>
                                                    <div className={`text-[10px] inline-flex items-center px-1.5 py-0.5 rounded-full mt-0.5 ${getIntensityColor(region.intensity.index)} bg-opacity-20`}>
                                                        <span className="capitalize font-medium text-foreground">
                                                            {region.intensity.index}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="text-right">
                                                <div className="text-xl font-bold">{region.intensity.forecast}</div>
                                                <div className="text-[10px] text-muted-foreground">gCO₂/kWh</div>
                                            </div>
                                        </Card>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </PullToRefresh>

        </div>
    );
}
