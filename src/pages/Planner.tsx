import { useState, useEffect } from 'react';
import { useCarbonData } from '@/hooks/useCarbonData';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ErrorState';
import { getErrorInfo } from '@/lib/errorUtils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { WashingMachine, Car, Utensils, Zap, Plus, PenLine } from 'lucide-react';
import { getIntensityColor, getIntensityTextColor } from '@/lib/carbonApi';
import { LocalNotifications } from '@capacitor/local-notifications';
import { format, parseISO, addHours, subMinutes, isFuture } from 'date-fns';
import { PullToRefresh } from '@/components/PullToRefresh';

import { toast } from 'sonner';
import { Bell } from 'lucide-react';
import { logger } from '@/lib/logger';

const APPLIANCES = [
    { id: 'ev', name: 'EV Charge', icon: Car, power: 7.4, duration: 4, label: 'Full Charge (4h)' },
    { id: 'washing', name: 'Washing', icon: WashingMachine, power: 1.0, duration: 2, label: 'Eco Cycle (2h)' },
    { id: 'dish', name: 'Dishwasher', icon: Utensils, power: 1.5, duration: 2, label: 'Auto (2h)' },
    { id: 'dryer', name: 'Dryer', icon: Zap, power: 2.5, duration: 1, label: 'Cotton (1h)' },
];

export default function Planner() {
    const [selectedAppliance, setSelectedAppliance] = useState(APPLIANCES[0]);
    const [customEvent, setCustomEvent] = useState(() => {
        const saved = localStorage.getItem('planner-custom-event');
        return saved ? JSON.parse(saved) : { name: '', duration: '1', power: '1.0' };
    });
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const postcode = localStorage.getItem('gridgreen-postcode') || '';
    const { forecast, refetch, isLoading, isError, error } = useCarbonData(postcode);

    // Load saved custom appliance if it exists
    useEffect(() => {
        const saved = localStorage.getItem('planner-custom-appliance');
        if (saved) {
            try {
                const customAppliance = JSON.parse(saved);
                // Don't auto-select, just keep it available
            } catch (e) {
                logger.debug('Failed to load custom appliance from storage', { error: e });
            }
        }
    }, []);

    const handleCustomSubmit = () => {
        const duration = Math.max(0.5, parseFloat(customEvent.duration) || 1);
        const power = parseFloat(customEvent.power) || 1.0;
        const name = customEvent.name || 'Custom Task';

        const customAppliance = {
            id: 'custom',
            name: name,
            icon: PenLine,
            power: power,
            duration: duration,
            label: `Custom (${duration}h)`
        };

        // Save to localStorage
        localStorage.setItem('planner-custom-event', JSON.stringify(customEvent));
        localStorage.setItem('planner-custom-appliance', JSON.stringify({
            name: customAppliance.name,
            power: customAppliance.power,
            duration: customAppliance.duration,
            label: customAppliance.label
        }));

        setSelectedAppliance(customAppliance);
        setIsDialogOpen(false);
    };

    const findBestTime = () => {
        if (!forecast || forecast.length === 0) return null;

        // Simple algorithm: find sliding window of lowest average intensity
        // Adjust for floating point duration if needed, but forecast is 30min slots.
        // Assuming duration is in Hours. slots needed = duration * 2.
        const slotsNeeded = Math.ceil(selectedAppliance.duration * 2);

        let bestStart = -1;
        let minAvgIntensity = Infinity;

        // Ensure we only look at future slots if we want to be realistic, 
        // but forecast usually returns future 24-48h. 
        // We'll iterate through all available forecast data.
        for (let i = 0; i <= forecast.length - slotsNeeded; i++) {
            let sum = 0;
            let valid = true;
            for (let j = 0; j < slotsNeeded; j++) {
                if (!forecast[i + j] || forecast[i + j].intensity.forecast === null) {
                    valid = false;
                    break;
                }
                sum += forecast[i + j].intensity.forecast;
            }

            if (valid) {
                const avg = sum / slotsNeeded;
                if (avg < minAvgIntensity) {
                    minAvgIntensity = avg;
                    bestStart = i;
                }
            }
        }

        if (bestStart === -1 || minAvgIntensity === Infinity) return null;

        return {
            startTime: forecast[bestStart].from,
            avgIntensity: Math.round(minAvgIntensity)
        };
    };

    const bestSlot = findBestTime();
    const currentIntensity = forecast[0]?.intensity.forecast || 0;
    const savings = bestSlot ? Math.round((currentIntensity - bestSlot.avgIntensity) * selectedAppliance.power * selectedAppliance.duration) : 0;

    // Handle error state
    if (isError) {
        const errorInfo = getErrorInfo(error);
        return (
            <div className="h-[100dvh] overflow-hidden bg-background pb-[calc(6rem+env(safe-area-inset-bottom))]">
                <div className="p-4 space-y-6 pt-[max(2rem,env(safe-area-inset-top))]">
                    <div>
                        <h1 className="text-2xl font-bold">Power Planner</h1>
                        <p className="text-muted-foreground">Schedule high-energy tasks to save carbon.</p>
                    </div>
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

    const scheduleReminder = async () => {
        if (!bestSlot) return;

        try {
            const permission = await LocalNotifications.requestPermissions();
            if (permission.display !== 'granted') {
                toast.error('Notifications permission denied');
                return;
            }

            const startDate = parseISO(bestSlot.startTime);
            // Schedule 15 minutes before
            const notificationTime = subMinutes(startDate, 15);

            if (!isFuture(notificationTime)) {
                toast.error('This time is too soon to schedule a reminder!');
                return;
            }

            await LocalNotifications.schedule({
                notifications: [
                    {
                        title: `Power Planner: Run ${selectedAppliance.name}`,
                        body: `Ideally start your ${selectedAppliance.name} in 15 minutes for lowest carbon intensity!`,
                        id: new Date().getTime(),
                        schedule: { at: notificationTime },
                        sound: undefined,
                        attachments: undefined,
                        actionTypeId: '',
                        extra: null
                    }
                ]
            });

            toast.success(`Reminder set for ${format(notificationTime, 'h:mm a')}`);

        } catch (error) {
            logger.error('Failed to schedule power planner notification', { error });
            toast.error('Failed to schedule reminder');
        }
    };

    return (
        <div className="h-[100dvh] overflow-hidden bg-background pb-[calc(6rem+env(safe-area-inset-bottom))]">
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

                        {/* Custom Event Button */}
                        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                            <DialogTrigger asChild>
                                <Button
                                    variant={selectedAppliance.id === 'custom' ? "default" : "outline"}
                                    className="h-auto py-4 flex flex-col gap-2 border-dashed"
                                    onClick={() => {
                                        // If already active, just reopen edit? or select?
                                        // Let's open dialog always on click for now to allow editing
                                    }}
                                >
                                    <Plus className={`w-8 h-8 ${selectedAppliance.id === 'custom' ? 'text-primary-foreground' : 'text-primary'}`} />
                                    <div className="text-center">
                                        <div className="font-semibold">{selectedAppliance.id === 'custom' ? selectedAppliance.name : 'Custom'}</div>
                                        <div className="text-[10px] opacity-70 font-normal">{selectedAppliance.id === 'custom' ? 'Tap to edit' : 'Add your own'}</div>
                                    </div>
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md top-[20%] translate-y-0">
                                <DialogHeader>
                                    <DialogTitle>Add Custom Event</DialogTitle>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="name">Event Name</Label>
                                        <Input
                                            id="name"
                                            placeholder="e.g. Bake Cake"
                                            value={customEvent.name}
                                            onChange={(e) => setCustomEvent({ ...customEvent, name: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="duration">Duration (Hours)</Label>
                                            <Input
                                                id="duration"
                                                type="number"
                                                step="0.5"
                                                value={customEvent.duration}
                                                onChange={(e) => setCustomEvent({ ...customEvent, duration: e.target.value })}
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="power">Power (kW)</Label>
                                            <Input
                                                id="power"
                                                type="number"
                                                step="0.1"
                                                value={customEvent.power}
                                                onChange={(e) => setCustomEvent({ ...customEvent, power: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <DialogFooter className="sm:justify-start">
                                    <Button type="button" onClick={handleCustomSubmit} className="w-full">
                                        Calculate Best Time
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>

                    {isLoading ? (
                        <Card className="p-6 animate-pulse bg-card">
                            <div className="space-y-4">
                                <div className="text-center space-y-2">
                                    <div className="h-4 bg-muted rounded w-1/3 mx-auto"></div>
                                    <div className="h-8 bg-muted rounded w-1/2 mx-auto"></div>
                                </div>
                                <div className="h-10 bg-muted rounded"></div>
                                <div className="h-24 bg-muted rounded"></div>
                            </div>
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

                            <Button
                                className="w-full"
                                variant="secondary"
                                onClick={scheduleReminder}
                            >
                                <Bell className="w-4 h-4 mr-2" />
                                Remind me 15m before
                            </Button>

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

        </div>
    );
}
