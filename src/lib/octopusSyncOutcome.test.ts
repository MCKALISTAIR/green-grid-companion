import { describe, it, expect } from 'vitest';
import {
  isCredentialMeterError,
  readFunctionErrorBody,
  syncErrorOutcome,
  syncFailureMessage,
  syncOutcome,
} from './octopusSyncOutcome';
import { OCTOPUS_SYNC_COPY } from './voice/errorStatesCopy';
import {
  credentialsUnavailableResult,
  summarise,
  syncMeter,
} from '../../supabase/functions/_shared/octopus-sync.ts';
import { makeFetch, makeStore } from '../../supabase/functions/_shared/octopus_test_harness.ts';

const FAILED = "Couldn't get your Octopus usage just now. Try again in a bit.";
const EXPIRED = 'Your Octopus link has expired. Sign in again to see your use.';
const meter = { userId: 'u1', mpan: '1300000000000', serial: 'S', authHeader: 'Basic dGVzdDo=' };

/** A real per-meter result from the shared pipeline, with Octopus answering `status`. */
async function meterWithOctopusStatus(status: number) {
  const { fetchFn } = makeFetch({ octopusStatus: status });
  const { store } = makeStore();
  return syncMeter({ fetch: fetchFn, store }, meter);
}

describe('Octopus sync copy (Design call on #180)', () => {
  it('uses Design’s exact lines, the same in Plain and Cheeky', () => {
    for (const tone of ['plain', 'cheeky'] as const) {
      expect(syncFailureMessage('failed', tone)).toBe(FAILED);
      expect(syncFailureMessage('credentials', tone)).toBe(EXPIRED);
    }
    expect(OCTOPUS_SYNC_COPY.failed.plain).toBe(OCTOPUS_SYNC_COPY.failed.cheeky);
    expect(OCTOPUS_SYNC_COPY.credentials.plain).toBe(OCTOPUS_SYNC_COPY.credentials.cheeky);
  });

  it('never promises an automatic retry (nothing retries a failed sync)', () => {
    for (const line of [FAILED, EXPIRED])
      expect(line).not.toMatch(/automatic|we'll retry|retrying/i);
  });
});

describe('syncOutcome: per-meter results from sync-consumption', () => {
  it('Octopus 401 or 403 for the user’s key → link expired', async () => {
    for (const status of [401, 403]) {
      const r = await meterWithOctopusStatus(status);
      expect(r.http_status).toBe(status);
      expect(syncOutcome({ ...summarise([r]), meters: [r] })).toBe('credentials');
    }
  });

  it('missing or unreadable stored key → link expired', () => {
    for (const reason of ['no_credentials', 'credentials_unavailable'] as const) {
      const r = credentialsUnavailableResult(meter.mpan, reason);
      expect(syncOutcome({ ...summarise([r]), meters: [r] })).toBe('credentials');
    }
  });

  it('Octopus 5xx / 429 / 404 → general failure, not credentials', async () => {
    for (const status of [500, 503, 429, 404]) {
      const r = await meterWithOctopusStatus(status);
      expect(syncOutcome({ ...summarise([r]), meters: [r] })).toBe('failed');
    }
  });

  it('DB, NESO and footprint failures → general failure', () => {
    for (const error of ['consumption_upsert: boom', 'last_sync_update: boom', 'network: x']) {
      expect(syncOutcome({ success: false, meters: [{ ok: false, error }] })).toBe('failed');
    }
    // Readings synced but footprints failed: the run is still not a success.
    expect(
      syncOutcome({
        success: false,
        meters: [{ ok: true, http_status: 200, footprint_ok: false }],
      }),
    ).toBe('failed');
  });

  it('credentials win over other failures on another meter', () => {
    expect(
      syncOutcome({
        success: false,
        meters: [
          { ok: false, http_status: 500, error: 'octopus_http_500' },
          { ok: false, http_status: 401, error: 'octopus_http_401' },
        ],
      }),
    ).toBe('credentials');
  });

  it('a 401-ish code on an ok meter is ignored; success → ok', () => {
    expect(isCredentialMeterError({ ok: true, error: 'octopus_http_401' })).toBe(false);
    expect(syncOutcome({ success: true, meters: [{ ok: true, http_status: 200 }] })).toBe('ok');
  });

  it('no body at all → general failure', () => {
    expect(syncOutcome(null)).toBe('failed');
  });
});

describe('syncOutcome: full-sync { sync, calculation }', () => {
  it('reads the sync meters for credentials', () => {
    const r = credentialsUnavailableResult(meter.mpan, 'credentials_unavailable');
    expect(
      syncOutcome({
        success: false,
        sync: { success: false, meters: [r] },
        calculation: { success: true },
      }),
    ).toBe('credentials');
  });

  it('a NESO 401/403 in the calculation step is not an Octopus credentials problem', () => {
    expect(
      syncOutcome({
        success: false,
        sync: { success: true, meters: [{ ok: true, http_status: 200 }] },
        calculation: {
          success: false,
          meters: [{ ok: false, error: 'neso_failed_windows: 1/1' }],
        },
      }),
    ).toBe('failed');
  });

  it('both steps ok → ok', () => {
    expect(
      syncOutcome({ success: true, sync: { success: true }, calculation: { success: true } }),
    ).toBe('ok');
  });
});

describe('syncErrorOutcome: non-2xx responses', () => {
  it('code credentials_unavailable → link expired', () => {
    expect(syncErrorOutcome({ error: 'whatever', code: 'credentials_unavailable' })).toBe(
      'credentials',
    );
  });

  it('older deploys without a code still map by message', () => {
    expect(syncErrorOutcome({ error: 'Octopus Energy credentials not configured' })).toBe(
      'credentials',
    );
    expect(syncErrorOutcome({ error: 'Missing credentials' })).toBe('credentials');
  });

  it('anything else → general failure', () => {
    expect(syncErrorOutcome({ error: 'Unknown error' })).toBe('failed');
    expect(syncErrorOutcome({ error: 'Too many requests' })).toBe('failed');
    expect(syncErrorOutcome(null)).toBe('failed');
    expect(syncErrorOutcome('nope')).toBe('failed');
  });

  it('reads the JSON body from a FunctionsHttpError-like error', async () => {
    const res = new Response(
      JSON.stringify({
        error: 'Octopus Energy credentials not configured',
        code: 'credentials_unavailable',
      }),
      { status: 400 },
    );
    const body = await readFunctionErrorBody({ message: 'non-2xx', context: res });
    expect(syncErrorOutcome(body)).toBe('credentials');
    expect(await readFunctionErrorBody(new Error('plain'))).toBeNull();
    expect(
      await readFunctionErrorBody({ context: new Response('not json', { status: 500 }) }),
    ).toBeNull();
  });
});
