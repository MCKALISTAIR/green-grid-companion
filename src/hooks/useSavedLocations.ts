import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

export interface SavedLocation {
  id: string;
  name: string;
  postcode: string;
  createdAt: number;
}

const LOCAL_STORAGE_KEY = 'gridgreen-saved-locations';
const LOCAL_RECENT_KEY = 'gridgreen-recent-locations';
const MAX_RECENT = 5;

export function useSavedLocations() {
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [recentLocations, setRecentLocations] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_RECENT_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
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

  // Sync to database when data changes (if authenticated)
  const syncToDatabase = useCallback(async (locations: SavedLocation[], recent: string[]) => {
    if (!userId || isSyncing) return;

    setIsSyncing(true);
    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: userId,
          saved_locations: locations as unknown as Record<string, unknown>[],
          recent_locations: recent,
          updated_at: new Date().toISOString(),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any, { onConflict: 'user_id' });

      if (error) {
        logger.error('Failed to sync preferences', { error });
      }
    } catch (err) {
      logger.error('Error syncing preferences', { error: err });
    } finally {
      setIsSyncing(false);
    }
  }, [userId, isSyncing]);

  // Load from database when authenticated
  useEffect(() => {
    if (!userId) {
      isInitialLoadRef.current = true;
      return;
    }

    const loadFromDatabase = async () => {
      try {
        const { data, error } = await supabase
          .from('user_preferences')
          .select('saved_locations, recent_locations')
          .eq('user_id', userId)
          .maybeSingle();

        if (error) {
          logger.error('Failed to load preferences', { error });
          return;
        }

        if (data) {
          const dbSavedLocations = (data.saved_locations as unknown as SavedLocation[]) || [];
          const dbRecentLocations = (data.recent_locations as unknown as string[]) || [];

          // Merge local data with database data (database takes precedence)
          const localSaved = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
          const localRecent = JSON.parse(localStorage.getItem(LOCAL_RECENT_KEY) || '[]');

          // If DB is empty but local has data, use local (first sync scenario)
          if (dbSavedLocations.length === 0 && localSaved.length > 0) {
            setSavedLocations(localSaved);
            setRecentLocations(localRecent);
            // Sync local to database
            await syncToDatabase(localSaved, localRecent);
          } else {
            setSavedLocations(dbSavedLocations);
            setRecentLocations(dbRecentLocations);
          }
        } else {
          // No record exists - create one with local data
          const localSaved = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
          const localRecent = JSON.parse(localStorage.getItem(LOCAL_RECENT_KEY) || '[]');
          await syncToDatabase(localSaved, localRecent);
        }

        isInitialLoadRef.current = false;
      } catch (err) {
        logger.error('Error loading preferences', { error: err });
      }
    };

    loadFromDatabase();
  }, [userId, syncToDatabase]);

  // Set up realtime subscription for cross-device sync
  useEffect(() => {
    if (!userId) {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }

    // Subscribe to changes in user_preferences table
    const channel = supabase
      .channel(`user_preferences:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_preferences',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          logger.debug('Realtime preferences update', { event: payload.eventType });

          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const newData = payload.new as { saved_locations?: SavedLocation[]; recent_locations?: string[] };
            if (newData.saved_locations) {
              setSavedLocations(newData.saved_locations);
            }
            if (newData.recent_locations) {
              setRecentLocations(newData.recent_locations);
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

  // Sync to localStorage (always, for offline support)
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(savedLocations));
  }, [savedLocations]);

  useEffect(() => {
    localStorage.setItem(LOCAL_RECENT_KEY, JSON.stringify(recentLocations));
  }, [recentLocations]);




  // Debounced sync on data changes
  useEffect(() => {
    if (!userId || isInitialLoadRef.current) return;

    const timeoutId = setTimeout(() => {
      syncToDatabase(savedLocations, recentLocations);
    }, 500); // Debounce 500ms

    return () => clearTimeout(timeoutId);
  }, [savedLocations, recentLocations, userId, syncToDatabase]);

  const saveLocation = useCallback((name: string, postcode: string) => {
    const newLocation: SavedLocation = {
      id: crypto.randomUUID(),
      name: name.trim(),
      postcode,
      createdAt: Date.now(),
    };
    setSavedLocations((prev) => [...prev, newLocation]);
    return newLocation;
  }, []);

  const removeLocation = useCallback((id: string) => {
    setSavedLocations((prev) => prev.filter((loc) => loc.id !== id));
  }, []);

  const updateLocationName = useCallback((id: string, newName: string) => {
    setSavedLocations((prev) =>
      prev.map((loc) =>
        loc.id === id ? { ...loc, name: newName.trim() } : loc
      )
    );
  }, []);

  const addRecentLocation = useCallback((postcode: string) => {
    setRecentLocations((prev) => {
      const filtered = prev.filter((p) => p !== postcode);
      return [postcode, ...filtered].slice(0, MAX_RECENT);
    });
  }, []);

  const clearRecentLocations = useCallback(() => {
    setRecentLocations([]);
  }, []);

  const isLocationSaved = useCallback(
    (postcode: string) => savedLocations.some((loc) => loc.postcode === postcode),
    [savedLocations]
  );

  const getSavedLocationByPostcode = useCallback(
    (postcode: string) => savedLocations.find((loc) => loc.postcode === postcode),
    [savedLocations]
  );

  return {
    savedLocations,
    recentLocations,
    saveLocation,
    removeLocation,
    updateLocationName,
    addRecentLocation,
    clearRecentLocations,
    isLocationSaved,
    getSavedLocationByPostcode,
    isSyncing,
    isAuthenticated: !!userId,
  };
}
