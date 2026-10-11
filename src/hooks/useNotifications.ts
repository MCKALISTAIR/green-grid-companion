import { LocalNotifications, ScheduleOptions } from '@capacitor/local-notifications';
import { BackgroundFetch } from '@transistorsoft/capacitor-background-fetch';
import { ForecastData, getRegionalIntensity } from '@/lib/carbonApi';
import { useEffect, useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import { readTone } from '@/lib/tone';
import {
    cleanWindowNotification,
    dailyOutlookBody,
    DAILY_OUTLOOK_TITLE,
    highWindowNotification,
    liveCleanNotification,
    NO_DAILY_FORECAST_BODY,
} from '@/lib/voice/notificationCopy';
import {
    NOTIFICATION_IDS,
    filterNotificationIds,
    greenAlertId,
    highAlertId,
    isForecastGreenScheduleId,
    isHighAlertId,
} from '@/lib/notificationIds';

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

/** Server digests need push registration; keep prefs off until that path is wired from Settings. */
export const DIGEST_DELIVERY_AVAILABLE = false;

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
const HIGH_INTENSITY_MIN = 50;
const HIGH_INTENSITY_MAX = 400;

function normalizePrefs(raw: Partial<NotificationPrefs>): NotificationPrefs {
    const merged = { ...DEFAULT_PREFS, ...raw };
    // Digests are not delivered from Settings yet — don't leave a false "enabled" promise.
    if (!DIGEST_DELIVERY_AVAILABLE) {
        merged.weeklyDigestEnabled = false;
        merged.monthlyReportEnabled = false;
    }
    merged.highIntensityThreshold = Math.min(
        HIGH_INTENSITY_MAX,
        Math.max(HIGH_INTENSITY_MIN, merged.highIntensityThreshold),
    );
    return merged;
}

async function cancelMatchingPending(predicate: (id: number) => boolean) {
    const pending = await LocalNotifications.getPending();
    const toCancel = filterNotificationIds(pending.notifications, predicate);
    if (toCancel.length > 0) {
        await LocalNotifications.cancel({ notifications: toCancel });
    }
    return toCancel.length;
}

export function useNotifications() {
    const [permissionStatus, setPermissionStatus] = useState<'prompt' | 'granted' | 'denied'>('prompt');
    const [prefs, setPrefs] = useState<NotificationPrefs>(() => {
        const saved = localStorage.getItem(PREFS_KEY);
        return saved ? normalizePrefs(JSON.parse(saved)) : { ...DEFAULT_PREFS };
    });

    const isNative = Capacitor.isNativePlatform();
    // Allow notifications on web if supported
    const isSupported = isNative || (typeof window !== 'undefined' && 'Notification' in window);

    const checkPermission = useCallback(async () => {
        if (isNative) {
            const status = await LocalNotifications.checkPermissions();
            setPermissionStatus(status.display as 'prompt' | 'granted' | 'denied');
            return;
        }

        // Web: sync browser permission so schedulers work after reload
        if (typeof window !== 'undefined' && 'Notification' in window) {
            const browserPerm = Notification.permission;
            if (browserPerm === 'granted') setPermissionStatus('granted');
            else if (browserPerm === 'denied') setPermissionStatus('denied');
            else setPermissionStatus('prompt');
        }
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
                        id: NOTIFICATION_IDS.LIVE_GREEN,
                        ...liveCleanNotification(nowSlot.intensity.forecast, prefs.lowIntensityThreshold, readTone()),
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
    const generateForecastSummary = useCallback((forecast: ForecastData[]): string => {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Start of day
        const endOfDay = new Date(today);
        endOfDay.setHours(23, 59, 59, 999);

        const todaySlots = forecast.filter(slot => {
            const slotTime = new Date(slot.from);
            return slotTime >= today && slotTime <= endOfDay;
        });

        if (todaySlots.length === 0) return NO_DAILY_FORECAST_BODY;

        const avgIntensity = Math.round(
            todaySlots.reduce((sum, slot) => sum + slot.intensity.forecast, 0) / todaySlots.length
        );

        const lowPeriods = todaySlots.filter(slot => slot.intensity.forecast < prefs.lowIntensityThreshold).length;
        const lowHours = lowPeriods * 0.5; // Each slot is 30 min

        // Find longest green period for "best time windows"
        let longestGreenStart: Date | null = null;
        let longestGreenDuration = 0;
        let currentGreenStart: Date | null = null;
        let currentGreenDuration = 0;

        for (const slot of todaySlots) {
            const isGreen = slot.intensity.forecast < prefs.lowIntensityThreshold;
            if (isGreen) {
                if (!currentGreenStart) {
                    currentGreenStart = new Date(slot.from);
                    currentGreenDuration = 0.5;
                } else {
                    currentGreenDuration += 0.5;
                }
            } else {
                if (currentGreenDuration > longestGreenDuration) {
                    longestGreenDuration = currentGreenDuration;
                    longestGreenStart = currentGreenStart;
                }
                currentGreenStart = null;
                currentGreenDuration = 0;
            }
        }
        // Check final window
        if (currentGreenDuration > longestGreenDuration) {
            longestGreenDuration = currentGreenDuration;
            longestGreenStart = currentGreenStart;
        }

        const best = longestGreenStart && longestGreenDuration >= 1
            ? {
                start: longestGreenStart,
                end: new Date(longestGreenStart.getTime() + longestGreenDuration * 60 * 60 * 1000),
                hours: longestGreenDuration,
            }
            : null;

        return dailyOutlookBody({
            avg: avgIntensity,
            cleanHours: lowHours,
            threshold: prefs.lowIntensityThreshold,
            best,
        });
    }, [prefs.lowIntensityThreshold]);

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

            // Cancel existing daily forecast notification
            await LocalNotifications.cancel({
                notifications: [{ id: NOTIFICATION_IDS.DAILY_FORECAST }],
            });
            logger.info('Cancelled previous daily forecast notification');

            // Generate forecast summary
            const summary = generateForecastSummary(forecast);

            // Schedule repeating daily notification
            await LocalNotifications.schedule({
                notifications: [{
                    id: NOTIFICATION_IDS.DAILY_FORECAST,
                    title: DAILY_OUTLOOK_TITLE,
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
    }, [prefs.dailyForecastEnabled, prefs.dailyForecastTime, permissionStatus, generateForecastSummary]);

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

        // Live Accuracy Mode uses background checks instead of forecast schedules.
        // Only clear forecast green IDs — never wipe planner reminders / daily / high alerts.
        if (prefs.useBackgroundFetch) {
            logger.info('Background fetch enabled, cancelling forecast-based green alerts only');
            const cancelled = await cancelMatchingPending(isForecastGreenScheduleId);
            logger.info('Cancelled forecast green alerts for background fetch', { cancelled });
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

        // Clean up only previous green forecast alerts (preserve planner reminders)
        const cancelled = await cancelMatchingPending(isForecastGreenScheduleId);
        logger.info('Pending green alerts cancelled before reschedule', { cancelled });

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

                pendingNotifications.push({
                    id: greenAlertId(startTime.getTime()),
                    ...cleanWindowNotification(startTime, slot.intensity.forecast, prefs.lowIntensityThreshold, readTone()),
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

        // Replace prior high-intensity alerts only
        await cancelMatchingPending(isHighAlertId);

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

                pendingNotifications.push({
                    id: highAlertId(startTime.getTime()),
                    ...highWindowNotification(startTime, slot.intensity.forecast, prefs.highIntensityThreshold, readTone()),
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
        scheduleHighIntensityAlerts,
        digestDeliveryAvailable: DIGEST_DELIVERY_AVAILABLE,
        highIntensityBounds: { min: HIGH_INTENSITY_MIN, max: HIGH_INTENSITY_MAX },
    };
}
