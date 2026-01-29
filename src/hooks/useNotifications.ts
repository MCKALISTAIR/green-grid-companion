import { LocalNotifications, ScheduleOptions } from '@capacitor/local-notifications';
import { BackgroundFetch } from '@transistorsoft/capacitor-background-fetch';
import { ForecastData, getRegionalIntensity } from '@/lib/carbonApi';
import { useEffect, useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

export interface NotificationPrefs {
    lowIntensityEnabled: boolean;
    lowIntensityThreshold: number;
    dailyForecastEnabled: boolean;
    dailyForecastTime: string;
    useBackgroundFetch: boolean;
    weeklyDigestEnabled: boolean;
    weeklyDigestDay: number; // 0 = Sunday, 6 = Saturday
    monthlyReportEnabled: boolean;
    monthlyReportDay: number; // 1-28 (day of month)
    showWeatherInInsights: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
    lowIntensityEnabled: false,
    lowIntensityThreshold: 100,
    dailyForecastEnabled: false,
    dailyForecastTime: '09:00',
    useBackgroundFetch: false,
    weeklyDigestEnabled: false,
    weeklyDigestDay: 0, // Sunday
    monthlyReportEnabled: false,
    monthlyReportDay: 1, // 1st of month
    showWeatherInInsights: true,
};

const PREFS_KEY = 'gridgreen-notification-prefs';

export function useNotifications() {
    const [permissionStatus, setPermissionStatus] = useState<'prompt' | 'granted' | 'denied'>('prompt');
    const [prefs, setPrefs] = useState<NotificationPrefs>(() => {
        const saved = localStorage.getItem(PREFS_KEY);
        return saved ? { ...DEFAULT_PREFS, ...JSON.parse(saved) } : DEFAULT_PREFS;
    });

    const isNative = Capacitor.isNativePlatform();
    // Allow notifications on web if supported
    const isSupported = isNative || ('Notification' in window);

    const checkPermission = useCallback(async () => {
        if (!isNative) return;
        const status = await LocalNotifications.checkPermissions();
        setPermissionStatus(status.display as 'prompt' | 'granted' | 'denied');
    }, [isNative]);

    useEffect(() => {
        checkPermission();
    }, [checkPermission]);

    const checkLiveIntensity = useCallback(async () => {
        const postcode = localStorage.getItem('gridgreen-postcode');
        if (!postcode) return;

        try {
            const data = await getRegionalIntensity(postcode);
            // The first slot is usually "now".
            const nowSlot = data.data[0];

            if (nowSlot && nowSlot.intensity.forecast < prefs.lowIntensityThreshold) {
                await LocalNotifications.schedule({
                    notifications: [{
                        id: 1001,
                        title: "🟢 Live Energy Alert",
                        body: `Grid is GREEN right now! Intensity is ${nowSlot.intensity.forecast}g.`,
                        schedule: { at: new Date(Date.now() + 1000) }, // Immediate
                        smallIcon: 'ic_stat_leaf',
                    }]
                });
            }
        } catch (e) {
            logger.error('Background fetch intensity check failed', { error: e });
        }
    }, [prefs.lowIntensityThreshold]); // Re-create if threshold changes

    const initBackgroundFetch = useCallback(async () => {
        const status = await BackgroundFetch.configure({
            minimumFetchInterval: 15, // 15 minutes
            stopOnTerminate: false,
            startOnBoot: true,
            enableHeadless: true,
            requiredNetworkType: BackgroundFetch.NETWORK_TYPE_ANY
        }, async (taskId) => {
            logger.info('Background fetch event received', { taskId });

            // Perform Work
            await checkLiveIntensity();

            // Finish
            BackgroundFetch.finish(taskId);
        }, (taskId) => {
            // Timeout
            logger.warn('Background fetch timeout', { taskId });
            BackgroundFetch.finish(taskId);
        });
        logger.info('Background fetch configured', { status });
    }, [checkLiveIntensity]);

    const stopBackgroundFetch = useCallback(async () => {
        await BackgroundFetch.stop();
        logger.info('Background fetch stopped');
    }, []);

    // Persist prefs and handle Background Fetch toggle
    useEffect(() => {
        localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));

        if (isNative) {
            if (prefs.useBackgroundFetch && prefs.lowIntensityEnabled) {
                initBackgroundFetch();
            } else {
                stopBackgroundFetch();
            }
        }
    }, [prefs, isNative, initBackgroundFetch, stopBackgroundFetch]);

    const requestPermission = async () => {
        if (!isNative && !('Notification' in window)) {
            toast.error("Notifications are not supported in this browser.");
            return false;
        }

        const status = await LocalNotifications.requestPermissions();
        if (status.display === 'granted') {
            setPermissionStatus('granted');
            return true;
        } else {
            setPermissionStatus('denied');
            return false;
        }
    };

    const updatePreference = <K extends keyof NotificationPrefs>(key: K, value: NotificationPrefs[K]) => {
        setPrefs(prev => ({ ...prev, [key]: value }));
    };

    const scheduleGreenAlerts = useCallback(async (forecast: ForecastData[]) => {
        // If Background Fetch is enabled, we DO NOT use forecast scheduling.
        if (prefs.useBackgroundFetch) {
            const pending = await LocalNotifications.getPending();
            if (pending.notifications.length > 0) {
                await LocalNotifications.cancel(pending);
            }
            return;
        }

        // Run if native OR web (permission granted)
        if (!prefs.lowIntensityEnabled || permissionStatus !== 'granted') return;

        const now = new Date();
        const pendingNotifications: ScheduleOptions['notifications'] = [];
        let isGreenWindow = false;

        // Clean up pending notifications
        const pending = await LocalNotifications.getPending();
        if (pending.notifications.length > 0) {
            await LocalNotifications.cancel(pending);
        }

        for (const slot of forecast) {
            const startTime = new Date(slot.from);
            if (startTime <= now) continue;

            const isGreen = slot.intensity.forecast < prefs.lowIntensityThreshold;

            // Trigger on FLIP to green
            if (isGreen && !isGreenWindow) {
                isGreenWindow = true;

                // Add Notification
                pendingNotifications.push({
                    id: Math.floor(startTime.getTime() / 100000), // Unique-ish ID
                    title: "🌿 Green Grid Forecast",
                    body: `Expectation: Intensity drops to ${slot.intensity.forecast}g at ${startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
                    schedule: { at: startTime },
                    smallIcon: 'ic_stat_leaf',
                    actionTypeId: "",
                    extra: null
                });
            } else if (!isGreen) {
                isGreenWindow = false;
            }
        }

        if (pendingNotifications.length > 0) {
            try {
                await LocalNotifications.schedule({ notifications: pendingNotifications });
                logger.info('Forecast alerts scheduled', {
                    count: pendingNotifications.length,
                    threshold: prefs.lowIntensityThreshold,
                });
            } catch (error) {
                logger.error('Failed to schedule notifications', { error, count: pendingNotifications.length });
            }
        }
    }, [isNative, prefs.lowIntensityEnabled, prefs.lowIntensityThreshold, prefs.useBackgroundFetch, permissionStatus]);

    return {
        isNative,
        isSupported,
        permissionStatus,
        prefs,
        requestPermission,
        updatePreference,
        scheduleGreenAlerts
    };
}
