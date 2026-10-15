import { appStorage } from '@/lib/appStorage';
import { useState, useEffect, useMemo } from 'react';
import { useCarbonData } from '@/hooks/useCarbonData';
import { useSettings } from '@/hooks/useSettings';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { easeOutExpo, stateTransition } from '@/lib/motion';
import { ErrorState } from '@/components/ErrorState';
import { getErrorInfo } from '@/lib/errorUtils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { WashingMachine, Car, Utensils, Zap, Plus, PenLine, Leaf, X } from 'lucide-react';
import { getIntensityColor, getIntensityTextColor } from '@/lib/carbonApi';
import { LocalNotifications } from '@capacitor/local-notifications';
import { plannerReminderId } from '@/lib/notificationIds';
import { parseISO, subMinutes, isFuture } from 'date-fns';
import {
  planLoad,
  describeSpan,
  roundPercent,
  describeAnyTime,
  isAnyTimePlan,
  MISSING_SLOTS_NOTE,
  MISSING_DATA_TITLE,
  MISSING_DATA_DETAIL,
} from '@/lib/nowOrWait';
import { formatLondonTime, formatLondonTimeWithDay } from '@/lib/londonTime';
import { PullToRefresh } from '@/components/PullToRefresh';
import { TurbineSpinner } from '@/components/ui/turbine-spinner';
import { Skeleton } from '@/components/ui/skeleton';

import { toast } from 'sonner';
import { Bell } from 'lucide-react';
import { logger } from '@/lib/logger';
import { PageHeader } from '@/components/layout/PageHeader';

const DEFAULT_APPLIANCES = [
  { id: 'ev', name: 'EV Charge', icon: Car, power: 7.4, duration: 4, label: 'Full Charge (4h)' },
  {
    id: 'washing',
    name: 'Washing',
    icon: WashingMachine,
    power: 1.0,
    duration: 2,
    label: 'Eco Cycle (2h)',
  },
  { id: 'dish', name: 'Dishwasher', icon: Utensils, power: 1.5, duration: 2, label: 'Auto (2h)' },
  { id: 'dryer', name: 'Dryer', icon: Zap, power: 2.5, duration: 1, label: 'Cotton (1h)' },
];

import { useAppLocation } from '@/contexts/LocationContext';
import { EstimateDisclaimer } from '@/components/attribution/EstimateDisclaimer';

export default function Planner() {
  const { settings, updateSetting } = useSettings();
  const [customEvent, setCustomEvent] = useState(() => {
    const saved = appStorage.getItem('planner-custom-event');
    return saved ? JSON.parse(saved) : { name: '', duration: '1', power: '1.0' };
  });

  useEffect(() => {
    if (settings.customEvent) {
      setCustomEvent(settings.customEvent);
    }
  }, [settings.customEvent]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return !appStorage.getItem('planner-onboarding-seen');
  });

  const { postcode } = useAppLocation();
  const { forecast, intensity, refetch, isLoading, isError, error } = useCarbonData(postcode);
  // useCarbonData reports 0 until a live reading arrives; don't treat that as a reading.
  const liveLoaded = !isLoading && !isError && intensity > 0;

  const dismissOnboarding = () => {
    setShowOnboarding(false);
    appStorage.setItem('planner-onboarding-seen', 'true');
  };

  // Build dynamic appliance list including custom appliances
  const APPLIANCES = useMemo(() => {
    const appliances = [...DEFAULT_APPLIANCES];

    // Add saved custom appliance if exists
    const savedCustom = settings.customAppliance;
    if (savedCustom) {
      appliances.unshift({
        id: 'custom',
        name: savedCustom.name,
        icon: PenLine,
        power: savedCustom.power,
        duration: savedCustom.duration,
        label: savedCustom.label || `Custom (${savedCustom.duration}h)`,
      });
    }

    return appliances;
  }, [settings.customAppliance]);

  const [selectedAppliance, setSelectedAppliance] = useState(APPLIANCES[0]);

  // Load saved custom appliance if it exists
  useEffect(() => {
    if (settings.customAppliance) {
      const saved = settings.customAppliance;
      const customAppliance = {
        id: 'custom',
        name: saved.name,
        icon: PenLine,
        power: saved.power,
        duration: saved.duration,
        label: saved.label || `Custom (${saved.duration}h)`,
      };
      setSelectedAppliance(customAppliance);
    }
  }, [settings.customAppliance]);

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
      label: `Custom (${duration}h)`,
    };

    // Save to settings (which syncs to localStorage and Supabase)
    updateSetting('customEvent', customEvent);
    updateSetting('customAppliance', {
      name: customAppliance.name,
      power: customAppliance.power,
      duration: customAppliance.duration,
      label: customAppliance.label,
    });

    setSelectedAppliance(customAppliance);
    setIsDialogOpen(false);
  };

  // One shared engine with the home card, so both give the same kind of answer.
  const plan = planLoad({
    forecast,
    liveIntensity: liveLoaded ? intensity : null,
    slots: Math.ceil(selectedAppliance.duration * 2),
    horizonHours: null,
  });
  const bestSlot =
    plan.action === 'check_forecast'
      ? null
      : plan.action === 'wait' && plan.best
        ? { startTime: plan.best.start.toISOString(), avgIntensity: plan.best.avg }
        : null;
  const startNow = plan.action === 'use_now';
  const savings =
    plan.action === 'wait'
      ? Math.round(plan.gramsCleaner * selectedAppliance.power * selectedAppliance.duration)
      : 0;

  // Handle error state
  if (isError) {
    const errorInfo = getErrorInfo(error);
    return (
      <div className="page-shell page-shell--fit">
        <div className="page-shell-inner space-y-6">
          <PageHeader
            title="Power Planner"
            description="Schedule high-energy tasks to save carbon."
          />
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
            id: plannerReminderId(notificationTime.getTime()),
            schedule: { at: notificationTime },
            sound: undefined,
            attachments: undefined,
            actionTypeId: '',
            extra: null,
          },
        ],
      });

      toast.success(`Reminder set for ${formatLondonTime(notificationTime)}`);
    } catch (error) {
      logger.error('Failed to schedule power planner notification', { error });
      toast.error('Failed to schedule reminder');
    }
  };

  return (
    <div className="page-shell page-shell--fit">
      <PullToRefresh
        onRefresh={async () => {
          await refetch();
        }}
      >
        <div className="page-shell-inner space-y-6">
          <PageHeader
            title="Power Planner"
            description="Schedule high-energy tasks for cleaner grid windows."
          />

          {showOnboarding && (
            <Card className="sheet-surface p-4 bg-primary/10 border-primary/20 relative animate-in fade-in slide-in-from-top-4 duration-500">
              <button
                onClick={dismissOnboarding}
                className="tap-target absolute top-2 right-2 p-2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Dismiss onboarding"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="flex items-start gap-4 pr-6">
                <div className="p-3 bg-primary/20 rounded-full text-primary mt-1 shrink-0">
                  <Leaf className="w-6 h-6" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-foreground text-lg">
                    Welcome to Power Planner
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Schedule high-energy tasks like EV charging or washing for when the grid is
                    greenest. Simply tap an appliance below to find the best time to run it and save
                    carbon.
                  </p>
                  <Button size="sm" onClick={dismissOnboarding} className="mt-2 font-medium">
                    Got it
                  </Button>
                </div>
              </div>
            </Card>
          )}

          <div className="grid grid-cols-2 gap-3">
            {APPLIANCES.map((app) => (
              <Button
                key={app.id}
                variant={selectedAppliance.id === app.id ? 'default' : 'outline'}
                className="h-auto py-4 flex flex-col gap-2 relative overflow-hidden transition-all duration-200"
                onClick={() => setSelectedAppliance(app)}
              >
                <motion.div
                  key={selectedAppliance.id === app.id ? 'active' : 'idle'}
                  animate={
                    selectedAppliance.id === app.id ? { scale: [1, 1.15, 1], y: [0, -3, 0] } : {}
                  }
                  transition={{ type: 'spring' as const, stiffness: 350, damping: 15 }}
                >
                  <app.icon
                    className={`w-8 h-8 ${selectedAppliance.id === app.id ? 'text-primary-foreground' : 'text-primary'}`}
                  />
                </motion.div>
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
                  variant={selectedAppliance.id === 'custom' ? 'default' : 'outline'}
                  className={`h-auto py-4 flex flex-col gap-2 border-dashed ${APPLIANCES.length % 2 === 0 ? 'col-span-2' : ''}`}
                  onClick={() => {
                    // If already active, just reopen edit? or select?
                    // Let's open dialog always on click for now to allow editing
                  }}
                >
                  <Plus
                    className={`w-8 h-8 ${selectedAppliance.id === 'custom' ? 'text-primary-foreground' : 'text-primary'}`}
                  />
                  <div className="text-center">
                    <div className="font-semibold">
                      {selectedAppliance.id === 'custom' ? selectedAppliance.name : 'Custom'}
                    </div>
                    <div className="text-[10px] opacity-70 font-normal">
                      {selectedAppliance.id === 'custom' ? 'Tap to edit' : 'Add your own'}
                    </div>
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
                        onChange={(e) =>
                          setCustomEvent({ ...customEvent, duration: e.target.value })
                        }
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

          <AnimatePresence mode="wait" initial={false}>
            {isLoading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={stateTransition}
              >
                <Card className="sheet-surface p-6 space-y-6">
                  <div className="flex items-center justify-between pb-2 border-b border-muted">
                    <div className="space-y-1.5 flex-1">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-8 w-2/3" />
                    </div>
                    <Skeleton className="w-10 h-10 rounded-full" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-muted/10 rounded-xl space-y-2">
                      <Skeleton className="h-3 w-1/2" />
                      <Skeleton className="h-5 w-3/4" />
                    </div>
                    <div className="p-3 bg-muted/10 rounded-xl space-y-2">
                      <Skeleton className="h-3 w-1/2" />
                      <Skeleton className="h-5 w-3/4" />
                    </div>
                  </div>
                  <Skeleton className="h-10 w-full rounded-xl" />
                </Card>
              </motion.div>
            ) : startNow ? (
              <motion.div
                key={selectedAppliance.id + '-now'}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.24, ease: easeOutExpo }}
              >
                <Card className="sheet-surface p-6 space-y-2 border-primary/20 bg-primary/5 text-center">
                  <h3 className="text-lg font-medium text-muted-foreground">Best time to run</h3>
                  <p className="text-3xl font-bold text-foreground">
                    {isAnyTimePlan(plan) ? 'Any time' : 'Now'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {isAnyTimePlan(plan) ? (
                      describeAnyTime(plan)
                    ) : (
                      <>
                        {plan.reason === 'small_gain'
                          ? `It won't get much cleaner in ${describeSpan(plan.coveredHours)}.`
                          : `It won't get any cleaner in ${describeSpan(plan.coveredHours)}.`}
                        {plan.nowAvg !== null &&
                          ` Starting now averages around ${plan.nowAvg} gCO₂/kWh.`}
                      </>
                    )}
                    {plan.missingSlots > 0 && ` ${MISSING_SLOTS_NOTE}`}
                  </p>
                </Card>
              </motion.div>
            ) : bestSlot ? (
              <motion.div
                key={selectedAppliance.id + '-' + bestSlot.startTime}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.24, ease: easeOutExpo }}
              >
                <Card className="sheet-surface p-6 space-y-4 border-primary/20 bg-primary/5">
                  <div className="text-center space-y-1">
                    <h3 className="text-lg font-medium text-muted-foreground">Best time to run</h3>
                    <p className="text-3xl font-bold text-foreground">
                      {formatLondonTimeWithDay(parseISO(bestSlot.startTime))}
                    </p>
                    <p className="text-sm text-green-600 font-medium">
                      Around {roundPercent(plan.percentCleaner)}% cleaner ({plan.nowAvg} to{' '}
                      {bestSlot.avgIntensity} gCO₂/kWh)
                    </p>
                    {plan.missingSlots > 0 && (
                      <p className="text-sm text-muted-foreground">{MISSING_SLOTS_NOTE}</p>
                    )}
                  </div>

                  <Button className="w-full" variant="secondary" onClick={scheduleReminder}>
                    <Bell className="w-4 h-4 mr-2" />
                    Remind me 15m before
                  </Button>

                  {savings > 0 && (
                    <div className="bg-background/50 rounded-lg p-4 text-center">
                      <p className="text-sm text-muted-foreground">Compared with starting now</p>
                      <p className="text-xl font-bold text-green-600 flex items-center justify-center gap-1">
                        <Leaf className="w-5 h-5" />
                        Save about {savings}g CO₂
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {selectedAppliance.power} kW for {selectedAppliance.duration}h, using the
                        forecast averages.
                      </p>
                      <EstimateDisclaimer className="mt-1" />
                    </div>
                  )}
                </Card>
              </motion.div>
            ) : (
              <motion.div
                key="no-data"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Card className="sheet-surface p-6 space-y-3">
                  <p className="font-medium text-foreground">
                    {plan.reason === 'missing_data'
                      ? MISSING_DATA_TITLE
                      : 'No forecast data available'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {plan.reason === 'missing_data'
                      ? `${MISSING_DATA_DETAIL} Pull to refresh, or try again later.`
                      : 'We need a carbon intensity forecast to find your best window. Pull to refresh, or check your connection.'}
                  </p>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </PullToRefresh>
    </div>
  );
}
