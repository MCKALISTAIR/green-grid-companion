// Application-layer encryption for third-party API keys (e.g. Octopus Energy).
//
// Keys are encrypted with AES-256-GCM inside edge functions before they are
// written to Postgres. The 32-byte encryption key lives only in the edge
// function secret `OCTOPUS_CREDENTIALS_KEY` (base64), never in the database,
// so a database dump / leaked SQL access alone does not reveal API keys.
// The owning user's id is bound as additional authenticated data (AAD), so a
// ciphertext copied onto another user's row will fail to decrypt.
//
// Runtime-agnostic (Web Crypto only) so it can be unit tested from Vitest.

const VERSION = 'v1';

function bytesToBase64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function base64ToBytes(b64: string) {
  const bin = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Import a base64-encoded 32-byte key. Throws if missing or the wrong size. */
export async function importCredentialKey(base64Key: string | undefined | null): Promise<CryptoKey> {
  if (!base64Key) {
    throw new Error('OCTOPUS_CREDENTIALS_KEY is not configured');
  }
  let raw: ReturnType<typeof base64ToBytes>;
  try {
    raw = base64ToBytes(base64Key.trim());
  } catch {
    throw new Error('OCTOPUS_CREDENTIALS_KEY must be base64');
  }
  if (raw.length !== 32) {
    throw new Error('OCTOPUS_CREDENTIALS_KEY must decode to exactly 32 bytes');
  }
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

/** Encrypt `plaintext` for `userId`. Output format: `v1.<iv b64>.<ciphertext b64>`. */
export async function encryptCredential(plaintext: string, key: CryptoKey, userId: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(new ArrayBuffer(12)));
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(userId) },
    key,
    new TextEncoder().encode(plaintext),
  );
  return `${VERSION}.${bytesToBase64(iv)}.${bytesToBase64(new Uint8Array(ct))}`;
}

/** Decrypt a value produced by `encryptCredential` for the same `userId`. Throws on tamper/mismatch. */
export async function decryptCredential(payload: string, key: CryptoKey, userId: string): Promise<string> {
  const parts = payload.split('.');
  if (parts.length !== 3 || parts[0] !== VERSION) {
    throw new Error('Unsupported credential ciphertext format');
  }
  const iv = base64ToBytes(parts[1]);
  const ct = base64ToBytes(parts[2]);
  const pt = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(userId) },
    key,
    ct,
  );
  return new TextDecoder().decode(pt);
}

/** Non-secret hint shown to the user (last 4 characters only). */
export function apiKeyHint(apiKey: string): string {
  const trimmed = apiKey.trim();
  return trimmed.length >= 4 ? trimmed.slice(-4) : '';
}
