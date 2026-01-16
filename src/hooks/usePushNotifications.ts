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
}

const DEFAULT_PREFS: PushNotificationPrefs = {
  lowIntensityEnabled: false,
  lowIntensityThreshold: 100,
  dailyForecastEnabled: false,
  dailyForecastTime: '07:00',
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

  // Request permission and register
  const requestPermission = useCallback(async () => {
    if (!isNative) {
      toast.error('Push notifications require the native app');
      return false;
    }

    try {
      const permStatus = await PushNotifications.requestPermissions();
      
      if (permStatus.receive === 'granted') {
        await PushNotifications.register();
        setPermissionStatus('granted');
        toast.success('Push notifications enabled! 🎉');
        return true;
      } else {
        setPermissionStatus('denied');
        toast.error('Notification permission denied');
        return false;
      }
    } catch (error) {
      console.error('Permission request error:', error);
      toast.error('Failed to request permission');
      return false;
    }
  }, [isNative]);

  // Save preferences to database
  const savePreferences = useCallback(async (newPrefs: PushNotificationPrefs) => {
    if (!deviceToken || !postcode) return;

    try {
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          device_token: deviceToken,
          postcode: postcode,
          low_intensity_enabled: newPrefs.lowIntensityEnabled,
          low_intensity_threshold: newPrefs.lowIntensityThreshold,
          daily_forecast_enabled: newPrefs.dailyForecastEnabled,
          daily_forecast_time: newPrefs.dailyForecastTime,
          platform: Capacitor.getPlatform(),
        }, {
          onConflict: 'device_token'
        });

      if (error) {
        console.error('Error saving preferences:', error);
        toast.error('Failed to save notification settings');
        return;
      }

      setPrefs(newPrefs);
      setIsRegistered(true);
      toast.success('Notification settings saved!');
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Failed to save notification settings');
    }
  }, [deviceToken, postcode]);

  // Update a single preference
  const updatePreference = useCallback(<K extends keyof PushNotificationPrefs>(
    key: K,
    value: PushNotificationPrefs[K]
  ) => {
    const newPrefs = { ...prefs, [key]: value };
    savePreferences(newPrefs);
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
