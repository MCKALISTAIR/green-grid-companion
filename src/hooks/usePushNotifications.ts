import { useEffect, useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PushNotificationPrefs {
  lowIntensityEnabled: boolean;
  lowIntensityThreshold: number;
  dailyForecastEnabled: boolean;
  dailyForecastTime: string;
  weeklyDigestEnabled: boolean;
  weeklyDigestDay: number;
  monthlyReportEnabled: boolean;
  monthlyReportDay: number;
}

const DEFAULT_PREFS: PushNotificationPrefs = {
  lowIntensityEnabled: false,
  lowIntensityThreshold: 100,
  dailyForecastEnabled: false,
  dailyForecastTime: '07:00',
  weeklyDigestEnabled: false,
  weeklyDigestDay: 0,
  monthlyReportEnabled: false,
  monthlyReportDay: 1,
};

export function usePushNotifications(postcode: string) {
  const [deviceToken, setDeviceToken] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<PushNotificationPrefs>(DEFAULT_PREFS);
  const [isRegistered, setIsRegistered] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const isNative = Capacitor.isNativePlatform();

  // Load preferences from database
  const loadPreferences = useCallback(async (token: string) => {
    try {
      const { data, error } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('device_token', token)
        .maybeSingle();

      if (error) {
        console.error('Error loading preferences:', error);
        return;
      }

      if (data) {
        setPrefs({
          lowIntensityEnabled: data.low_intensity_enabled,
          lowIntensityThreshold: data.low_intensity_threshold,
          dailyForecastEnabled: data.daily_forecast_enabled,
          dailyForecastTime: data.daily_forecast_time,
          weeklyDigestEnabled: data.weekly_digest_enabled,
          weeklyDigestDay: data.weekly_digest_day,
          monthlyReportEnabled: data.monthly_report_enabled,
          monthlyReportDay: data.monthly_report_day,
        });
        setIsRegistered(true);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  }, []);

  // Initialize push notifications
  useEffect(() => {
    if (!isNative) return;

    const initPush = async () => {
      try {
        // Check current permission status
        const permStatus = await PushNotifications.checkPermissions();
        setPermissionStatus(permStatus.receive as 'prompt' | 'granted' | 'denied');

        if (permStatus.receive === 'granted') {
          // Already have permission, register
          await PushNotifications.register();
        }
      } catch (error) {
        console.error('Push init error:', error);
      }
    };

    initPush();

    // Add listeners
    const registrationListener = PushNotifications.addListener('registration', async (token: Token) => {
      console.log('Push registration success, token:', token.value);
      setDeviceToken(token.value);
      setPermissionStatus('granted');
      await loadPreferences(token.value);
    });

    const errorListener = PushNotifications.addListener('registrationError', (error) => {
      console.error('Push registration error:', error);
      toast.error('Failed to register for notifications');
    });

    const notificationListener = PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
      console.log('Push notification received:', notification);
      // Show in-app toast when notification received in foreground
      toast.info(notification.title || 'GridSense', {
        description: notification.body,
      });
    });

    const actionListener = PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
      console.log('Push notification action performed:', action);
      // Handle notification tap - could navigate to specific screen
    });

    return () => {
      registrationListener.then(l => l.remove());
      errorListener.then(l => l.remove());
      notificationListener.then(l => l.remove());
      actionListener.then(l => l.remove());
    };
  }, [isNative, loadPreferences]);

  // Request permission and get token
  const requestPermission = useCallback(async (): Promise<string | null> => {
    if (!isNative) {
      toast.error('Push notifications require the native app');
      return null;
    }

    try {
      const permStatus = await PushNotifications.requestPermissions();

      if (permStatus.receive === 'granted') {
        // Create a promise that resolves when registration event fires
        const tokenPromise = new Promise<string>((resolve) => {
          const handler = PushNotifications.addListener('registration', (token: Token) => {
            handler.then(h => h.remove()); // Cleanup immediately
            resolve(token.value);
          });
        });

        await PushNotifications.register();
        setPermissionStatus('granted');
        toast.success('Push notifications enabled! 🎉');

        // Wait for the token (with timeout safety)
        const token = await Promise.race([
          tokenPromise,
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000))
        ]);

        return token;
      } else {
        setPermissionStatus('denied');
        toast.error('Notification permission denied');
        return null;
      }
    } catch (error) {
      console.error('Permission request error:', error);
      toast.error('Failed to request permission');
      return null;
    }
  }, [isNative]);

  // Save preferences to database
  const savePreferences = useCallback(async (newPrefs: PushNotificationPrefs, tokenOverride?: string) => {
    const token = tokenOverride || deviceToken;

    if (!token || !postcode) {
      // Even if we can't save to DB yet, we update local state
      setPrefs(newPrefs);
      return;
    }

    try {
      // Optimistic update
      setPrefs(newPrefs);

      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          device_token: token,
          postcode: postcode,
          low_intensity_enabled: newPrefs.lowIntensityEnabled,
          low_intensity_threshold: newPrefs.lowIntensityThreshold,
          daily_forecast_enabled: newPrefs.dailyForecastEnabled,
          daily_forecast_time: newPrefs.dailyForecastTime,
          weekly_digest_enabled: newPrefs.weeklyDigestEnabled,
          weekly_digest_day: newPrefs.weeklyDigestDay,
          monthly_report_enabled: newPrefs.monthlyReportEnabled,
          monthly_report_day: newPrefs.monthlyReportDay,
          platform: Capacitor.getPlatform(),
        }, {
          onConflict: 'device_token'
        });

      if (error) {
        throw error;
      }

      setIsRegistered(true);
      if (token !== deviceToken) setDeviceToken(token); // Ensure state is consistent
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Failed to save notification settings');
    }
  }, [deviceToken, postcode]);

  // Update a single preference
  const updatePreference = useCallback(<K extends keyof PushNotificationPrefs>(
    key: K,
    value: PushNotificationPrefs[K],
    tokenOverride?: string
  ) => {
    const newPrefs = { ...prefs, [key]: value };
    savePreferences(newPrefs, tokenOverride);
  }, [prefs, savePreferences]);

  // Unregister device
  const unregister = useCallback(async () => {
    if (!deviceToken) return;

    try {
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('device_token', deviceToken);

      setIsRegistered(false);
      setPrefs(DEFAULT_PREFS);
      toast.success('Notifications disabled');
    } catch (error) {
      console.error('Error unregistering:', error);
    }
  }, [deviceToken]);

  return {
    isNative,
    isRegistered,
    permissionStatus,
    deviceToken,
    prefs,
    requestPermission,
    savePreferences,
    updatePreference,
    unregister,
  };
}
