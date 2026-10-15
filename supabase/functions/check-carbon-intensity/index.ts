import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { sendPushNotifications, type PushDeliveryResult } from '../_shared/push.ts';
import { selectSavableStateUpdates, type PendingStateUpdate } from './state-updates.ts';
import {
  verifySchedulerRequest,
  cronAuthErrorResponse,
  createSchedulerSecretProvider,
  fetchSchedulerSecret,
  type SchedulerSecretRpcClient,
} from '../_shared/cron-auth.ts';
import { createKeyLoader, backfillLegacyCredentials } from '../_shared/octopus-credentials.ts';
import { createAlertReadingResolver, alertPlaceLabel } from '../_shared/alert-reading.ts';

interface PushSubscription {
  id: string;
  device_token: string;
  postcode: string;
  low_intensity_enabled: boolean;
  low_intensity_threshold: number;
  high_intensity_enabled: boolean;
  high_intensity_threshold: number;
  daily_forecast_enabled: boolean;
  daily_forecast_time: string;
  platform: string;
  last_intensity_state: string | null; // 'above' | 'below' | null
  last_high_intensity_state: string | null; // 'above' | 'below' | null
  is_sandbox: boolean;
}

// Scheduler secret lives in the database (see 20261003120000 migration);
// read with the service role and cached per instance.
const getSchedulerSecret = createSchedulerSecretProvider(() =>
  fetchSchedulerSecret(
    createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    ) as unknown as SchedulerSecretRpcClient,
  ),
);

// Used to encrypt any remaining legacy plaintext Octopus API keys (see below).
const getCredentialKey = createKeyLoader(() => Deno.env.get('OCTOPUS_CREDENTIALS_KEY'));

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Scheduler-only endpoint: require the shared cron secret.
  const cronAuth = await verifySchedulerRequest(req, getSchedulerSecret);
  if (!cronAuth.ok) {
    return cronAuthErrorResponse(cronAuth, corsHeaders);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all subscriptions that have low OR high intensity alerts enabled
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .or('low_intensity_enabled.eq.true,high_intensity_enabled.eq.true');

    if (subError) {
      throw subError;
    }

    const notifications: Array<{
      token: string;
      title: string;
      body: string;
      platform: string;
      isSandbox?: boolean;
      key: string;
    }> = [];
    const stateUpdates: PendingStateUpdate[] = [];

    // One NESO read per outward code per run. A failed regional read means no
    // alert (state unchanged), never the national figure framed as regional.
    const getAlertReading = createAlertReadingResolver();
    let skippedNoData = 0;

    // Check each subscription
    for (const sub of subscriptions as PushSubscription[]) {
      // Get region intensity (with caching)
      const regionIntensity = await getAlertReading(sub.postcode);
      if (!regionIntensity) {
        // No trustworthy reading: send nothing and leave alert state unchanged
        // so the next run (every 30 min) re-evaluates with real data.
        skippedNoData++;
        console.warn(`[INTENSITY] No valid reading for subscription ${sub.id}; skipping`);
        continue;
      }

      // === LOW INTENSITY ALERTS ===
      if (sub.low_intensity_enabled) {
        const currentState =
          regionIntensity.intensity <= sub.low_intensity_threshold ? 'below' : 'above';
        const previousState = sub.last_intensity_state;

        if (currentState !== previousState) {
          if (currentState === 'below') {
            notifications.push({
              token: sub.device_token,
              title: `${alertPlaceLabel(regionIntensity)}: ${regionIntensity.intensity} gCO₂/kWh. Grid's looking clean`,
              body: `That's at or under your ${sub.low_intensity_threshold} gCO₂/kWh alert (${regionIntensity.index}). A good time for the big loads.`,
              platform: sub.platform,
              isSandbox: sub.is_sandbox,
              key: `${sub.id}:low`,
            });
          } else if (currentState === 'above' && previousState === 'below') {
            notifications.push({
              token: sub.device_token,
              title: `Clean spell over (${alertPlaceLabel(regionIntensity)}): ${regionIntensity.intensity} gCO₂/kWh`,
              body: `That's back over your ${sub.low_intensity_threshold} gCO₂/kWh alert (${regionIntensity.index}). Big loads can wait for the next clean spell.`,
              platform: sub.platform,
              isSandbox: sub.is_sandbox,
              key: `${sub.id}:low`,
            });
          }
          stateUpdates.push({
            id: sub.id,
            low_state: currentState,
            notifyKey:
              currentState === 'below' || previousState === 'below' ? `${sub.id}:low` : undefined,
          });
        }
      }

      // === HIGH INTENSITY ALERTS ===
      if (sub.high_intensity_enabled) {
        const currentHighState =
          regionIntensity.intensity >= sub.high_intensity_threshold ? 'above' : 'below';
        const previousHighState = sub.last_high_intensity_state;

        if (currentHighState !== previousHighState) {
          if (currentHighState === 'above') {
            notifications.push({
              token: sub.device_token,
              title: `${alertPlaceLabel(regionIntensity)}: ${regionIntensity.intensity} gCO₂/kWh. Grid's gone grumpy`,
              body: `That's at or past your ${sub.high_intensity_threshold} gCO₂/kWh alert (${regionIntensity.index}). If something can wait, let it.`,
              platform: sub.platform,
              isSandbox: sub.is_sandbox,
              key: `${sub.id}:high`,
            });
          } else if (currentHighState === 'below' && previousHighState === 'above') {
            notifications.push({
              token: sub.device_token,
              title: `${alertPlaceLabel(regionIntensity)}: ${regionIntensity.intensity} gCO₂/kWh. Grid's cheering up`,
              body: `That's back under your ${sub.high_intensity_threshold} gCO₂/kWh alert (${regionIntensity.index}).`,
              platform: sub.platform,
              isSandbox: sub.is_sandbox,
              key: `${sub.id}:high`,
            });
          }
          stateUpdates.push({
            id: sub.id,
            high_state: currentHighState,
            notifyKey:
              currentHighState === 'above' || previousHighState === 'above'
                ? `${sub.id}:high`
                : undefined,
          });
        }
      }
    }

    // Deliver first (with retries), then save only the state changes whose
    // alert actually went out, so a failed push is retried on the next run.
    let delivered: PushDeliveryResult[] = [];
    try {
      delivered = await sendPushNotifications(notifications);
    } catch (e) {
      console.error('[PUSH] Error sending push notifications:', e);
    }
    const deliveredKeys = new Set(
      delivered.filter((d) => d.delivered && d.key).map((d) => d.key as string),
    );
    const savable = selectSavableStateUpdates(stateUpdates, deliveredKeys);

    await Promise.all(
      Array.from(savable.entries()).map(([id, updateData]) =>
        supabase.from('push_subscriptions').update(updateData).eq('id', id),
      ),
    );

    console.log(
      `Checked ${subscriptions?.length || 0} subscriptions, ${stateUpdates.length} state changes (${savable.size} saved), ${notifications.length} notifications, ${deliveredKeys.size} delivered, ${skippedNoData} skipped (no valid intensity data)`,
    );

    // Piggyback: encrypt any legacy plaintext Octopus API keys left from before
    // the security migration. Idempotent, a single cheap query once done, and
    // never fails this run (skips quietly if the key/migration isn't there yet).
    let legacyCredentials: unknown = null;
    try {
      legacyCredentials = await backfillLegacyCredentials(supabase, getCredentialKey);
    } catch (e) {
      console.error('[CREDENTIALS] Legacy key backfill failed:', e);
    }

    return new Response(
      JSON.stringify({
        success: true,
        checked: subscriptions?.length || 0,
        stateChanges: stateUpdates.length,
        notifications: notifications.length,
        skipped_no_data: skippedNoData,
        legacy_credentials: legacyCredentials,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
