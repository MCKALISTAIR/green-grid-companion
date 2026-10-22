// Which push providers have their secrets set. Kept separate from push.ts so
// push-subscriptions can report it without loading the sender.

export type PushDelivery = 'configured' | 'not_configured';

type Env = (name: string) => string | undefined;
const denoEnv: Env = (name) => Deno.env.get(name);

export function apnsConfigured(env: Env = denoEnv): boolean {
  return !!(env('APNS_PRIVATE_KEY') && env('APNS_KEY_ID') && env('APNS_TEAM_ID'));
}

export function fcmConfigured(env: Env = denoEnv): boolean {
  return !!(env('FCM_PROJECT_ID') && env('FCM_CLIENT_EMAIL') && env('FCM_PRIVATE_KEY'));
}

/**
 * Whether the server can really deliver to this platform. iOS tokens from the
 * app are APNs tokens, so iOS needs the APNs secrets; everything else goes
 * through FCM.
 */
export function pushDeliveryFor(platform: string | undefined, env: Env = denoEnv): PushDelivery {
  const p = (platform || 'ios').toLowerCase();
  const ok = p === 'ios' ? apnsConfigured(env) : fcmConfigured(env);
  return ok ? 'configured' : 'not_configured';
}
