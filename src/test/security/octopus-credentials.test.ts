import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  isSchemaNotReadyError,
  createKeyLoader,
  selectCredentialRows,
  storeCredentials,
  resolveApiKey,
  backfillLegacyCredentials,
} from '../../../supabase/functions/_shared/octopus-credentials.ts';
import { decryptCredential, importCredentialKey } from '../../../supabase/functions/_shared/credential-crypto.ts';
import { createFakeCredentialsDb } from './fake-credentials-db';

const SECRET = 'Zq8v1LmN4pR7sT0wX3yA6bC9dE2fG5hJ8kM1nP4qS7uV0'; // passphrase-style (phone password manager)
const USER = '11111111-1111-1111-1111-111111111111';
const KEY = 'sk_live_abcdefghijklmnopqrstuvwxyz1234';
const getKey = createKeyLoader(() => SECRET);
const noKey = createKeyLoader(() => undefined);

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('isSchemaNotReadyError', () => {
  it('recognises missing column/table/function errors', () => {
    for (const code of ['42703', '42P01', '42883', 'PGRST202', 'PGRST204', 'PGRST205']) {
      expect(isSchemaNotReadyError({ code })).toBe(true);
    }
    expect(isSchemaNotReadyError({ message: "Could not find the 'api_key_hint' column of 'octopus_credentials' in the schema cache" })).toBe(true);
    expect(isSchemaNotReadyError({ code: '23505', message: 'duplicate key' })).toBe(false);
    expect(isSchemaNotReadyError(null)).toBe(false);
  });
});

describe('before the migration is applied (functions deployed first)', () => {
  it('reads credentials via the legacy columns', async () => {
    const { db } = createFakeCredentialsDb({ schemaReady: false, rows: [{ user_id: USER, api_key: KEY, account_number: 'A-1' }] });
    const { rows, error } = await selectCredentialRows(db, { userId: USER });
    expect(error).toBeNull();
    expect(rows[0]).toMatchObject({ user_id: USER, api_key: KEY });
  });

  it('resolves the legacy key without throwing even though in-place encryption fails', async () => {
    const { db } = createFakeCredentialsDb({ schemaReady: false, rows: [{ user_id: USER, api_key: KEY, account_number: 'A-1' }] });
    const { rows } = await selectCredentialRows(db, { userId: USER });
    expect(await resolveApiKey(db, getKey, rows[0])).toBe(KEY);
  });

  it('saves to the legacy column (old behaviour) so users are not broken', async () => {
    const { db, state } = createFakeCredentialsDb({ schemaReady: false });
    const res = await storeCredentials(db, getKey, { userId: USER, apiKey: KEY, accountNumber: 'A-1' });
    expect(res).toEqual({ ok: true, encrypted: false });
    expect(state.rows[0]).toMatchObject({ user_id: USER, api_key: KEY });
  });

  it('backfill skips quietly', async () => {
    const { db } = createFakeCredentialsDb({ schemaReady: false, rows: [{ user_id: USER, api_key: KEY }] });
    expect(await backfillLegacyCredentials(db, getKey)).toEqual({ status: 'skipped', reason: 'schema-not-ready' });
  });
});

describe('after the migration', () => {
  it('stores only ciphertext + hint', async () => {
    const { db, state } = createFakeCredentialsDb({ schemaReady: true });
    const res = await storeCredentials(db, getKey, { userId: USER, apiKey: KEY, accountNumber: 'A-1' });
    expect(res).toEqual({ ok: true, encrypted: true });
    const row = state.rows[0];
    expect(row.api_key).toBeNull();
    expect(row.api_key_hint).toBe('1234');
    expect(JSON.stringify(row)).not.toContain(KEY);
    expect(await decryptCredential(row.api_key_encrypted as string, await importCredentialKey(SECRET), USER)).toBe(KEY);
  });

  it('refuses to save (503) without OCTOPUS_CREDENTIALS_KEY rather than storing plaintext', async () => {
    const { db, state } = createFakeCredentialsDb({ schemaReady: true });
    const res = await storeCredentials(db, noKey, { userId: USER, apiKey: KEY, accountNumber: 'A-1' });
    expect(res).toMatchObject({ ok: false, status: 503 });
    expect(state.rows).toHaveLength(0);
  });

  it('encrypts a legacy row in place on first use', async () => {
    const { db, state } = createFakeCredentialsDb({ schemaReady: true, rows: [{ user_id: USER, api_key: KEY, account_number: 'A-1' }] });
    const { rows } = await selectCredentialRows(db, { userId: USER });
    expect(await resolveApiKey(db, getKey, rows[0])).toBe(KEY);
    expect(state.rows[0].api_key).toBeNull();
    expect(state.rows[0].api_key_encrypted).toMatch(/^v1\./);
    const again = await selectCredentialRows(db, { userId: USER });
    expect(await resolveApiKey(db, getKey, again.rows[0])).toBe(KEY);
  });

  it('backfill encrypts everything, is idempotent, and reports remaining=0', async () => {
    const rows = Array.from({ length: 5 }, (_, i) => ({ user_id: `0000000${i}-0000-0000-0000-000000000000`, api_key: `${KEY}${i}`, account_number: 'A-1' }));
    const { db, state } = createFakeCredentialsDb({ schemaReady: true, rows });
    expect(await backfillLegacyCredentials(db, getKey, { batchSize: 2 })).toEqual({ status: 'done', encrypted: 5, failed: 0, remaining: 0 });
    expect(state.rows.every((r) => r.api_key === null && typeof r.api_key_encrypted === 'string')).toBe(true);
    expect(await backfillLegacyCredentials(db, getKey)).toEqual({ status: 'done', encrypted: 0, failed: 0, remaining: 0 });
  });

  it('backfill skips without the key (nothing changed)', async () => {
    const { db, state } = createFakeCredentialsDb({ schemaReady: true, rows: [{ user_id: USER, api_key: KEY }] });
    expect(await backfillLegacyCredentials(db, noKey)).toEqual({ status: 'skipped', reason: 'no-key' });
    expect(state.rows[0].api_key).toBe(KEY);
  });
});
