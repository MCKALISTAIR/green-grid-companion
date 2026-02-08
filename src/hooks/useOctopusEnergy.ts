import { useState, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import { parseEdgeFunctionError } from '@/lib/errorUtils';
import { ensureAuthSession, hasValidSession } from '@/lib/auth-utils';

export interface OctopusMeter {
  id: string;
  mpan: string;
  serial_number: string;
  is_active: boolean;
  last_sync_at: string | null;
  meter_type?: string;
}

export interface FootprintRecord {
  id: string;
  interval_start: string;
  interval_end: string;
  consumption_kwh: number;
  intensity_gco2_kwh: number;
  carbon_g: number;
  intensity_index: string;
  mpan: string;
}

export interface FootprintSummary {
  total_carbon_kg: number;
  total_kwh: number;
  avg_intensity: number;
  by_intensity_index: Record<string, { count: number; carbon_g: number; kwh: number }>;
  period_days: number;
  // Export/net fields
  export_kwh?: number;
  export_carbon_kg?: number;
  net_carbon_kg?: number;
  has_export_meter?: boolean;
}

export interface FootprintData {
  records: FootprintRecord[];
  export_records?: FootprintRecord[];
  summary: FootprintSummary;
}

export interface OctopusStatus {
  is_linked: boolean;
  has_credentials: boolean;
  meters: OctopusMeter[];
  latest_consumption: string | null;
  footprint_records: number;
}

export interface GreennessForecastItem {
  validFrom: string;
  validTo: string;
  greennessScore: number;
  greennessIndex: number;
  highlightFlag: boolean;
}

export interface DispatchSlot {
  start?: string;
  end?: string;
  startDt?: string;
  endDt?: string;
  chargeKwh?: number;
  source?: string;
  location?: string;
}

export interface IntelligentDispatchData {
  planned: DispatchSlot[];
  completed: DispatchSlot[];
  chargingStarted: boolean;
  chargingStartDispatch: {
    startTime: string;
    endTime: string;
    source?: string;
  } | null;
  message?: string;
}

const LOCAL_STORAGE_KEYS = {
  isLinked: 'octopus-is-linked',
  hasCreds: 'octopus-has-creds',
  credentials: 'octopus-cached-real-creds',
  pendingSync: 'octopus-pending-sync',
};

export function useOctopusEnergy(days: number = 30) {
  const queryClient = useQueryClient();

  // All useState hooks must be declared first in the same order every render
  const [isSyncing, setIsSyncing] = useState(false);
  const [cachedIsLinked, setCachedIsLinked] = useState(() => localStorage.getItem(LOCAL_STORAGE_KEYS.isLinked) === 'true');
  const [cachedHasCreds, setCachedHasCreds] = useState(() => localStorage.getItem(LOCAL_STORAGE_KEYS.hasCreds) === 'true');
  // Cached credentials for re-linking or local-only storage
  const [cachedCredentials, setCachedCredentials] = useState<{ apiKey: string; accountNumber: string } | null>(() => {
    const cached = localStorage.getItem(LOCAL_STORAGE_KEYS.credentials);
    return cached ? JSON.parse(cached) : null;
  });

  // Fetch status if user might have credentials
  const shouldFetchStatus = cachedIsLinked || cachedHasCreds;

  // Fetch current status
  const { data: status, isLoading: statusLoading, refetch: refetchStatus } = useQuery({
    queryKey: ['octopus-status'],
    queryFn: async (): Promise<OctopusStatus> => {
      // Check if we can get a session
      const session = await ensureAuthSession();
      
      if (!session) {
        // No session - return local-only status
        return {
          is_linked: false,
          has_credentials: !!cachedCredentials,
          meters: [],
          latest_consumption: null,
          footprint_records: 0
        };
      }

      const { data, error } = await supabase.functions.invoke('octopus-energy', {
        body: { action: 'get-status' }
      });

      if (error) {
        // If 401, session might be invalid - return empty state
        if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
          localStorage.removeItem(LOCAL_STORAGE_KEYS.isLinked);
          localStorage.removeItem(LOCAL_STORAGE_KEYS.hasCreds);
          return {
            is_linked: false,
            has_credentials: !!cachedCredentials,
            meters: [],
            latest_consumption: null,
            footprint_records: 0
          };
        }
        throw new Error(error.message || 'Failed to fetch status');
      }
      return data;
    },
    enabled: shouldFetchStatus,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes - keep in cache
    retry: false, // Don't retry on auth failures
  });

  // Sync status to local storage for future optimistic loading
  useEffect(() => {
    if (status) {
      if (status.is_linked) {
        localStorage.setItem(LOCAL_STORAGE_KEYS.isLinked, 'true');
      } else {
        localStorage.removeItem(LOCAL_STORAGE_KEYS.isLinked);
      }

      if (status.has_credentials) {
        localStorage.setItem(LOCAL_STORAGE_KEYS.hasCreds, 'true');
      } else {
        localStorage.removeItem(LOCAL_STORAGE_KEYS.hasCreds);
      }
    }
  }, [status]);

  // Auto-sync on app open if last sync is stale (>24 hours)
  useEffect(() => {
    if (!status?.is_linked || !status?.meters?.length) return;

    const oldestSync = status.meters
      .map(m => m.last_sync_at ? new Date(m.last_sync_at).getTime() : 0)
      .reduce((min, t) => Math.min(min, t), Date.now());

    const hoursSinceSync = (Date.now() - oldestSync) / (1000 * 60 * 60);
    const autoSyncKey = 'octopus-auto-sync-last';
    const lastAutoSync = localStorage.getItem(autoSyncKey);
    const hoursSinceAutoSync = lastAutoSync
      ? (Date.now() - parseInt(lastAutoSync, 10)) / (1000 * 60 * 60)
      : Infinity;

    // Only auto-sync if data is >24h stale AND we haven't auto-synced in the last 6 hours
    if (hoursSinceSync > 24 && hoursSinceAutoSync > 6) {
      logger.info('Auto-syncing Octopus data (stale for ' + Math.round(hoursSinceSync) + 'h)');
      localStorage.setItem(autoSyncKey, Date.now().toString());

      // Run in background without blocking UI
      (async () => {
        try {
          const session = await ensureAuthSession();
          if (!session) return;

          await supabase.functions.invoke('octopus-energy', {
            body: { action: 'sync-consumption', days: 3 }
          });
          await supabase.functions.invoke('octopus-energy', {
            body: { action: 'calculate-footprint' }
          });
          await refetchStatus();
          logger.info('Auto-sync completed successfully');
        } catch (err) {
          logger.warn('Auto-sync failed', { error: err });
        }
      })();
    }
  }, [status?.is_linked, status?.meters]);

  // Fetch footprint data with dynamic range
  const { data: footprint, isLoading: footprintLoading, refetch: refetchFootprint } = useQuery({
    queryKey: ['octopus-footprint', days],
    queryFn: async (): Promise<FootprintData> => {
      const safeDays = Math.max(1, days);
      const { data, error } = await supabase.functions.invoke('octopus-energy', {
        body: { action: 'get-footprint', days: safeDays }
      });

      if (error) throw new Error(error.message || 'Failed to fetch footprint');
      return data;
    },
    enabled: status?.is_linked ?? cachedIsLinked,
    staleTime: 10 * 60 * 1000, // 10 minutes - data stays fresh longer
    gcTime: 30 * 60 * 1000, // 30 minutes - keep in cache even when unmounted
  });

  // Fetch Greener Nights Forecast (only if linked AND has credentials)
  const { data: greennessForecast, isLoading: forecastLoading } = useQuery({
    queryKey: ['greenness-forecast'],
    queryFn: async (): Promise<GreennessForecastItem[]> => {
      const { data, error } = await supabase.functions.invoke('octopus-energy', {
        body: { action: 'get-greenness-forecast' }
      });
      if (error) {
        logger.warn('Greenness forecast fetch failed', { error: error.message });
        return []; // Graceful fallback
      }
      return data?.forecast || [];
    },
    enabled: (status?.is_linked && status?.has_credentials) ?? (cachedIsLinked && cachedHasCreds),
    staleTime: 1000 * 60 * 60 * 4, // 4 hours
    gcTime: 1000 * 60 * 60 * 8, // 8 hours cache
    retry: 1, // Only retry once - this is non-critical data
  });

  // Fetch Intelligent Dispatch slots (planned and completed charging windows)
  const { 
    data: intelligentDispatches, 
    isLoading: dispatchesLoading,
    refetch: refetchDispatches 
  } = useQuery({
    queryKey: ['intelligent-dispatches'],
    queryFn: async (): Promise<IntelligentDispatchData> => {
      const { data, error } = await supabase.functions.invoke('octopus-energy', {
        body: { action: 'get-intelligent-dispatches' }
      });
      if (error) {
        logger.warn('Intelligent dispatches fetch failed', { error: error.message });
        return { planned: [], completed: [], chargingStarted: false, chargingStartDispatch: null };
      }
      return data as IntelligentDispatchData;
    },
    enabled: (status?.is_linked && status?.has_credentials) ?? (cachedIsLinked && cachedHasCreds),
    staleTime: 1000 * 60 * 5, // 5 minutes - check more frequently for active charging
    gcTime: 1000 * 60 * 30, // 30 minutes cache
    refetchInterval: 1000 * 60 * 5, // Auto-refresh every 5 minutes to detect charging start
    retry: 1,
  });

  // Try to sync pending credentials when auth becomes available
  const syncPendingCredentials = useCallback(async () => {
    const hasPending = localStorage.getItem(LOCAL_STORAGE_KEYS.pendingSync) === 'true';
    if (!hasPending || !cachedCredentials) return;

    const hasSession = await hasValidSession();
    if (!hasSession) return;

    logger.info('Syncing pending Octopus credentials to backend');
    
    try {
      const { error } = await supabase.functions.invoke('octopus-energy', {
        body: { 
          action: 'save-credentials', 
          apiKey: cachedCredentials.apiKey, 
          accountNumber: cachedCredentials.accountNumber 
        }
      });

      if (!error) {
        localStorage.removeItem(LOCAL_STORAGE_KEYS.pendingSync);
        toast.success('Octopus credentials synced to your account!');
        await refetchStatus();
      }
    } catch (error) {
      logger.warn('Failed to sync pending credentials', { error });
    }
  }, [cachedCredentials, refetchStatus]);

  // Check for pending sync on mount and auth state changes
  useEffect(() => {
    syncPendingCredentials();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        // Re-enable status query so we discover existing server-side data
        setCachedHasCreds(true);
        syncPendingCredentials();
        queryClient.invalidateQueries({ queryKey: ['octopus-status'] });
      }
      if (event === 'SIGNED_OUT') {
        // Clear all cached octopus state so signed-out view is clean
        Object.values(LOCAL_STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
        setCachedCredentials(null);
        setCachedIsLinked(false);
        setCachedHasCreds(false);
        queryClient.removeQueries({ queryKey: ['octopus-status'] });
        queryClient.removeQueries({ queryKey: ['octopus-footprint'] });
        queryClient.removeQueries({ queryKey: ['greenness-forecast'] });
        queryClient.removeQueries({ queryKey: ['intelligent-dispatches'] });
      }
    });

    return () => subscription.unsubscribe();
  }, [syncPendingCredentials, queryClient]);

  // Migrate data from anonymous session to authenticated user
  const migrateData = useCallback(async (previousUserId: string) => {
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('octopus-energy', {
        body: { action: 'migrate-data', previousUserId }
      });

      if (error) throw new Error(error.message || 'Failed to migrate data');

      if (data.migrated?.credentials || data.migrated?.meters > 0) {
        toast.success('Your Octopus data has been restored to this account!');
        await refetchStatus();
      }
      return data;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to migrate data';
      logger.error('Data migration failed', { error: message });
      // Don't show error toast - this is a background operation
      return null;
    } finally {
      setIsSyncing(false);
    }
  }, [refetchStatus]);

  // Helper function to link meters (internal use)
  const linkMeterInternal = useCallback(async (): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke('octopus-energy', {
        body: { action: 'get-meters' }
      });

      if (error) {
        logger.warn('Failed to auto-link meters', { error: error.message });
        return false;
      }

      if (data.meters?.length > 0) {
        logger.info(`Auto-linked ${data.meters.length} meter(s)`);
        return true;
      }
      return false;
    } catch (error) {
      logger.warn('Error auto-linking meters', { error });
      return false;
    }
  }, []);

  // Save Credentials (with local fallback) - auto-links meters on success
  const saveCredentials = useCallback(async (apiKey: string, accountNumber: string) => {
    setIsSyncing(true);
    
    // Always cache credentials locally first
    const creds = { apiKey, accountNumber };
    localStorage.setItem(LOCAL_STORAGE_KEYS.credentials, JSON.stringify(creds));
    setCachedCredentials(creds);
    localStorage.setItem(LOCAL_STORAGE_KEYS.hasCreds, 'true');

    try {
      // Try to get/create a session
      const session = await ensureAuthSession();
      
      if (!session) {
        // No session available - save locally only and mark for later sync
        logger.info('Saving Octopus credentials locally (no auth session)');
        localStorage.setItem(LOCAL_STORAGE_KEYS.pendingSync, 'true');
        toast.success('Credentials saved! Sign in to sync across devices.');
        return;
      }

      // We have a session - save to backend
      const { error } = await supabase.functions.invoke('octopus-energy', {
        body: { action: 'save-credentials', apiKey, accountNumber }
      });

      if (error) {
        // Backend save failed but we have local copy
        logger.warn('Backend save failed, credentials stored locally', { error: error.message });
        localStorage.setItem(LOCAL_STORAGE_KEYS.pendingSync, 'true');
        toast.success('Credentials saved locally. Will sync when connected.');
        return;
      }

      // Success - clear pending sync flag and auto-link meters
      localStorage.removeItem(LOCAL_STORAGE_KEYS.pendingSync);
      
      // Auto-link meters immediately after saving credentials
      const metersLinked = await linkMeterInternal();
      
      if (metersLinked) {
        toast.success('Account connected and meter(s) linked!');
        localStorage.setItem(LOCAL_STORAGE_KEYS.isLinked, 'true');
      } else {
        toast.success('Credentials saved. Could not find meters - check your account.');
      }
      
      await refetchStatus();
    } catch (error: unknown) {
      // Any error - we still have the local copy
      logger.warn('Error saving credentials to backend', { error });
      localStorage.setItem(LOCAL_STORAGE_KEYS.pendingSync, 'true');
      toast.success('Credentials saved locally. Will sync when connected.');
    } finally {
      setIsSyncing(false);
    }
  }, [refetchStatus, linkMeterInternal]);

  const clearCachedCredentials = useCallback(() => {
    localStorage.removeItem(LOCAL_STORAGE_KEYS.credentials);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.pendingSync);
    setCachedCredentials(null);
    toast.info('Removed saved credentials from device');
  }, []);

  // Link meter (fetch from Octopus API)
  const linkMeter = useCallback(async () => {
    setIsSyncing(true);
    try {
      // Ensure we have a session
      const session = await ensureAuthSession();
      
      if (!session) {
        toast.error('Please sign in to link your meter');
        return null;
      }

      const { data, error } = await supabase.functions.invoke('octopus-energy', {
        body: { action: 'get-meters' }
      });

      if (error) throw new Error(error.message || 'Failed to link meter');

      if (data.meters?.length > 0) {
        toast.success(`Linked ${data.meters.length} meter(s) successfully!`);
        await refetchStatus();
      } else {
        toast.error('No electricity meters found on your account');
      }

      return data;
    } catch (error: unknown) {
      const message = parseEdgeFunctionError(error, { feature: 'octopus', action: 'link' });
      toast.error(message);
      throw error;
    } finally {
      setIsSyncing(false);
    }
  }, [refetchStatus]);

  // Sync consumption data
  const syncConsumption = useCallback(async (syncDays: number = 7) => {
    setIsSyncing(true);
    try {
      // Ensure we have a session
      const session = await ensureAuthSession();
      
      if (!session) {
        toast.error('Please sign in to sync consumption data');
        return null;
      }

      const { data, error } = await supabase.functions.invoke('octopus-energy', {
        body: { action: 'sync-consumption', days: syncDays }
      });

      if (error) throw new Error(error.message || 'Failed to sync consumption');

      toast.success(`Synced ${data.readings_synced} consumption readings`);
      await refetchStatus();
      return data;
    } catch (error: unknown) {
      const message = parseEdgeFunctionError(error, { feature: 'octopus', action: 'sync' });
      toast.error(message);
      throw error;
    } finally {
      setIsSyncing(false);
    }
  }, [refetchStatus]);

  // Calculate footprint from consumption
  const calculateFootprint = useCallback(async () => {
    setIsSyncing(true);
    try {
      // Ensure we have a session
      const session = await ensureAuthSession();
      
      if (!session) {
        toast.error('Please sign in to calculate footprint');
        return null;
      }

      const { data, error } = await supabase.functions.invoke('octopus-energy', {
        body: { action: 'calculate-footprint' }
      });

      if (error) throw new Error(error.message || 'Failed to calculate footprint');

      toast.success(`Calculated carbon footprint for ${data.records_calculated} periods`);
      await refetchFootprint();
      return data;
    } catch (error: unknown) {
      const message = parseEdgeFunctionError(error, { feature: 'octopus', action: 'calculate' });
      toast.error(message);
      throw error;
    } finally {
      setIsSyncing(false);
    }
  }, [refetchFootprint]);

  // Full sync: consumption + footprint calculation
  const fullSync = useCallback(async (syncDays: number = 7) => {
    await syncConsumption(syncDays);
    await calculateFootprint();
  }, [syncConsumption, calculateFootprint]);

  // Disconnect Account
  const disconnect = useCallback(async () => {
    setIsSyncing(true);
    try {
      const hasSession = await hasValidSession();
      
      if (hasSession) {
        const { error } = await supabase.functions.invoke('octopus-energy', {
          body: { action: 'disconnect-account' }
        });

        if (error) throw new Error(error.message || 'Failed to disconnect account');
      }

      toast.success('Disconnected Octopus Energy account');

      // Clear all local storage
      queryClient.setQueryData(['octopus-status'], null);
      queryClient.setQueryData(['octopus-footprint', days], null);
      Object.values(LOCAL_STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
      setCachedCredentials(null);

      await refetchStatus();
    } catch (error: unknown) {
      const message = parseEdgeFunctionError(error, { feature: 'octopus', action: 'disconnect' });
      toast.error(message);
      throw error;
    } finally {
      setIsSyncing(false);
    }
  }, [refetchStatus, queryClient, days]);

  // Check if there are pending credentials to sync
  const hasPendingSync = localStorage.getItem(LOCAL_STORAGE_KEYS.pendingSync) === 'true';

  return {
    status,
    footprint,
    greennessForecast,
    intelligentDispatches,
    isLoading: statusLoading || footprintLoading || forecastLoading,
    isLoadingDispatches: dispatchesLoading,
    isSyncing,
    isLinked: status?.is_linked ?? false,
    hasCredentials: status?.has_credentials ?? !!cachedCredentials,
    saveCredentials,
    linkMeter,
    syncConsumption,
    calculateFootprint,
    fullSync,
    disconnect,
    migrateData,
    refetchStatus,
    refetchFootprint,
    refreshDispatches: refetchDispatches,
    // New exports
    cachedCredentials,
    clearCachedCredentials,
    hasPendingSync,
  };
}
