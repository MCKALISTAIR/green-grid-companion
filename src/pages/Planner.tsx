import { useState, useEffect } from 'react';
import { useCarbonData } from '@/hooks/useCarbonData';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { WashingMachine, Car, Utensils, Zap } from 'lucide-react';
import { getIntensityColor, getIntensityTextColor } from '@/lib/carbonApi';
import { format, parseISO, addHours } from 'date-fns';
import { PullToRefresh } from '@/components/PullToRefresh';
import { BottomNav } from '@/components/BottomNav';

const APPLIANCES = [
    { id: 'ev', name: 'EV Charge', icon: Car, power: 7.4, duration: 4, label: 'Full Charge (4h)' },
    { id: 'washing', name: 'Washing', icon: WashingMachine, power: 1.0, duration: 2, label: 'Eco Cycle (2h)' },
    { id: 'dish', name: 'Dishwasher', icon: Utensils, power: 1.5, duration: 2, label: 'Auto (2h)' },
    { id: 'dryer', name: 'Dryer', icon: Zap, power: 2.5, duration: 1, label: 'Cotton (1h)' },
];

export default function Planner() {
    const [selectedAppliance, setSelectedAppliance] = useState(APPLIANCES[0]);
    const postcode = localStorage.getItem('gridgreen-postcode') || '';
    const { forecast, refetch, isLoading } = useCarbonData(postcode);

    const findBestTime = () => {
        if (!forecast || forecast.length === 0) return null;

        // Simple algorithm: find sliding window of lowest average intensity
        let bestStart = 0;
        let minAvgIntensity = Infinity;

        for (let i = 0; i <= forecast.length - selectedAppliance.duration; i++) {
            let sum = 0;
            let valid = true;
            for (let j = 0; j < selectedAppliance.duration; j++) {
                if (forecast[i + j].intensity.forecast === null) {
                    valid = false;
                    break;
                }
                sum += forecast[i + j].intensity.forecast;
            }

            if (valid) {
                const avg = sum / selectedAppliance.duration;
                if (avg < minAvgIntensity) {
                    minAvgIntensity = avg;
                    bestStart = i;
                }
            }
        }

        if (minAvgIntensity === Infinity) return null;

        return {
            startTime: forecast[bestStart].from,
            avgIntensity: Math.round(minAvgIntensity)
        };
    };

    const bestSlot = findBestTime();
    const currentIntensity = forecast[0]?.intensity.forecast || 0;
    const savings = bestSlot ? Math.round((currentIntensity - bestSlot.avgIntensity) * selectedAppliance.power * selectedAppliance.duration) : 0;

    return (
        <div className="min-h-screen bg-background pb-[calc(6rem+env(safe-area-inset-bottom))]">
            <PullToRefresh onRefresh={async () => { await refetch(); }}>
                <div className="p-4 space-y-6 pt-[max(2rem,env(safe-area-inset-top))]">
                    <div>
                        <h1 className="text-2xl font-bold">Power Planner</h1>
                        <p className="text-muted-foreground">Schedule high-energy tasks to save carbon.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        {APPLIANCES.map((app) => (
                            <Button
                                key={app.id}
                                variant={selectedAppliance.id === app.id ? "default" : "outline"}
                                className="h-auto py-4 flex flex-col gap-2"
                                onClick={() => setSelectedAppliance(app)}
                            >
                                <app.icon className={`w-8 h-8 ${selectedAppliance.id === app.id ? 'text-primary-foreground' : 'text-primary'}`} />
                                <div className="text-center">
                                    <div className="font-semibold">{app.name}</div>
                                    <div className="text-[10px] opacity-70 font-normal">{app.label}</div>
                                </div>
                            </Button>
                        ))}
                    </div>

                    {isLoading ? (
                        <Card className="p-6 flex items-center justify-center min-h-[200px]">
                            <p>Loading forecast...</p>
                        </Card>
                    ) : bestSlot ? (
                        <Card className="p-6 space-y-4 border-primary/20 bg-primary/5">
                            <div className="text-center space-y-1">
                                <h3 className="text-lg font-medium text-muted-foreground">Best time to run</h3>
                                <p className="text-3xl font-bold text-foreground">
                                    {format(parseISO(bestSlot.startTime), 'EEEE h:mm a')}
                                </p>
                                <p className="text-sm text-green-600 font-medium">
                                    {bestSlot.avgIntensity} gCO₂/kWh average
                                </p>
                            </div>

                            {savings > 0 && (
                                <div className="bg-background/50 rounded-lg p-4 text-center">
                                    <p className="text-sm text-muted-foreground">Impact vs Now</p>
                                    <p className="text-xl font-bold text-green-600">Save {savings}g CO₂</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Equivalent to charging a smartphone {Math.round(savings / 5)} times
                                    </p>
                                </div>
                            )}
                        </Card>
                    ) : (
                        <Card className="p-6">
                            <p>No forecast data available.</p>
                        </Card>
                    )}
                </div>
            </PullToRefresh>
            <BottomNav />
        </div>
    );
}
