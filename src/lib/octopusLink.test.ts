import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  GET_METERS_CODE,
  GET_METERS_PREFIX,
  accountNumberError,
  apiKeyError,
  bannerMessage,
  fieldMessage,
  normaliseAccountNumber,
  parseGetMetersAnswer,
  parseSaveFailure,
  sanitiseApiKey,
} from './octopusLink';
import * as COPY from './voice/octopusLinkCopy';

const KEY = 'sk_live_' + 'a1B2c3D4e5F6g7H8i9J0';

/** The exact get-meters `error` strings from supabase/functions/octopus-energy/index.ts. */
const ERR_404 = 'Account not found. Please check your account number is correct (e.g. A-12345678).';
const ERR_401 = 'Invalid API key. Please check your Octopus Energy API key.';
const errN = (n: number) => `Octopus API error (${n}). Please try again later.`;

describe('normaliseAccountNumber', () => {
  it.each([
    [' a12ab34cd ', 'A-12AB34CD'],
    ['A12AB34CD', 'A-12AB34CD'],
    ['a-12ab34cd', 'A-12AB34CD'],
    ['A-12 AB 34CD', 'A-12AB34CD'],
    ['A-1234', 'A-1234'],
    ['  A-12AB34CD\n', 'A-12AB34CD'],
    ['B12AB34CD', 'B12AB34CD'],
    ['A12AB34CDE', 'A12AB34CDE'],
  ])('%j -> %j', (input, out) => expect(normaliseAccountNumber(input)).toBe(out));
});

describe('sanitiseApiKey', () => {
  it('keeps letters, numbers and underscores only', () => {
    expect(sanitiseApiKey(`  ${KEY} \n`)).toBe(KEY);
    expect(sanitiseApiKey('sk_live_abc-def')).toBe('sk_live_abcdef');
  });
});

describe('field format checks (brief 3.3)', () => {
  it('account number', () => {
    expect(accountNumberError('')).toBe(COPY.OCTOPUS_FIELD_ERRORS.accountEmpty);
    expect(accountNumberError('   ')).toBe(COPY.OCTOPUS_FIELD_ERRORS.accountEmpty);
    expect(accountNumberError('A-1234')).toBe(COPY.OCTOPUS_FIELD_ERRORS.accountFormat);
    expect(accountNumberError('A-12AB34CD9')).toBe(COPY.OCTOPUS_FIELD_ERRORS.accountFormat);
    expect(accountNumberError('A-' + 'X'.repeat(30))).toBe(COPY.OCTOPUS_FIELD_ERRORS.accountFormat);
    expect(accountNumberError('A-12AB34CD')).toBeUndefined();
  });
  it('API key', () => {
    expect(apiKeyError('')).toBe(COPY.OCTOPUS_FIELD_ERRORS.keyEmpty);
    expect(apiKeyError('sk_test_' + 'a'.repeat(24))).toBe(COPY.OCTOPUS_FIELD_ERRORS.keyFormat);
    expect(apiKeyError('sk_live_short')).toBe(COPY.OCTOPUS_FIELD_ERRORS.keyFormat);
    expect(apiKeyError('sk_live_' + 'a'.repeat(100))).toBe(COPY.OCTOPUS_FIELD_ERRORS.keyFormat);
    expect(apiKeyError(KEY)).toBeUndefined();
  });
  it('matches the server checks (index.ts validateCredentials)', () => {
    const src = readFileSync(
      resolve(__dirname, '../../supabase/functions/octopus-energy/index.ts'),
      'utf8',
    );
    expect(src).toContain('const accountPattern = /^A-[A-Z0-9]{8}$/i;');
    expect(src).toContain('const apiKeyPattern = /^sk_live_[a-zA-Z0-9]{20,}$/;');
  });
});

describe('parseGetMetersAnswer (get-meters 200 answers)', () => {
  it('pins the prefixes against the edge function source', () => {
    const src = readFileSync(
      resolve(__dirname, '../../supabase/functions/octopus-energy/index.ts'),
      'utf8',
    );
    expect(src).toContain(`'${ERR_404}'`);
    expect(src).toContain(`'${ERR_401}'`);
    expect(src).toContain('`Octopus API error (${response.status}). Please try again later.`');
    expect(ERR_401.startsWith(GET_METERS_PREFIX.wrongKey)).toBe(true);
    expect(ERR_404.startsWith(GET_METERS_PREFIX.wrongAccount)).toBe(true);
  });

  const cases: [string, unknown, string | undefined, string | undefined, string | undefined][] = [
    ['401', { error: ERR_401, meters: [] }, 'wrong_key', 'apiKey', undefined],
    ['404', { error: ERR_404, meters: [] }, 'wrong_account', 'accountNumber', undefined],
    ['403', { error: errN(403), meters: [] }, 'octopus_refused', undefined, undefined],
    ['400', { error: errN(400), meters: [] }, 'octopus_refused', undefined, undefined],
    ['500', { error: errN(500), meters: [] }, 'octopus_down', undefined, undefined],
    ['503', { error: errN(503), meters: [] }, 'octopus_down', undefined, undefined],
    ['429', { error: errN(429), meters: [] }, 'octopus_down', undefined, undefined],
    ['meters: []', { meters: [] }, 'no_meter', undefined, undefined],
    ['other error', { error: 'Something odd', meters: [] }, 'unknown', undefined, undefined],
    ['null body', null, 'no_meter', undefined, undefined],
  ];
  it.each(cases)('%s', (_name, body, reason, field) => {
    const r = parseGetMetersAnswer(body);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reason);
    expect(r.field).toBe(field);
  });

  it('pins the machine codes against the edge function source (C2-13)', () => {
    const src = readFileSync(
      resolve(__dirname, '../../supabase/functions/octopus-energy/index.ts'),
      'utf8',
    );
    for (const code of Object.values(GET_METERS_CODE)) expect(src).toContain(`'${code}'`);
    expect(src).toContain('octopus_status: response.status');
  });

  // Code path: newer deploys send `code` (and `octopus_status`). The message is
  // deliberately reworded so only the code can drive the result.
  const codeCases: [string, unknown, string, string | undefined][] = [
    [
      'code invalid_api_key',
      { error: 'Reworded.', code: 'invalid_api_key', meters: [] },
      'wrong_key',
      'apiKey',
    ],
    [
      'code account_not_found',
      { error: 'Reworded.', code: 'account_not_found', meters: [] },
      'wrong_account',
      'accountNumber',
    ],
    [
      'code octopus_error 403',
      { error: 'Reworded.', code: 'octopus_error', octopus_status: 403, meters: [] },
      'octopus_refused',
      undefined,
    ],
    [
      'code octopus_error 500',
      { error: 'Reworded.', code: 'octopus_error', octopus_status: 500, meters: [] },
      'octopus_down',
      undefined,
    ],
    [
      'code octopus_error 429',
      { error: 'Reworded.', code: 'octopus_error', octopus_status: 429, meters: [] },
      'octopus_down',
      undefined,
    ],
    [
      'code octopus_error, no status',
      { error: 'Reworded.', code: 'octopus_error', meters: [] },
      'unknown',
      undefined,
    ],
    // Code wins over a conflicting message prefix.
    [
      'code beats prefix',
      { error: ERR_401, code: 'account_not_found', meters: [] },
      'wrong_account',
      'accountNumber',
    ],
    // Unknown code falls back to the message prefix (older or newer server).
    [
      'unknown code -> prefix fallback',
      { error: ERR_401, code: 'something_new', meters: [] },
      'wrong_key',
      'apiKey',
    ],
  ];
  it.each(codeCases)('%s', (_name, body, reason, field) => {
    const r = parseGetMetersAnswer(body);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reason);
    expect(r.field).toBe(field);
  });

  it('server answer shape: code and prefix agree for every status', () => {
    // What index.ts now sends: both the old message and the new code.
    const answers: [unknown, string][] = [
      [{ error: ERR_401, code: 'invalid_api_key', octopus_status: 401, meters: [] }, 'wrong_key'],
      [
        { error: ERR_404, code: 'account_not_found', octopus_status: 404, meters: [] },
        'wrong_account',
      ],
      [
        { error: errN(502), code: 'octopus_error', octopus_status: 502, meters: [] },
        'octopus_down',
      ],
    ];
    for (const [body, reason] of answers) {
      expect(parseGetMetersAnswer(body).reason).toBe(reason);
      const { code: _c, octopus_status: _s, ...old } = body as Record<string, unknown>;
      expect(parseGetMetersAnswer(old).reason).toBe(reason);
    }
  });

  it('meters found', () => {
    const meters = [
      { mpan: '1900001234567', serial_number: 'S1', meter_type: 'import' },
      { mpan: '1900007654321', serial_number: 'S2', meter_type: 'export' },
    ];
    expect(parseGetMetersAnswer({ meters })).toEqual({ ok: true, meters });
  });
});

describe('copy for each case (brief 3.3)', () => {
  const B = COPY.OCTOPUS_BANNER_COPY;
  const F = COPY.OCTOPUS_FIELD_ERRORS;
  it('field errors go on the field, never in the banner', () => {
    const key = parseGetMetersAnswer({ error: ERR_401, meters: [] });
    expect(fieldMessage(key)).toBe(F.wrongKey);
    expect(bannerMessage(key)).toBeUndefined();
    const acc = parseGetMetersAnswer({ error: ERR_404, meters: [] });
    expect(fieldMessage(acc)).toBe(F.wrongAccount);
    expect(bannerMessage(acc)).toBeUndefined();
  });
  it('banner cases', () => {
    expect(bannerMessage(parseGetMetersAnswer({ error: errN(403) }))).toBe(B.refused);
    expect(bannerMessage(parseGetMetersAnswer({ error: errN(500) }))).toBe(B.octopusDown);
    expect(bannerMessage(parseGetMetersAnswer({ error: errN(429) }))).toBe(B.octopusDown);
    expect(bannerMessage(parseGetMetersAnswer({ meters: [] }))).toBe(B.noMeter);
    expect(bannerMessage({ ok: false, reason: 'no_session' })).toBe(B.noSession);
    expect(bannerMessage({ ok: false, reason: 'offline' })).toBe(B.offline);
    expect(bannerMessage({ ok: false, reason: 'unknown' })).toBe(B.unknown);
    expect(bannerMessage({ ok: true, meters: [] })).toBeUndefined();
  });
  it('save-credentials failures', () => {
    expect(bannerMessage(parseSaveFailure(429, { retry_after: 900 }, false))).toBe(
      "That's a lot of tries. Give it 15 minutes, then try again.",
    );
    expect(bannerMessage(parseSaveFailure(429, { retry_after: 61 }, false))).toBe(
      "That's a lot of tries. Give it 2 minutes, then try again.",
    );
    expect(bannerMessage(parseSaveFailure(429, { retry_after: 30 }, false))).toBe(
      B.rateLimitedOneMinute,
    );
    expect(bannerMessage(parseSaveFailure(429, null, false))).toBe(B.rateLimitedUnknown);
    expect(bannerMessage(parseSaveFailure(500, null, false))).toBe(B.saveFailed);
    expect(bannerMessage(parseSaveFailure(503, null, false))).toBe(B.saveFailed);
    expect(bannerMessage(parseSaveFailure(400, null, false))).toBe(B.unknown);
    expect(bannerMessage(parseSaveFailure(undefined, null, true))).toBe(B.offline);
    expect(bannerMessage(parseSaveFailure(undefined, null, false))).toBe(B.unknown);
  });
});

describe('success copy (brief 3.5)', () => {
  const S = COPY.OCTOPUS_SUCCESS_COPY;
  it('meter count and readings', () => {
    expect(S.found(1, 'A-12AB34CD')).toBe('We found 1 electricity meter on A-12AB34CD.');
    expect(S.found(2, 'A-12AB34CD')).toBe('We found 2 electricity meters on A-12AB34CD.');
    expect(S.readingsIn(1440)).toBe("Got 1,440 half-hours of usage. Your footprint's ready.");
  });
  it('no gas UI: the only gas mention is the fixed electricity-only line', () => {
    const all = JSON.stringify(COPY) + S.found(1, 'A') + S.meterRow('123456');
    const gasMentions = all.match(/\bgas\b/gi) ?? [];
    expect(gasMentions).toHaveLength(1);
    expect(S.gasLine).toContain('gas');
  });
});

describe('voice rules', () => {
  it('no em dashes or US spellings in the linking copy', () => {
    const src = readFileSync(resolve(__dirname, 'voice/octopusLinkCopy.ts'), 'utf8');
    expect(src).not.toContain('\u2014');
    expect(src).not.toMatch(/personaliz|color|center\b/i);
  });
  it('states the £50 referral credit only in the referral link (copy pass X21)', () => {
    const src = readFileSync(resolve(__dirname, 'voice/octopusLinkCopy.ts'), 'utf8');
    expect(COPY.OCTOPUS_ENTRY_COPY.referralLink).toBe(
      'Join with our referral link and get £50 credit.',
    );
    expect(src.match(/£/g)).toHaveLength(1);
  });
});

describe('Design review fixes on #194 (23 Oct 2026)', () => {
  it('matches the Sync Now button label', () => {
    expect(COPY.OCTOPUS_SUCCESS_COPY.zeroReadings).toContain('Tap Sync Now later to check again.');
    expect(COPY.OCTOPUS_HELP_COPY.noUsage).toContain('Tap Sync Now later to check again.');
  });
  it('help troubleshooting has no Relink until PR-O2', () => {
    expect(COPY.OCTOPUS_HELP_COPY.troubleshooting).toBe(
      'Octopus not working? Open Settings. If your link has expired, disconnect it, then link it again with a fresh key from Octopus.',
    );
  });
  it('privacy says device, not phone; no session says connection', () => {
    expect(COPY.OCTOPUS_SHEET_COPY.privacy).toContain('never stays on this device.');
    expect(COPY.OCTOPUS_SHEET_COPY.privacy).not.toMatch(/phone/);
    expect(COPY.OCTOPUS_BANNER_COPY.noSession).toBe(
      "We couldn't start a secure connection. Check your connection and try again.",
    );
  });
});
