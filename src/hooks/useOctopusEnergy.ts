import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  const [isSyncing, setIsSyncing] = useState(false);

  // Fetch current status
  const { data: status, isLoading: statusLoading, refetch: refetchStatus } = useQuery({
    queryKey: ['octopus-status'],
    queryFn: async (): Promise<OctopusStatus> => {
      const { data, error } = await supabase.functions.invoke('octopus-energy', {
        body: { action: 'get-status' }
      });

      if (error) throw new Error(error.message || 'Failed to fetch status');
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes - keep in cache
  });

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
    enabled: status?.is_linked ?? false,
    staleTime: 10 * 60 * 1000, // 10 minutes - data stays fresh longer
    gcTime: 30 * 60 * 1000, // 30 minutes - keep in cache even when unmounted
  });

  // Fetch Greener Nights Forecast (always active if linked)
  const { data: greennessForecast, isLoading: forecastLoading } = useQuery({
    queryKey: ['greenness-forecast'],
    queryFn: async (): Promise<GreennessForecastItem[]> => {
      const { data, error } = await supabase.functions.invoke('octopus-energy', {
        body: { action: 'get-greenness-forecast' }
      });
      if (error) throw new Error(error.message);
      return data.forecast;
    },
    enabled: status?.is_linked ?? false, // Only fetch if linked
    staleTime: 1000 * 60 * 60 * 4, // 4 hours
  });

  // Save Credentials
  const saveCredentials = useCallback(async (apiKey: string, accountNumber: string) => {
    setIsSyncing(true);
    try {
      const { error } = await supabase.functions.invoke('octopus-energy', {
        body: { action: 'save-credentials', apiKey, accountNumber }
      });

      if (error) throw new Error(error.message || 'Failed to save credentials');

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

      // Invalidate queries to clear data from UI immediately
      queryClient.setQueryData(['octopus-status'], null);
      queryClient.setQueryData(['octopus-footprint', days], null);

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
    refetchStatus,
    refetchFootprint,
  };
}
