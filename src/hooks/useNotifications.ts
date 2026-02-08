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
    highIntensityEnabled: boolean;
    highIntensityThreshold: number;
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
    highIntensityEnabled: false,
    highIntensityThreshold: 250,
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

    // Helper to generate forecast summary
    const generateForecastSummary = (forecast: ForecastData[]): string => {
        const today = new Date();
        const endOfDay = new Date(today);
        endOfDay.setHours(23, 59, 59, 999);

        const todaySlots = forecast.filter(slot => {
            const slotTime = new Date(slot.from);
            return slotTime >= today && slotTime <= endOfDay;
        });

        if (todaySlots.length === 0) return 'Check the app for today\'s forecast.';

        const avgIntensity = Math.round(
            todaySlots.reduce((sum, slot) => sum + slot.intensity.forecast, 0) / todaySlots.length
        );

        const lowPeriods = todaySlots.filter(slot => slot.intensity.forecast < prefs.lowIntensityThreshold).length;
        const lowHours = lowPeriods * 0.5; // Each slot is 30 min

        return `Today's average: ${avgIntensity}g CO₂/kWh. ${lowHours > 0 ? `${lowHours}h of green energy expected 🌿` : 'Limited green periods today.'}`;
    };

    const scheduleDailyForecast = useCallback(async (forecast: ForecastData[]) => {
        if (!prefs.dailyForecastEnabled || permissionStatus !== 'granted') {
            logger.info('Daily forecast not scheduled', {
                enabled: prefs.dailyForecastEnabled,
                permission: permissionStatus
            });
            return;
        }

        try {
            // Parse configured time (e.g., "09:00")
            const [hours, minutes] = prefs.dailyForecastTime.split(':').map(Number);

            // Cancel existing daily forecast notification (id: 9000)
            await LocalNotifications.cancel({ notifications: [{ id: 9000 }] });
            logger.info('Cancelled previous daily forecast notification');

            // Generate forecast summary
            const summary = generateForecastSummary(forecast);

            // Schedule repeating daily notification
            await LocalNotifications.schedule({
                notifications: [{
                    id: 9000,
                    title: '🌅 Daily Grid Forecast',
                    body: summary,
                    schedule: {
                        on: { hour: hours, minute: minutes },
                        every: 'day'
                    },
                    smallIcon: 'ic_stat_leaf',
                    actionTypeId: '',
                    extra: null
                }]
            });

            logger.info('Daily forecast notification scheduled', {
                time: prefs.dailyForecastTime,
                summary
            });
        } catch (error) {
            logger.error('Failed to schedule daily forecast', { error });
        }
    }, [prefs.dailyForecastEnabled, prefs.dailyForecastTime, prefs.lowIntensityThreshold, permissionStatus, generateForecastSummary]);

    const updatePreference = <K extends keyof NotificationPrefs>(key: K, value: NotificationPrefs[K]) => {
        setPrefs(prev => ({ ...prev, [key]: value }));
    };

    const scheduleGreenAlerts = useCallback(async (forecast: ForecastData[]) => {
        logger.info('scheduleGreenAlerts called', {
            forecastLength: forecast.length,
            lowIntensityEnabled: prefs.lowIntensityEnabled,
            threshold: prefs.lowIntensityThreshold,
            permissionStatus,
            useBackgroundFetch: prefs.useBackgroundFetch
        });

        // If Background Fetch is enabled, we DO NOT use forecast scheduling.
        if (prefs.useBackgroundFetch) {
            logger.info('Background fetch enabled, cancelling forecast-based notifications');
            const pending = await LocalNotifications.getPending();
            if (pending.notifications.length > 0) {
                await LocalNotifications.cancel(pending);
            }
            return;
        }

        // Run if native OR web (permission granted)
        if (!prefs.lowIntensityEnabled) {
            logger.info('Low intensity alerts disabled, skipping');
            return;
        }

        if (permissionStatus !== 'granted') {
            logger.warn('Notification permission not granted', { status: permissionStatus });
            return;
        }

        const now = new Date();
        const pendingNotifications: ScheduleOptions['notifications'] = [];
        let isGreenWindow = false;

        // Clean up pending notifications
        const pending = await LocalNotifications.getPending();
        logger.info('Pending notifications before cleanup', { count: pending.notifications.length });
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

                logger.debug('Found green period', {
                    time: startTime.toISOString(),
                    intensity: slot.intensity.forecast
                });

                // Add Notification
                pendingNotifications.push({
                    id: Math.floor(startTime.getTime() / 100000), // Unique-ish ID
                    title: "🌿 Green Grid Forecast",
                    body: `Grid intensity is now ${slot.intensity.forecast}g! It's a great time to use energy.`,
                    schedule: { at: startTime },
                    smallIcon: 'ic_stat_leaf',
                    actionTypeId: "",
                    extra: null
                });
            } else if (!isGreen) {
                isGreenWindow = false;
            }
        }

        logger.info('Green periods found in forecast', { count: pendingNotifications.length });

        if (pendingNotifications.length > 0) {
            try {
                await LocalNotifications.schedule({ notifications: pendingNotifications });
                logger.info('✅ Forecast alerts scheduled successfully', {
                    count: pendingNotifications.length,
                    threshold: prefs.lowIntensityThreshold,
                });
            } catch (error) {
                logger.error('❌ Failed to schedule notifications', { error, count: pendingNotifications.length });
            }
        } else {
            logger.info('No green periods found in forecast to schedule notifications for', {
                threshold: prefs.lowIntensityThreshold
            });
        }
    }, [prefs.lowIntensityEnabled, prefs.lowIntensityThreshold, prefs.useBackgroundFetch, permissionStatus]);

    const scheduleHighIntensityAlerts = useCallback(async (forecast: ForecastData[]) => {
        logger.info('scheduleHighIntensityAlerts called', {
            forecastLength: forecast.length,
            highIntensityEnabled: prefs.highIntensityEnabled,
            threshold: prefs.highIntensityThreshold,
            permissionStatus
        });

        // Skip if disabled or no permission
        if (!prefs.highIntensityEnabled) {
            logger.info('High intensity alerts disabled, skipping');
            return;
        }

        if (permissionStatus !== 'granted') {
            logger.warn('Notification permission not granted for high intensity', { status: permissionStatus });
            return;
        }

        const now = new Date();
        const pendingNotifications: ScheduleOptions['notifications'] = [];
        let isDirtyWindow = false;

        for (const slot of forecast) {
            const startTime = new Date(slot.from);
            if (startTime <= now) continue;

            const isDirty = slot.intensity.forecast > prefs.highIntensityThreshold;

            // Trigger on FLIP to dirty
            if (isDirty && !isDirtyWindow) {
                isDirtyWindow = true;

                logger.debug('Found high intensity period', {
                    time: startTime.toISOString(),
                    intensity: slot.intensity.forecast
                });

                // Add Notification (use IDs 8000-8999)
                pendingNotifications.push({
                    id: 8000 + Math.floor(startTime.getTime() / 100000) % 1000,
                    title: "⚠️ High Carbon Alert",
                    body: `Grid intensity is now ${slot.intensity.forecast}g. Consider deferring heavy usage.`,
                    schedule: { at: startTime },
                    smallIcon: 'ic_stat_leaf',
                    actionTypeId: "",
                    extra: null
                });
            } else if (!isDirty) {
                isDirtyWindow = false;
            }
        }

        logger.info('High intensity periods found in forecast', { count: pendingNotifications.length });

        if (pendingNotifications.length > 0) {
            try {
                await LocalNotifications.schedule({ notifications: pendingNotifications });
                logger.info('✅ High intensity alerts scheduled successfully', {
                    count: pendingNotifications.length,
                    threshold: prefs.highIntensityThreshold
                });
            } catch (error) {
                logger.error('❌ Failed to schedule high intensity alerts', { error });
            }
        } else {
            logger.info('No high intensity periods found in forecast', {
                threshold: prefs.highIntensityThreshold
            });
        }
    }, [prefs.highIntensityEnabled, prefs.highIntensityThreshold, permissionStatus]);

    return {
        isNative,
        isSupported,
        permissionStatus,
        prefs,
        requestPermission,
        updatePreference,
        scheduleGreenAlerts,
        scheduleDailyForecast,
        scheduleHighIntensityAlerts
    };
}
