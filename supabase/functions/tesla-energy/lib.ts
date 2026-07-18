import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const TESLA_API_URL = 'https://fleet-api.prd.na.vn.cloud.tesla.com';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnySupabaseClient = SupabaseClient<any, any, any>;

export async function syncTeslaProducts(
  serviceClient: AnySupabaseClient,
  userId: string,
  accessToken: string
) {
  try {
    // Fetch vehicles
    const vehiclesResponse = await fetch(`${TESLA_API_URL}/api/1/vehicles`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (vehiclesResponse.ok) {
      const vehiclesData = await vehiclesResponse.json();
      const vehicles = vehiclesData.response || [];

      if (vehicles.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const vehiclesToUpsert = vehicles.map((vehicle: any) => ({
          user_id: userId,
          vehicle_id: String(vehicle.id),
          vin: vehicle.vin,
          display_name: vehicle.display_name,
          // Battery capacity will be fetched when we get vehicle data
        }));

        await serviceClient.from('tesla_vehicles').upsert(vehiclesToUpsert, { onConflict: 'user_id,vehicle_id' });
      }

      console.log(`Synced ${vehicles.length} vehicles for user: ${userId}`);
    }

    // Fetch energy sites
    const sitesResponse = await fetch(`${TESLA_API_URL}/api/1/products`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (sitesResponse.ok) {
      const sitesData = await sitesResponse.json();
      const products = sitesData.response || [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sitesToUpsert = (products as any[])
        .filter((product) => product.energy_site_id)
        .map((product) => ({
          user_id: userId,
          site_id: String(product.energy_site_id),
          site_name: product.site_name || 'Energy Site',
          solar_capacity_kw: product.solar_power || null,
          battery_capacity_kwh: product.backup_reserve_percent ?
            (product.total_pack_energy || null) : null,
        }));

      if (sitesToUpsert.length > 0) {
        await serviceClient.from('tesla_energy_sites').upsert(sitesToUpsert, { onConflict: 'user_id,site_id' });
      }

      console.log(`Synced energy sites for user: ${userId}`);
    }
  } catch (error) {
    console.error('Error syncing Tesla products:', error);
  }
}
