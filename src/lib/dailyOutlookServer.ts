/**
 * BH-73: the Daily Energy Outlook is sent by the server (`daily-forecast`
 * edge function, Europe/London wall time) once this device has a confirmed
 * push subscription. Until then the phone-scheduled notification stays as a
 * fallback. Never both: the phone one is skipped or cancelled as soon as a
 * confirmation for the current switch and time exists.
 */
import { appStorage } from '@/lib/appStorage';

export const SERVER_OUTLOOK_KEY = 'gridsense-daily-outlook-server';

export interface ServerOutlookConfirmation {
  deviceToken: string;
  /** HH:MM the server confirmed. */
  time: string;
  /** Outward code (or GB) the server stored. */
  postcode: string;
  confirmedAt: string;
}

export type ServerOutlookStatus =
  | 'confirmed'
  | 'disabled'
  | 'no-token'
  | 'no-postcode'
  /** Subscription saved, but the server has no APNs/FCM secrets, so it can't deliver yet. */
  | 'not-configured'
  | 'failed';

export interface SyncResult {
  status: ServerOutlookStatus;
  confirmation: ServerOutlookConfirmation | null;
}

export interface SyncOptions {
  enabled: boolean;
  /** HH:MM, as set in Settings. */
  time: string;
  postcode: string | null;
  /** Resolves the native push token, or null if there isn't one. */
  getToken: () => Promise<string | null>;
  platform: string;
  isSandbox: boolean;
  baseUrl: string;
  apiKey: string;
  accessToken?: string | null;
  /** Preferred: resolves a token, creating a session if needed (BH-149). */
  getAccessToken?: () => Promise<string | null>;
  fetchImpl?: (url: string, init?: RequestInit) => Promise<Response>;
  now?: () => Date;
}

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export function readServerOutlook(): ServerOutlookConfirmation | null {
  const raw = appStorage.getItem(SERVER_OUTLOOK_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ServerOutlookConfirmation>;
    if (!parsed.deviceToken || !parsed.time || !HHMM.test(parsed.time)) return null;
    return parsed as ServerOutlookConfirmation;
  } catch {
    return null;
  }
}

function writeServerOutlook(c: ServerOutlookConfirmation | null) {
  if (c) appStorage.setItem(SERVER_OUTLOOK_KEY, JSON.stringify(c));
  else appStorage.removeItem(SERVER_OUTLOOK_KEY);
}

/**
 * True when the server will send the outlook for the current settings, so the
 * phone must not schedule its own.
 */
export function isServerOutlookActive(
  confirmation: ServerOutlookConfirmation | null,
  prefs: { dailyForecastEnabled: boolean; dailyForecastTime: string },
): boolean {
  return (
    prefs.dailyForecastEnabled &&
    !!confirmation &&
    !!confirmation.deviceToken &&
    confirmation.time === prefs.dailyForecastTime
  );
}

async function upsert(
  opts: SyncOptions,
  token: string,
  postcode: string,
  enabled: boolean,
): Promise<{ data: Record<string, unknown> | null; pushDelivery: unknown } | null> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    apikey: opts.apiKey,
  };
  // BH-149: push-subscriptions refuses calls without a session, so never
  // send one without a token. getAccessToken makes sure a session exists.
  let accessToken: string | null = null;
  try {
    accessToken = opts.getAccessToken ? await opts.getAccessToken() : (opts.accessToken ?? null);
  } catch {
    accessToken = null;
  }
  if (!accessToken) return null;
  headers.Authorization = `Bearer ${accessToken}`;
  const res = await (opts.fetchImpl ?? fetch)(
    `${opts.baseUrl}/functions/v1/push-subscriptions?action=upsert`,
    {
      method: 'POST',
      headers,
      // The server resets omitted fields to off. Low/high alerts stay
      // phone-scheduled for now, so they are sent as off on purpose: the
      // server must not double them.
      body: JSON.stringify({
        device_token: token,
        postcode,
        platform: opts.platform,
        is_sandbox: opts.isSandbox,
        daily_forecast_enabled: enabled,
        daily_forecast_time: opts.time,
        attestation_token: null,
      }),
    },
  );
  if (!res.ok) return null;
  const json = (await res.json().catch(() => null)) as {
    data?: Record<string, unknown>;
    push_delivery?: unknown;
  } | null;
  return { data: json?.data ?? null, pushDelivery: json?.push_delivery };
}

/**
 * Create, update or switch off this device's server daily-outlook
 * subscription. Only a 200 that echoes back this token, enabled and the same
 * time, and says the server can deliver (`push_delivery: 'configured'`), counts
 * as confirmed; anything else clears the confirmation so the phone fallback
 * runs. A server without APNs/FCM secrets answers 'not_configured', and an
 * older server sends no push_delivery at all: both keep the phone push.
 */
export async function syncDailyOutlookSubscription(opts: SyncOptions): Promise<SyncResult> {
  const previous = readServerOutlook();
  const postcode = opts.postcode?.trim() || null;

  if (!opts.enabled) {
    writeServerOutlook(null);
    if (previous && postcode) {
      try {
        await upsert(opts, previous.deviceToken, postcode, false);
      } catch {
        // Best effort: the phone fallback is already off too.
      }
    }
    return { status: 'disabled', confirmation: null };
  }

  if (!postcode) {
    writeServerOutlook(null);
    return { status: 'no-postcode', confirmation: null };
  }
  if (!HHMM.test(opts.time)) {
    writeServerOutlook(null);
    return { status: 'failed', confirmation: null };
  }

  let token: string | null = null;
  try {
    token = await opts.getToken();
  } catch {
    token = null;
  }
  if (!token) {
    writeServerOutlook(null);
    return { status: 'no-token', confirmation: null };
  }

  let data: Record<string, unknown> | null = null;
  let pushDelivery: unknown;
  try {
    const res = await upsert(opts, token, postcode, true);
    data = res?.data ?? null;
    pushDelivery = res?.pushDelivery;
  } catch {
    data = null;
  }
  const echoedTime = typeof data?.daily_forecast_time === 'string' ? data.daily_forecast_time : '';
  const ok =
    !!data &&
    data.device_token === token &&
    data.daily_forecast_enabled === true &&
    echoedTime.slice(0, 5) === opts.time;
  if (!ok) {
    writeServerOutlook(null);
    return { status: 'failed', confirmation: null };
  }
  if (pushDelivery !== 'configured') {
    writeServerOutlook(null);
    return { status: 'not-configured', confirmation: null };
  }

  const confirmation: ServerOutlookConfirmation = {
    deviceToken: token,
    time: opts.time,
    postcode: typeof data!.postcode === 'string' ? (data!.postcode as string) : postcode,
    confirmedAt: (opts.now?.() ?? new Date()).toISOString(),
  };
  writeServerOutlook(confirmation);
  return { status: 'confirmed', confirmation };
}
