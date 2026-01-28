import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TeslaVehicle {
  id: string;
  vehicle_id: string;
  vin: string | null;
  display_name: string | null;
  battery_capacity_kwh: number | null;
}

export interface TeslaEnergySite {
  id: string;
  site_id: string;
  site_name: string | null;
  solar_capacity_kw: number | null;
  battery_capacity_kwh: number | null;
}

export interface TeslaVehicleState {
  status: 'online' | 'asleep' | 'error';
  batteryLevel?: number;
  batteryRange?: number;
  chargeLimit?: number;
  chargingState?: string;
  chargeRate?: number;
  timeToFullCharge?: number;
  batteryCapacity?: number;
  message?: string;
  error?: string;
}

export interface TeslaChargingStats {
  sessions: Array<{
    id: string;
    vehicle_id: string;
    started_at: string;
    ended_at: string | null;
    energy_added_kwh: number;
    start_battery_pct: number | null;
    end_battery_pct: number | null;
    avg_intensity_gco2: number | null;
    carbon_used_g: number | null;
    carbon_saved_vs_avg_g: number | null;
  }>;
  stats: {
    totalEnergy: number;
    totalCarbonUsed: number;
    totalCarbonSaved: number;
    sessionCount: number;
  };
}

export interface TeslaStatus {
  configured: boolean;
  linked: boolean;
  vehicles: TeslaVehicle[];
  energySites: TeslaEnergySite[];
  lastSync: string | null;
}

async function callTeslaFunction<T>(action: string, data?: Record<string, unknown>): Promise<T> {
  const { data: response, error } = await supabase.functions.invoke('tesla-energy', {
    body: { action, ...data },
  });

  if (error) {
    console.error(`Tesla ${action} error:`, error);
    throw new Error(error.message || 'Tesla API error');
  }

  if (response?.error) {
    throw new Error(response.error);
  }

  return response as T;
}

export function useTeslaEnergy() {
  const queryClient = useQueryClient();
  const [isLinking, setIsLinking] = useState(false);

  // Optimistic loading
  const [cachedIsLinked] = useState(() => localStorage.getItem('tesla-is-linked') === 'true');

  // Fetch Tesla status
  const {
    data: status,
    isLoading: isStatusLoading,
    error: statusError,
    refetch: refetchStatus,
  } = useQuery({
    queryKey: ['tesla-status'],
    queryFn: () => callTeslaFunction<TeslaStatus>('get-status'),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000,
    retry: 1,
  });

  // Sync status to local storage
  useEffect(() => {
    if (status) {
      if (status.linked) {
        localStorage.setItem('tesla-is-linked', 'true');
      } else {
        localStorage.removeItem('tesla-is-linked');
      }
    }
  }, [status]);

  // Fetch vehicle state
  const fetchVehicleState = useCallback(async (vehicleId: string): Promise<TeslaVehicleState> => {
    return callTeslaFunction<TeslaVehicleState>('get-vehicle-state', { vehicleId });
  }, []);

  // Fetch charging stats
  const {
    data: chargingStats,
    isLoading: isChargingStatsLoading,
  } = useQuery({
    queryKey: ['tesla-charging-stats'],
    queryFn: () => callTeslaFunction<TeslaChargingStats>('get-charging-stats'),
    enabled: status?.linked ?? cachedIsLinked,
    staleTime: 10 * 60 * 1000,
  });

  // Start OAuth flow
  const startLinking = useCallback(async () => {
    setIsLinking(true);
    try {
      const redirectUri = `${window.location.origin}/settings?tesla_callback=true`;

      const { authUrl, state } = await callTeslaFunction<{ authUrl: string; state: string }>(
        'get-auth-url',
        { redirectUri }
      );

      // Store state for CSRF validation
      sessionStorage.setItem('tesla_oauth_state', state);

      // Redirect to Tesla auth
      window.location.href = authUrl;
    } catch (error) {
      console.error('Failed to start Tesla linking:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to start Tesla connection');
      setIsLinking(false);
    }
  }, []);

  // Exchange code for tokens
  const exchangeCode = useMutation({
    mutationFn: async ({ code, state }: { code: string; state: string }) => {
      // Validate state
      const storedState = sessionStorage.getItem('tesla_oauth_state');
      if (state !== storedState) {
        throw new Error('Invalid state - possible CSRF attack');
      }
      sessionStorage.removeItem('tesla_oauth_state');

      const redirectUri = `${window.location.origin}/settings?tesla_callback=true`;

      return callTeslaFunction<{ success: boolean }>('exchange-code', {
        code,
        redirectUri,
      });
    },
    onSuccess: () => {
      toast.success('Tesla account linked successfully!');
      queryClient.invalidateQueries({ queryKey: ['tesla-status'] });
      setIsLinking(false);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to link Tesla account');
      setIsLinking(false);
    },
  });

  // Sync products
  const syncProducts = useMutation({
    mutationFn: () => callTeslaFunction<{ success: boolean }>('sync-products'),
    onSuccess: () => {
      toast.success('Tesla products synced');
      queryClient.invalidateQueries({ queryKey: ['tesla-status'] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to sync Tesla products');
    },
  });

  // Unlink Tesla
  const unlink = useMutation({
    mutationFn: () => callTeslaFunction<{ success: boolean }>('unlink'),
    onSuccess: () => {
      toast.success('Tesla account disconnected');
      queryClient.invalidateQueries({ queryKey: ['tesla-status'] });
      queryClient.invalidateQueries({ queryKey: ['tesla-charging-stats'] });
      localStorage.removeItem('tesla-is-linked');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to unlink Tesla account');
    },
  });

  return {
    // Status
    status,
    isConfigured: status?.configured ?? false,
    isLinked: status?.linked ?? false,
    vehicles: status?.vehicles ?? [],
    energySites: status?.energySites ?? [],
    isStatusLoading,
    statusError,
    refetchStatus,

    // Vehicle
    fetchVehicleState,

    // Charging stats
    chargingStats,
    isChargingStatsLoading,

    // Actions
    startLinking,
    isLinking,
    exchangeCode,
    syncProducts,
    unlink,
  };
}
