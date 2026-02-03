import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { HouseType, DEFAULT_HOUSE_TYPE } from '@/lib/energy-standards';
import { logger } from '@/lib/logger';

const LOCAL_SETTINGS_KEY = 'grid-companion-settings';

interface Settings {
  houseType: HouseType;
  customAnnualKwh: number;
}

const DEFAULT_SETTINGS: Settings = {
  houseType: DEFAULT_HOUSE_TYPE,
  customAnnualKwh: 2900,
};

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_SETTINGS_KEY);
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch (error) {
      console.error('Failed to parse settings:', error);
      return DEFAULT_SETTINGS;
    }
  });

  const [userId, setUserId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isInitialLoadRef = useRef(true);

  // Track auth state
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUserId(session?.user?.id ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load settings from database when authenticated
  useEffect(() => {
    if (!userId) {
      isInitialLoadRef.current = true;
      return;
    }

    const loadFromDatabase = async () => {
      try {
        const { data, error } = await supabase
          .from('user_preferences')
          .select('settings')
          .eq('user_id', userId)
          .single();

        if (error && error.code !== 'PGRST116') {
          logger.error('Failed to load settings', { error });
          return;
        }

        if (data?.settings && typeof data.settings === 'object' && Object.keys(data.settings).length > 0) {
          const dbSettings = data.settings as unknown as Settings;
          setSettings({ ...DEFAULT_SETTINGS, ...dbSettings });
        } else {
          // No settings in DB, sync local settings up
          const localSettings = JSON.parse(localStorage.getItem(LOCAL_SETTINGS_KEY) || '{}');
          if (Object.keys(localSettings).length > 0) {
            await syncToDatabase({ ...DEFAULT_SETTINGS, ...localSettings });
          }
        }
        
        isInitialLoadRef.current = false;
      } catch (err) {
        logger.error('Error loading settings', { error: err });
      }
    };

    loadFromDatabase();
  }, [userId]);

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
          logger.debug('Realtime settings update', { event: payload.eventType });
          
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const newData = payload.new as any;
            if (newData.settings && Object.keys(newData.settings).length > 0) {
              setSettings({ ...DEFAULT_SETTINGS, ...newData.settings });
            }
          }
        }
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
      localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }, [settings]);

  // Sync to database
  const syncToDatabase = useCallback(async (newSettings: Settings) => {
    if (!userId || isSyncing) return;
    
    setIsSyncing(true);
    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: userId,
          settings: newSettings as unknown as Record<string, unknown>,
          updated_at: new Date().toISOString(),
        } as any, { onConflict: 'user_id' });

      if (error) {
        logger.error('Failed to sync settings', { error });
      }
    } catch (err) {
      logger.error('Error syncing settings', { error: err });
    } finally {
      setIsSyncing(false);
    }
  }, [userId, isSyncing]);

  // Debounced sync on settings changes
  useEffect(() => {
    if (!userId || isInitialLoadRef.current) return;
    
    const timeoutId = setTimeout(() => {
      syncToDatabase(settings);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [settings, userId, syncToDatabase]);

  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return {
    settings,
    updateSetting,
    // Convenience accessors
    houseType: settings.houseType,
    setHouseType: (type: HouseType) => updateSetting('houseType', type),
    customAnnualKwh: settings.customAnnualKwh,
    setCustomAnnualKwh: (kwh: number) => updateSetting('customAnnualKwh', kwh),
    isSyncing,
    isAuthenticated: !!userId,
  };
}
