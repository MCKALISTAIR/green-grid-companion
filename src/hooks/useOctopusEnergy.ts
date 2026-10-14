import { useState, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import { parseEdgeFunctionError } from '@/lib/errorUtils';
import { ensureAuthSession, hasValidSession } from '@/lib/auth-utils';
import { takeLegacyOctopusCredentials } from '@/lib/octopusLegacyStorage';

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
  /** Last 4 characters of the stored API key (the key itself never leaves the server). */
  api_key_hint?: string | null;
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

// Only non-secret UI hints are cached on the device. API keys are never
// persisted client-side (web, iOS or Android): they are sent once to the
// octopus-energy edge function, which stores them encrypted server-side.
const LOCAL_STORAGE_KEYS = {
  isLinked: 'octopus-is-linked',
  hasCreds: 'octopus-has-creds',
};

function getLocalStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

// One-time cleanup of API keys cached by older app versions. Runs once per app
// session regardless of how many components use the hook.
let legacyCleanupPromise: Promise<boolean> | null = null;
function migrateLegacyCredentialsOnce(): Promise<boolean> {
  if (legacyCleanupPromise) return legacyCleanupPromise;
  legacyCleanupPromise = (async () => {
    // Always removes the legacy entries from storage, synchronously.
    const { credentials, pendingSync } = takeLegacyOctopusCredentials(getLocalStorage());
    // If the old app already synced them, the server has them: nothing to do.
    if (!credentials || !pendingSync) return false;

    logger.info('Uploading Octopus credentials left on device by an older app version');
    try {
      const session = await ensureAuthSession();
      if (!session) throw new Error('No session');
      const { error } = await supabase.functions.invoke('octopus-energy', {
        body: { action: 'save-credentials', apiKey: credentials.apiKey, accountNumber: credentials.accountNumber }
      });
      if (error) throw new Error(error.message);
      return true;
    } catch (error) {
      logger.warn('Could not upload legacy Octopus credentials; user must re-enter them', { error });
      toast.info('Please re-enter your Octopus API key in Settings to reconnect.');
      return false;
    }
  })();
  return legacyCleanupPromise;
}

export function useOctopusEnergy(days: number = 30) {
  const queryClient = useQueryClient();

  // All useState hooks must be declared first in the same order every render
  const [isSyncing, setIsSyncing] = useState(false);
  const [cachedIsLinked, setCachedIsLinked] = useState(() => localStorage.getItem(LOCAL_STORAGE_KEYS.isLinked) === 'true');
  const [cachedHasCreds, setCachedHasCreds] = useState(() => localStorage.getItem(LOCAL_STORAGE_KEYS.hasCreds) === 'true');

  // Fetch status if user might have credentials
  const shouldFetchStatus = cachedIsLinked || cachedHasCreds;

  // Fetch current status
  const {
    data: status,
    isLoading: statusLoading,
    refetch: refetchStatus,
    isError: statusError,
    error: statusErr
  } = useQuery({
    queryKey: ['octopus-status'],
    queryFn: async (): Promise<OctopusStatus> => {
      // Check if we can get a session
      const session = await ensureAuthSession();

      if (!session) {
        // No session - nothing is stored server-side for this device yet
        return {
          is_linked: false,
          has_credentials: false,
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
            has_credentials: false,
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

  const {
    data: footprint,
    isLoading: footprintLoading,
    refetch: refetchFootprint,
    isError: footprintError,
    error: footprintErr
  } = useQuery({
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

  const {
    data: greennessForecast,
    isLoading: forecastLoading,
    isError: forecastError,
    error: forecastErr
  } = useQuery({
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

  // Fetch available footprint dates for date picker
  const {
    data: availableDates,
    isLoading: availableDatesLoading
  } = useQuery({
    queryKey: ['octopus-available-dates'],
    queryFn: async (): Promise<{ minDate: string | null; maxDate: string | null }> => {
      const { data, error } = await supabase.functions.invoke('octopus-energy', {
        body: { action: 'get-available-dates' }
      });
      if (error) {
        logger.warn('Available dates fetch failed', { error: error.message });
        return { minDate: null, maxDate: null };
      }
      return data;
    },
    enabled: status?.is_linked ?? cachedIsLinked,
    staleTime: 1000 * 60 * 10, // 10 minutes - dates don't change frequently
    gcTime: 1000 * 60 * 30, // 30 minutes cache
    retry: 1,
  });


  // Remove API keys cached by older app versions (uploading them once if they
  // never reached the server), and listen for auth changes.
  useEffect(() => {
    migrateLegacyCredentialsOnce().then((uploaded) => {
      if (uploaded) {
        localStorage.setItem(LOCAL_STORAGE_KEYS.hasCreds, 'true');
        setCachedHasCreds(true);
        queryClient.invalidateQueries({ queryKey: ['octopus-status'] });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        // Re-enable status query so we discover existing server-side data
        setCachedHasCreds(true);
        queryClient.invalidateQueries({ queryKey: ['octopus-status'] });
      }
      if (event === 'SIGNED_OUT') {
        // Clear all cached octopus state so signed-out view is clean
        Object.values(LOCAL_STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
        setCachedIsLinked(false);
        setCachedHasCreds(false);
        queryClient.removeQueries({ queryKey: ['octopus-status'] });
        queryClient.removeQueries({ queryKey: ['octopus-footprint'] });
        queryClient.removeQueries({ queryKey: ['greenness-forecast'] });
        queryClient.removeQueries({ queryKey: ['intelligent-dispatches'] });
      }
    });

    return () => subscription.unsubscribe();
  }, [queryClient]);

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

  // Save Credentials - sent once to the server (stored encrypted there), never
  // persisted on the device. Auto-links meters on success. Throws on failure so
  // the form can keep the user's input (in memory only) for a retry.
  const saveCredentials = useCallback(async (apiKey: string, accountNumber: string) => {
    setIsSyncing(true);
    try {
      const session = await ensureAuthSession();
      if (!session) {
        throw new Error('Could not start a secure session. Check your connection and try again.');
      }

      const { error } = await supabase.functions.invoke('octopus-energy', {
        body: { action: 'save-credentials', apiKey, accountNumber }
      });

      if (error) {
        throw error;
      }

      localStorage.setItem(LOCAL_STORAGE_KEYS.hasCreds, 'true');
      setCachedHasCreds(true);

      // Auto-link meters immediately after saving credentials
      const metersLinked = await linkMeterInternal();

      if (metersLinked) {
        toast.success('Account connected and meter(s) linked!');
        localStorage.setItem(LOCAL_STORAGE_KEYS.isLinked, 'true');
        setCachedIsLinked(true);
      } else {
        toast.success('Credentials saved. Could not find meters - check your account.');
      }

      await refetchStatus();
    } catch (error: unknown) {
      logger.warn('Error saving Octopus credentials', { error });
      const message = parseEdgeFunctionError(error, { feature: 'octopus', action: 'save' });
      toast.error(message);
      throw error;
    } finally {
      setIsSyncing(false);
    }
  }, [refetchStatus, linkMeterInternal]);

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
    setIsSyncing(true);
    try {
      // Ensure we have a session
      const session = await ensureAuthSession();

      if (!session) {
        toast.error('Please sign in to sync data');
        return null;
      }

      const { data, error } = await supabase.functions.invoke('octopus-energy', {
        body: { action: 'full-sync', days: syncDays }
      });

      if (error) throw new Error(error.message || 'Failed to sync data');

      if (data?.success) {
        const readings = data.sync?.readings_synced || 0;
        const calculations = data.calculation?.records_calculated || 0;
        toast.success(`Synced ${readings} readings and calculated ${calculations} footprint records`);
        await refetchStatus();
        await refetchFootprint();
      }

      return data;
    } catch (error: unknown) {
      const message = parseEdgeFunctionError(error, { feature: 'octopus', action: 'sync' });
      toast.error(message);
      throw error;
    } finally {
      setIsSyncing(false);
    }
  }, [refetchStatus, refetchFootprint]);

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
      setCachedIsLinked(false);
      setCachedHasCreds(false);

      await refetchStatus();
    } catch (error: unknown) {
      const message = parseEdgeFunctionError(error, { feature: 'octopus', action: 'disconnect' });
      toast.error(message);
      throw error;
    } finally {
      setIsSyncing(false);
    }
  }, [refetchStatus, queryClient, days]);

  return {
    status,
    footprint,
    greennessForecast,
    intelligentDispatches,
    availableDates,
    isLoading: statusLoading || footprintLoading || forecastLoading,
    statusLoading,
    isLoadingDispatches: dispatchesLoading,
    isLoadingAvailableDates: availableDatesLoading,
    isSyncing,
    // Prefer live status; fall back to cache so Footprint doesn't flash the unlinked CTA mid-load.
    isLinked: status?.is_linked ?? cachedIsLinked,
    hasCredentials: status?.has_credentials ?? cachedHasCreds,
    apiKeyHint: status?.api_key_hint ?? null,
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
    isError: statusError || footprintError || forecastError,
    error: statusErr || footprintErr || forecastErr,
  };
}
