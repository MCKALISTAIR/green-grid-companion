import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Car,
  Battery,
  Sun,
  RefreshCw,
  ExternalLink,
  Check,
  AlertCircle,
  Zap,
  Leaf,
} from 'lucide-react';
import { useTeslaEnergy, TeslaVehicleState } from '@/hooks/useTeslaEnergy';
import { TurbineSpinner } from '@/components/ui/turbine-spinner';

const TeslaLogo = ({ className }: { className?: string }) => (
  <img src="/tesla_logo.png" alt="Tesla Logo" className={`${className} object-contain`} />
);

export function TeslaIntegration() {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    status,
    isConfigured,
    isLinked,
    vehicles,
    energySites,
    isStatusLoading,
    startLinking,
    isLinking,
    exchangeCode,
    syncProducts,
    unlink,
    fetchVehicleState,
    chargingStats,
  } = useTeslaEnergy();

  const [vehicleStates, setVehicleStates] = useState<Record<string, TeslaVehicleState>>({});
  const [loadingVehicle, setLoadingVehicle] = useState<string | null>(null);

  // Handle OAuth callback
  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const isTeslaCallback = searchParams.get('tesla_callback');

    if (code && state && isTeslaCallback) {
      // Clear URL params
      searchParams.delete('code');
      searchParams.delete('state');
      searchParams.delete('tesla_callback');
      setSearchParams(searchParams, { replace: true });

      // Exchange code
      exchangeCode.mutate({ code, state });
    }
  }, [searchParams, setSearchParams, exchangeCode]);

  const handleFetchVehicleState = async (vehicleId: string) => {
    setLoadingVehicle(vehicleId);
    try {
      const state = await fetchVehicleState(vehicleId);
      setVehicleStates((prev) => ({ ...prev, [vehicleId]: state }));
    } finally {
      setLoadingVehicle(null);
    }
  };

  if (isStatusLoading) {
    return (
      <Card className="p-4 border-red-500/20 bg-red-500/5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <TurbineSpinner className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h3 className="font-medium text-foreground">Tesla</h3>
            <p className="text-xs text-muted-foreground">Loading...</p>
          </div>
        </div>
      </Card>
    );
  }

  // Not configured state
  if (!isConfigured) {
    return (
      <Card className="p-4 flex items-center justify-between border-red-500/20 bg-red-500/5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <TeslaLogo className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-foreground">Tesla</h3>
              <Badge variant="outline" className="text-xs">
                Setup Required
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground max-w-[200px]">
              Tesla API credentials need to be configured.
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" disabled>
          Coming Soon
        </Button>
      </Card>
    );
  }

  // Linked state - show products
  if (isLinked) {
    return (
      <div className="space-y-4">
        {/* Header */}
        <Card className="p-4 border-red-500/20 bg-red-500/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <TeslaLogo className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-foreground">Tesla</h3>
                  <Badge className="bg-green-500/20 text-green-700 dark:text-green-400 text-xs">
                    <Check className="w-3 h-3 mr-1" />
                    Connected
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''}, {energySites.length}{' '}
                  energy site{energySites.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => syncProducts.mutate()}
                disabled={syncProducts.isPending}
              >
                {syncProducts.isPending ? (
                  <TurbineSpinner className="w-4 h-4" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => unlink.mutate()}
                disabled={unlink.isPending}
                className="text-destructive hover:text-destructive"
              >
                Disconnect
              </Button>
            </div>
          </div>
        </Card>

        {/* Vehicles */}
        {vehicles.map((vehicle) => {
          const state = vehicleStates[vehicle.vehicle_id];
          const isLoading = loadingVehicle === vehicle.vehicle_id;

          return (
            <Card key={vehicle.id} className="p-4 border-border/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Car className="w-8 h-8 text-muted-foreground" />
                  <div>
                    <h4 className="font-medium text-sm">
                      {vehicle.display_name || 'Tesla Vehicle'}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      {vehicle.vin ? `VIN: ...${vehicle.vin.slice(-6)}` : 'No VIN'}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleFetchVehicleState(vehicle.vehicle_id)}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <TurbineSpinner className="w-4 h-4" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                </Button>
              </div>

              {state && (
                <div className="mt-3 pt-3 border-t border-border/50">
                  {state.status === 'asleep' ? (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Vehicle is sleeping - wake to get live data
                    </p>
                  ) : state.status === 'error' ? (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {state.error}
                    </p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div aria-label={`Current Battery: ${state.batteryLevel}%`}>
                        <div className="flex items-center justify-center gap-1 text-lg font-semibold">
                          <Battery className="w-4 h-4" aria-hidden="true" />
                          {state.batteryLevel}%
                        </div>
                        <p className="text-xs text-muted-foreground">Current</p>
                      </div>
                      <div aria-label={`Charge Limit: ${state.chargeLimit}%`}>
                        <div className="text-lg font-semibold">{state.chargeLimit}%</div>
                        <p className="text-xs text-muted-foreground">Limit</p>
                      </div>
                      <div
                        aria-label={`Charging Status: ${state.chargingState === 'Charging' ? `Charging at ${state.chargeRate} miles per hour` : state.chargingState || 'Idle'}`}
                      >
                        <div className="text-lg font-semibold flex items-center justify-center gap-1">
                          {state.chargingState === 'Charging' ? (
                            <>
                              <Zap className="w-4 h-4 text-yellow-500" aria-hidden="true" />
                              {state.chargeRate}mi/h
                            </>
                          ) : (
                            state.chargingState || 'Idle'
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">Status</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}

        {/* Energy Sites */}
        {energySites.map((site) => (
          <Card key={site.id} className="p-4 border-border/50">
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                <Sun className="w-6 h-6 text-yellow-500" />
                <Battery className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <h4 className="font-medium text-sm">{site.site_name || 'Energy Site'}</h4>
                <p className="text-xs text-muted-foreground">
                  {site.solar_capacity_kw && `${site.solar_capacity_kw}kW Solar`}
                  {site.solar_capacity_kw && site.battery_capacity_kwh && ' • '}
                  {site.battery_capacity_kwh && `${site.battery_capacity_kwh}kWh Battery`}
                </p>
              </div>
            </div>
          </Card>
        ))}

        {/* Carbon Savings Summary */}
        {chargingStats && chargingStats.stats.sessionCount > 0 && (
          <Card className="p-4 border-green-500/20 bg-green-500/5">
            <div className="flex items-center gap-3 mb-3">
              <Leaf className="w-5 h-5 text-green-600" />
              <h4 className="font-medium text-sm">Carbon Impact</h4>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-lg font-semibold text-green-600">
                  {(chargingStats.stats.totalCarbonSaved / 1000).toFixed(1)}kg
                </div>
                <p className="text-xs text-muted-foreground">CO₂ Saved</p>
              </div>
              <div>
                <div className="text-lg font-semibold">
                  {chargingStats.stats.totalEnergy.toFixed(1)}kWh
                </div>
                <p className="text-xs text-muted-foreground">Total Charged</p>
              </div>
              <div>
                <div className="text-lg font-semibold">{chargingStats.stats.sessionCount}</div>
                <p className="text-xs text-muted-foreground">Sessions</p>
              </div>
            </div>
          </Card>
        )}
      </div>
    );
  }

  // Not linked state
  return (
    <Card className="p-4 flex items-center justify-between border-red-500/20 bg-red-500/5">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
          <TeslaLogo className="w-6 h-6" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-foreground">Tesla</h3>
          </div>
          <p className="text-xs text-muted-foreground max-w-[200px]">
            Connect to track EV charging carbon and optimize charging times.
          </p>
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={startLinking}
        disabled={isLinking || exchangeCode.isPending}
      >
        {isLinking || exchangeCode.isPending ? (
          <>
            <TurbineSpinner className="w-4 h-4 mr-2" />
            Connecting...
          </>
        ) : (
          <>
            <ExternalLink className="w-4 h-4 mr-2" />
            Connect
          </>
        )}
      </Button>
    </Card>
  );
}
