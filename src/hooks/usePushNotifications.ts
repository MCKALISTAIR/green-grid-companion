import { useEffect, useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import {
  PushNotifications,
  Token,
  PushNotificationSchema,
  ActionPerformed,
} from '@capacitor/push-notifications';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

export interface PushNotificationPrefs {
  lowIntensityEnabled: boolean;
  lowIntensityThreshold: number;
  highIntensityEnabled: boolean;
  highIntensityThreshold: number;
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
  highIntensityEnabled: false,
  highIntensityThreshold: 200,
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
  const [permissionStatus, setPermissionStatus] = useState<'prompt' | 'granted' | 'denied'>(
    'prompt',
  );
  const isNative = Capacitor.isNativePlatform();

  // Load preferences via edge function (secure server-side access)
  const loadPreferences = useCallback(async (token: string) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      // Use query params for GET request
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/push-subscriptions?action=get&device_token=${encodeURIComponent(token)}`,
        {
          method: 'GET',
          headers,
        },
      );

      if (!response.ok) {
        throw new Error('Failed to load preferences');
      }

      const result = await response.json();

      if (result.data) {
        setPrefs({
          lowIntensityEnabled: result.data.low_intensity_enabled,
          lowIntensityThreshold: result.data.low_intensity_threshold,
          highIntensityEnabled: result.data.high_intensity_enabled ?? false,
          highIntensityThreshold: result.data.high_intensity_threshold ?? 200,
          dailyForecastEnabled: result.data.daily_forecast_enabled,
          dailyForecastTime: result.data.daily_forecast_time,
          weeklyDigestEnabled: result.data.weekly_digest_enabled,
          weeklyDigestDay: result.data.weekly_digest_day,
          monthlyReportEnabled: result.data.monthly_report_enabled,
          monthlyReportDay: result.data.monthly_report_day,
        });
        setIsRegistered(true);
      }
    } catch (error) {
      logger.error('Failed to load push notification preferences', { error });
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
        logger.error('Push notification initialization failed', { error });
      }
    };

    initPush();

    // Add listeners
    const registrationListener = PushNotifications.addListener(
      'registration',
      async (token: Token) => {
        logger.info('Push notification registered', { token: token.value });
        setDeviceToken(token.value);
        setPermissionStatus('granted');
        await loadPreferences(token.value);
      },
    );

    const errorListener = PushNotifications.addListener('registrationError', (error) => {
      logger.warn('Push notification background registration failed', { error });
    });

    const notificationListener = PushNotifications.addListener(
      'pushNotificationReceived',
      (notification: PushNotificationSchema) => {
        logger.info('Push notification received in foreground', { notification });
        // Show in-app toast when notification received in foreground
        toast.info(notification.title || 'GridSense', {
          description: notification.body,
        });
      },
    );

    const actionListener = PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (action: ActionPerformed) => {
        logger.info('Push notification action performed', { action });
        // Handle notification tap - could navigate to specific screen
      },
    );

    return () => {
      registrationListener.then((l) => l.remove());
      errorListener.then((l) => l.remove());
      notificationListener.then((l) => l.remove());
      actionListener.then((l) => l.remove());
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
            handler.then((h) => h.remove()); // Cleanup immediately
            resolve(token.value);
          });
        });

        await PushNotifications.register();
        setPermissionStatus('granted');
        toast.success('Push notifications enabled! 🎉');

        // Wait for the token (with timeout safety)
        const token = await Promise.race([
          tokenPromise,
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
        ]);

        return token;
      } else {
        setPermissionStatus('denied');
        toast.error('Notification permission denied');
        return null;
      }
    } catch (error) {
      logger.error('Push notification permission request failed', { error });
      toast.error('Failed to request permission');
      return null;
    }
  }, [isNative]);

  // Save preferences via edge function (secure server-side access)
  const savePreferences = useCallback(
    async (newPrefs: PushNotificationPrefs, tokenOverride?: string) => {
      const token = tokenOverride || deviceToken;

      if (!token || !postcode) {
        // Even if we can't save to DB yet, we update local state
        setPrefs(newPrefs);
        return;
      }

      try {
        // Optimistic update
        setPrefs(newPrefs);

        const {
          data: { session },
        } = await supabase.auth.getSession();
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        };
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/push-subscriptions?action=upsert`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify({
              device_token: token,
              postcode: postcode,
              low_intensity_enabled: newPrefs.lowIntensityEnabled,
              low_intensity_threshold: newPrefs.lowIntensityThreshold,
              high_intensity_enabled: newPrefs.highIntensityEnabled,
              high_intensity_threshold: newPrefs.highIntensityThreshold,
              daily_forecast_enabled: newPrefs.dailyForecastEnabled,
              daily_forecast_time: newPrefs.dailyForecastTime,
              weekly_digest_enabled: newPrefs.weeklyDigestEnabled,
              weekly_digest_day: newPrefs.weeklyDigestDay,
              monthly_report_enabled: newPrefs.monthlyReportEnabled,
              monthly_report_day: newPrefs.monthlyReportDay,
              platform: Capacitor.getPlatform(),
              is_sandbox: import.meta.env.DEV, // Send true in dev environments, false in production builds
              attestation_token: null, // Scaffolding placeholder for Apple DeviceCheck/Play Integrity native tokens
            }),
          },
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to save preferences');
        }

        setIsRegistered(true);
        if (token !== deviceToken) setDeviceToken(token); // Ensure state is consistent
      } catch (error) {
        logger.error('Failed to save push notification preferences', { error });
        toast.error('Failed to save notification settings');
      }
    },
    [deviceToken, postcode],
  );

  // Update a single preference
  const updatePreference = useCallback(
    <K extends keyof PushNotificationPrefs>(
      key: K,
      value: PushNotificationPrefs[K],
      tokenOverride?: string,
    ) => {
      const newPrefs = { ...prefs, [key]: value };
      savePreferences(newPrefs, tokenOverride);
    },
    [prefs, savePreferences],
  );

  // Unregister device via edge function
  const unregister = useCallback(async () => {
    if (!deviceToken) return;

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/push-subscriptions?action=delete&device_token=${encodeURIComponent(deviceToken)}`,
        {
          method: 'DELETE',
          headers,
        },
      );

      if (!response.ok) {
        throw new Error('Failed to unregister');
      }

      setIsRegistered(false);
      setPrefs(DEFAULT_PREFS);
      toast.success('Notifications disabled');
    } catch (error) {
      logger.error('Failed to unregister push notifications', { error });
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
