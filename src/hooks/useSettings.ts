import { appStorage } from '@/lib/appStorage';
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { HouseType, DEFAULT_HOUSE_TYPE } from '@/lib/energy-standards';
import { logger } from '@/lib/logger';

const LOCAL_SETTINGS_KEY = 'grid-companion-settings';

interface Settings {
  houseType: HouseType;
  customAnnualKwh: number;
  showGridFrequency: boolean;
  customAppliance?: { name: string; power: number; duration: number; label: string } | null;
  customEvent?: { name: string; duration: string; power: string } | null;
}

const DEFAULT_SETTINGS: Settings = {
  houseType: DEFAULT_HOUSE_TYPE,
  customAnnualKwh: 2900,
  showGridFrequency: false,
  customAppliance: null,
  customEvent: null,
};

const LAST_SYNC_KEY = 'grid-companion-last-sync';
// BH-133: which signed-in account the local settings last belonged to.
export const SETTINGS_OWNER_KEY = 'grid-companion-settings-owner';
const LOAD_RETRY_BASE_MS = 2000;
const LOAD_RETRY_MAX_MS = 60_000;

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(() => {
    try {
      const saved = appStorage.getItem(LOCAL_SETTINGS_KEY);
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch (error) {
      console.error('Failed to parse settings:', error);
      return DEFAULT_SETTINGS;
    }
  });

  const [userId, setUserId] = useState<string | null>(null);
  const isSyncingRef = useRef(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(() => {
    const saved = appStorage.getItem(LAST_SYNC_KEY);
    return saved ? new Date(saved) : null;
  });
  const channelRef = useRef<RealtimeChannel | null>(null);
  // BH-133: the user id whose server settings have been loaded. Nothing is
  // written to the server until this matches the signed-in user, so a failed
  // load retries instead of disabling sync for the session, and an early write
  // can't overwrite the account with another user's local settings.
  const loadedUserRef = useRef<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const lastWriteRef = useRef(0);

  // Track auth state
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
      setUserId(session?.user?.id ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Sync to database
  const syncToDatabase = useCallback(
    async (newSettings: Settings) => {
      if (!userId || isSyncingRef.current || loadedUserRef.current !== userId) return;

      isSyncingRef.current = true;
      lastWriteRef.current = Date.now();
      try {
        const { error } = await supabase.from('user_preferences').upsert(
          {
            user_id: userId,
            settings: newSettings as unknown as Record<string, unknown>,
            updated_at: new Date().toISOString(),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- generated Supabase types lag the user_preferences JSON columns.
          } as any,
          { onConflict: 'user_id' },
        );

        if (error) {
          logger.error('Failed to sync settings', { error });
        } else {
          const now = new Date();
          setLastSyncedAt(now);
          appStorage.setItem(LAST_SYNC_KEY, now.toISOString());
        }
      } catch (err) {
        logger.error('Error syncing settings', { error: err });
      } finally {
        isSyncingRef.current = false;
      }
    },
    [userId],
  );

  // Load settings from database when authenticated (retries on failure, BH-133)
  useEffect(() => {
    if (!userId) {
      loadedUserRef.current = null;
      return;
    }
    if (loadedUserRef.current === userId) return;

    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    const retry = () => {
      if (!cancelled) setLoadAttempt((n) => n + 1);
    };

    const loadFromDatabase = async () => {
      let failed = false;
      try {
        const { data, error } = await supabase
          .from('user_preferences')
          .select('settings')
          .eq('user_id', userId)
          .single();
        if (cancelled) return;

        if (error && error.code !== 'PGRST116') {
          logger.error('Failed to load settings', { error });
          failed = true;
          return;
        }

        const owner = appStorage.getItem(SETTINGS_OWNER_KEY);
        appStorage.setItem(SETTINGS_OWNER_KEY, userId);

        if (
          data?.settings &&
          typeof data.settings === 'object' &&
          Object.keys(data.settings).length > 0
        ) {
          const dbSettings = data.settings as unknown as Settings;
          loadedUserRef.current = userId;
          setSettings({ ...DEFAULT_SETTINGS, ...dbSettings });
        } else if (owner && owner !== userId) {
          // Local settings belong to a different account: don't upload them.
          loadedUserRef.current = userId;
          setSettings(DEFAULT_SETTINGS);
        } else {
          // No settings in DB: this device's settings (anonymous or this user's) go up.
          loadedUserRef.current = userId;
          const localSettings = JSON.parse(appStorage.getItem(LOCAL_SETTINGS_KEY) || '{}');
          if (Object.keys(localSettings).length > 0) {
            await syncToDatabase({ ...DEFAULT_SETTINGS, ...localSettings });
          }
        }
      } catch (err) {
        logger.error('Error loading settings', { error: err });
        failed = true;
      } finally {
        if (failed && !cancelled) {
          const delay = Math.min(LOAD_RETRY_BASE_MS * 2 ** loadAttempt, LOAD_RETRY_MAX_MS);
          retryTimer = setTimeout(retry, delay);
        }
      }
    };

    window.addEventListener('online', retry);
    window.addEventListener('focus', retry);
    loadFromDatabase();
    return () => {
      cancelled = true;
      clearTimeout(retryTimer);
      window.removeEventListener('online', retry);
      window.removeEventListener('focus', retry);
    };
  }, [userId, loadAttempt, syncToDatabase]);

  // Set up realtime subscription for cross-device sync
  useEffect(() => {
    if (!userId) {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }

    const channel = supabase
      .channel(`settings:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_preferences',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          // Ignore self-triggered events (within 2 seconds of our own write)
          if (Date.now() - lastWriteRef.current < 2000) return;

          logger.debug('Realtime settings update', { event: payload.eventType });

          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const newData = payload.new as { settings?: Settings };
            if (newData.settings && Object.keys(newData.settings).length > 0) {
              setSettings({ ...DEFAULT_SETTINGS, ...newData.settings });
            }
          }
        },
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Always sync to localStorage for offline support
  useEffect(() => {
    try {
      appStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }, [settings]);
  // Sync on settings changes (debounced) - only when user actively changes something
  const prevSettingsRef = useRef<string>(JSON.stringify(settings));

  useEffect(() => {
    if (!userId || loadedUserRef.current !== userId) return;

    const currentSettingsStr = JSON.stringify(settings);
    // Only sync if settings actually changed (user made a change)
    if (currentSettingsStr === prevSettingsRef.current) return;

    prevSettingsRef.current = currentSettingsStr;

    // Debounce for 1 second to batch rapid changes
    const timeoutId = setTimeout(() => {
      syncToDatabase(settings);
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [settings, userId, syncToDatabase]);

  // Keep a ref to the latest settings so the periodic interval never captures stale values
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // Periodic sync every 48 hours
  useEffect(() => {
    if (!userId) return;

    const FORTY_EIGHT_HOURS = 48 * 60 * 60 * 1000;

    const checkAndSync = () => {
      if (!lastSyncedAt) {
        syncToDatabase(settingsRef.current);
        return;
      }

      const timeSinceSync = Date.now() - lastSyncedAt.getTime();
      if (timeSinceSync >= FORTY_EIGHT_HOURS) {
        syncToDatabase(settingsRef.current);
      }
    };

    // Check on mount
    checkAndSync();

    // Check periodically (every hour)
    const intervalId = setInterval(checkAndSync, 60 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [userId, lastSyncedAt, syncToDatabase]);

  // Handle reconnecting to network (retry sync if coming back online)
  useEffect(() => {
    if (!userId) return;

    const handleOnline = () => {
      logger.info('Device came online. Retrying settings sync.');
      syncToDatabase(settingsRef.current);
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [userId, syncToDatabase]);

  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const syncNow = useCallback(() => {
    if (userId && !isSyncingRef.current) {
      syncToDatabase(settings);
    }
  }, [userId, settings, syncToDatabase]);

  return {
    settings,
    updateSetting,
    // Convenience accessors
    houseType: settings.houseType,
    setHouseType: (type: HouseType) => updateSetting('houseType', type),
    customAnnualKwh: settings.customAnnualKwh,
    setCustomAnnualKwh: (kwh: number) => updateSetting('customAnnualKwh', kwh),
    showGridFrequency: settings.showGridFrequency,
    setShowGridFrequency: (show: boolean) => updateSetting('showGridFrequency', show),
    isSyncing: isSyncingRef.current,
    isAuthenticated: !!userId,
    lastSyncedAt,
    syncNow,
  };
}
