import { useState, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

export interface OctopusMeter {
  id: string;
  mpan: string;
  serial_number: string;
  is_active: boolean;
  last_sync_at: string | null;
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
}

export interface FootprintData {
  records: FootprintRecord[];
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

export function useOctopusEnergy(days: number = 30) {
  const queryClient = useQueryClient();

  // All useState hooks must be declared first in the same order every render
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [cachedIsLinked] = useState(() => localStorage.getItem('octopus-is-linked') === 'true');
  const [cachedHasCreds] = useState(() => localStorage.getItem('octopus-has-creds') === 'true');
  // New: Cached actual credentials for re-linking
  const [cachedCredentials, setCachedCredentials] = useState<{ apiKey: string; accountNumber: string } | null>(() => {
    const cached = localStorage.getItem('octopus-cached-real-creds');
    return cached ? JSON.parse(cached) : null;
  });

  // Check for authenticated session on mount and listen for changes
  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(!!session);
      if (!session) {
        // No session - clear any stale cached state
        localStorage.removeItem('octopus-is-linked');
        localStorage.removeItem('octopus-has-creds');
      }
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasSession(!!session);
      if (!session) {
        localStorage.removeItem('octopus-is-linked');
        localStorage.removeItem('octopus-has-creds');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Only fetch if we have a session AND user might have credentials
  const shouldFetchStatus = hasSession && (cachedIsLinked || cachedHasCreds);

  // Fetch current status
  const { data: status, isLoading: statusLoading, refetch: refetchStatus } = useQuery({
    queryKey: ['octopus-status'],
    queryFn: async (): Promise<OctopusStatus> => {
      // Double-check session before calling
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
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
        // If 401, user is not authenticated - clear cached state
        if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
          localStorage.removeItem('octopus-is-linked');
          localStorage.removeItem('octopus-has-creds');
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

  // Sync status to local storage for future optimistic loading
  useEffect(() => {
    if (status) {
      if (status.is_linked) {
        localStorage.setItem('octopus-is-linked', 'true');
      } else {
        localStorage.removeItem('octopus-is-linked');
      }

      if (status.has_credentials) {
        localStorage.setItem('octopus-has-creds', 'true');
      } else {
        localStorage.removeItem('octopus-has-creds');
      }
    }
  }, [status]);

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

  // Save Credentials (and cache them)
  const saveCredentials = useCallback(async (apiKey: string, accountNumber: string) => {
    setIsSyncing(true);
    try {
      const { error } = await supabase.functions.invoke('octopus-energy', {
        body: { action: 'save-credentials', apiKey, accountNumber }
      });

      if (error) throw new Error(error.message || 'Failed to save credentials');

      // Cache credentials locally on success
      const creds = { apiKey, accountNumber };
      localStorage.setItem('octopus-cached-real-creds', JSON.stringify(creds));
      setCachedCredentials(creds);

      toast.success('Credentials saved successfully');
      await refetchStatus();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to save credentials';
      toast.error(message);
      throw error;
    } finally {
      setIsSyncing(false);
    }
  }, [refetchStatus]);

  const clearCachedCredentials = useCallback(() => {
    localStorage.removeItem('octopus-cached-real-creds');
    setCachedCredentials(null);
    toast.info('Removed saved credentials from device');
  }, []);

  // Link meter (fetch from Octopus API)
  const linkMeter = useCallback(async () => {
    setIsSyncing(true);
    try {
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
      const message = error instanceof Error ? error.message : 'Failed to link meter';
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
      const { data, error } = await supabase.functions.invoke('octopus-energy', {
        body: { action: 'sync-consumption', days: syncDays }
      });

      if (error) throw new Error(error.message || 'Failed to sync consumption');

      toast.success(`Synced ${data.readings_synced} consumption readings`);
      await refetchStatus();
      return data;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to sync consumption';
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
      const { data, error } = await supabase.functions.invoke('octopus-energy', {
        body: { action: 'calculate-footprint' }
      });

      if (error) throw new Error(error.message || 'Failed to calculate footprint');

      toast.success(`Calculated carbon footprint for ${data.records_calculated} periods`);
      await refetchFootprint();
      return data;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to calculate footprint';
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
      const { error } = await supabase.functions.invoke('octopus-energy', {
        body: { action: 'disconnect-account' }
      });

      if (error) throw new Error(error.message || 'Failed to disconnect account');

      toast.success('Disconnected Octopus Energy account');

      // Invalidate queries and clear local storage
      queryClient.setQueryData(['octopus-status'], null);
      queryClient.setQueryData(['octopus-footprint', days], null);
      localStorage.removeItem('octopus-is-linked');
      localStorage.removeItem('octopus-has-creds');

      await refetchStatus();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to disconnect account';
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
    isLoading: statusLoading || footprintLoading || forecastLoading,
    isSyncing,
    isLinked: status?.is_linked ?? false,
    hasCredentials: status?.has_credentials ?? false,
    saveCredentials,
    linkMeter,
    syncConsumption,
    calculateFootprint,
    fullSync,
    disconnect,
    migrateData,
    refetchStatus,
    refetchFootprint,
    // New exports
    cachedCredentials,
    clearCachedCredentials,
  };
}
