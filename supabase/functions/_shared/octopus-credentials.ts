// Server-side storage of Octopus Energy API keys (encrypted at rest).
//
// Shared by octopus-energy (user actions, scheduler sync) and
// check-carbon-intensity (periodic backfill of legacy plaintext rows).
//
// Everything here tolerates the window where new function code is deployed
// before the security migration has been applied (Lovable may deploy
// functions before the migration is approved): if the new columns don't exist
// yet, reads fall back to the legacy columns and writes fall back to the
// legacy plaintext column - exactly the pre-migration behaviour - and the
// backfill encrypts those rows once the migration lands.
//
// Runtime-agnostic (no Deno / esm.sh imports) so it can be unit tested.

import { importCredentialKey, encryptCredential, decryptCredential, apiKeyHint } from './credential-crypto.ts';

export interface StoredCredentialRow {
  user_id: string;
  account_number?: string;
  api_key?: string | null; // legacy plaintext column; cleared once encrypted
  api_key_encrypted?: string | null;
  api_key_hint?: string | null;
  created_at?: string;
}

// Minimal structural type for the supabase-js client (kept loose on purpose).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Db = any;

export type KeyLoader = () => Promise<CryptoKey>;

const TABLE = 'octopus_credentials';
export const CREDENTIAL_COLUMNS = 'user_id, account_number, api_key, api_key_encrypted, api_key_hint, created_at';
export const LEGACY_CREDENTIAL_COLUMNS = 'user_id, account_number, api_key, created_at';

// Postgres / PostgREST codes meaning "the column/table/function isn't there (yet)".
const SCHEMA_NOT_READY_CODES = new Set(['42703', '42P01', '42883', 'PGRST202', 'PGRST204', 'PGRST205']);

/** True if a Supabase/PostgREST error means the schema (migration) isn't in place yet. */
export function isSchemaNotReadyError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: unknown; message?: unknown };
  if (typeof e.code === 'string' && SCHEMA_NOT_READY_CODES.has(e.code)) return true;
  const msg = typeof e.message === 'string' ? e.message : '';
  return /column .* does not exist|could not find the .* in the schema cache|relation .* does not exist/i.test(msg);
}

/** Lazily import the encryption key from a secret getter; failures are not cached. */
export function createKeyLoader(getSecret: () => string | undefined | null): KeyLoader {
  let promise: Promise<CryptoKey> | null = null;
  return () => {
    if (!promise) {
      promise = importCredentialKey(getSecret());
      promise.catch(() => {
        promise = null;
      });
    }
    return promise;
  };
}

/** Select credential rows, falling back to legacy columns before the migration. */
export async function selectCredentialRows(
  db: Db,
  filter: { userId?: string; userIds?: string[] },
): Promise<{ rows: StoredCredentialRow[]; error: unknown }> {
  const run = (columns: string) => {
    let q = db.from(TABLE).select(columns);
    if (filter.userId) q = q.eq('user_id', filter.userId);
    if (filter.userIds) q = q.in('user_id', filter.userIds);
    return q;
  };
  let { data, error } = await run(CREDENTIAL_COLUMNS);
  if (error && isSchemaNotReadyError(error)) {
    ({ data, error } = await run(LEGACY_CREDENTIAL_COLUMNS));
  }
  return { rows: (data || []) as StoredCredentialRow[], error: error ?? null };
}

/** Encrypt one legacy plaintext row in place. Idempotent and race-safe. */
export async function encryptLegacyRow(db: Db, getKey: KeyLoader, row: StoredCredentialRow): Promise<boolean> {
  if (!row.api_key || row.api_key_encrypted) return false;
  const key = await getKey();
  const encrypted = await encryptCredential(row.api_key, key, row.user_id);
  const { error } = await db
    .from(TABLE)
    .update({ api_key_encrypted: encrypted, api_key_hint: apiKeyHint(row.api_key), api_key: null })
    .eq('user_id', row.user_id)
    .eq('api_key', row.api_key) // only if unchanged since we read it
    .is('api_key_encrypted', null); // and nobody encrypted it concurrently
  if (error) {
    if (!isSchemaNotReadyError(error)) {
      console.error(`Failed to encrypt legacy credentials for ${row.user_id.substring(0, 8)}...`, error);
    }
    return false;
  }
  return true;
}

/**
 * Plaintext API key for a stored row (server-side only). Legacy plaintext rows
 * are transparently encrypted in place on first use. Never throws.
 */
export async function resolveApiKey(db: Db, getKey: KeyLoader, row: StoredCredentialRow | null | undefined): Promise<string | null> {
  if (!row) return null;
  if (row.api_key_encrypted) {
    try {
      return await decryptCredential(row.api_key_encrypted, await getKey(), row.user_id);
    } catch (err) {
      console.error(`Failed to decrypt credentials for ${row.user_id.substring(0, 8)}...`, err);
      return null;
    }
  }
  if (row.api_key) {
    try {
      await encryptLegacyRow(db, getKey, row);
    } catch (err) {
      console.warn('Lazy encryption of legacy credentials skipped (OCTOPUS_CREDENTIALS_KEY not set?)', err);
    }
    return row.api_key;
  }
  return null;
}

export type StoreResult =
  | { ok: true; encrypted: boolean }
  | { ok: false; status: number; error: string; duplicate?: boolean };

/**
 * Store (upsert, or insert-only) a user's credentials, encrypted. Before the
 * migration is applied the new columns don't exist; then the legacy plaintext
 * column is used (same as before this change) and the backfill encrypts it later.
 */
export async function storeCredentials(
  db: Db,
  getKey: KeyLoader,
  input: { userId: string; apiKey: string; accountNumber: string; createdAt?: string },
  options: { insertOnly?: boolean } = {},
): Promise<StoreResult> {
  let key: CryptoKey;
  try {
    key = await getKey();
  } catch (err) {
    console.error('Credential encryption unavailable (set OCTOPUS_CREDENTIALS_KEY)', err);
    return { ok: false, status: 503, error: 'Credential storage is temporarily unavailable' };
  }

  const base: Record<string, unknown> = {
    user_id: input.userId,
    account_number: input.accountNumber,
    updated_at: new Date().toISOString(),
  };
  if (input.createdAt) base.created_at = input.createdAt;

  const write = (record: Record<string, unknown>) =>
    options.insertOnly
      ? db.from(TABLE).insert(record)
      : db.from(TABLE).upsert(record, { onConflict: 'user_id' });

  const encrypted = await encryptCredential(input.apiKey, key, input.userId);
  let { error } = await write({ ...base, api_key: null, api_key_encrypted: encrypted, api_key_hint: apiKeyHint(input.apiKey) });
  if (!error) return { ok: true, encrypted: true };

  if (isSchemaNotReadyError(error)) {
    console.warn('Security migration not applied yet; storing credentials in the legacy column (will be encrypted by the backfill)');
    ({ error } = await write({ ...base, api_key: input.apiKey }));
    if (!error) return { ok: true, encrypted: false };
  }

  console.error('Error saving credentials:', error);
  const duplicate = (error as { code?: string })?.code === '23505';
  return { ok: false, status: 500, error: 'Failed to save credentials', duplicate };
}

export type BackfillResult =
  | { status: 'done'; encrypted: number; failed: number; remaining: number | null }
  | { status: 'skipped'; reason: 'no-key' | 'schema-not-ready' | 'query-failed' };

/**
 * Encrypt every remaining legacy plaintext key (in batches). Idempotent: once
 * nothing is left it costs one indexed-free count query. Never throws.
 */
export async function backfillLegacyCredentials(
  db: Db,
  getKey: KeyLoader,
  options: { batchSize?: number; maxBatches?: number } = {},
): Promise<BackfillResult> {
  const batchSize = options.batchSize ?? 200;
  const maxBatches = options.maxBatches ?? 10;
  try {
    await getKey();
  } catch {
    return { status: 'skipped', reason: 'no-key' };
  }

  let encrypted = 0;
  let failed = 0;
  for (let batch = 0; batch < maxBatches; batch++) {
    const { data, error } = await db
      .from(TABLE)
      .select('user_id, api_key, api_key_encrypted')
      .not('api_key', 'is', null)
      .is('api_key_encrypted', null)
      .limit(batchSize);
    if (error) {
      if (isSchemaNotReadyError(error)) return { status: 'skipped', reason: 'schema-not-ready' };
      console.error('Legacy credential backfill query failed', error);
      return { status: 'skipped', reason: 'query-failed' };
    }
    const rows = (data || []) as StoredCredentialRow[];
    if (rows.length === 0) break;
    let progressed = 0;
    for (const row of rows) {
      try {
        if (await encryptLegacyRow(db, getKey, row)) {
          encrypted++;
          progressed++;
        } else {
          failed++;
        }
      } catch (err) {
        console.error('Legacy encryption failed', err);
        failed++;
      }
    }
    if (progressed === 0 || rows.length < batchSize) break; // avoid spinning on rows that keep failing
  }

  const { count, error: countErr } = await db
    .from(TABLE)
    .select('user_id', { count: 'exact', head: true })
    .not('api_key', 'is', null);
  return { status: 'done', encrypted, failed, remaining: countErr ? null : (count ?? 0) };
}
