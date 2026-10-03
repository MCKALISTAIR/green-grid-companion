import { describe, it, expect } from 'vitest';
import {
  importCredentialKey,
  encryptCredential,
  decryptCredential,
  apiKeyHint,
} from '../../../supabase/functions/_shared/credential-crypto.ts';

const keyB64 = btoa(String.fromCharCode(...Array.from({ length: 32 }, (_, i) => i)));
const otherKeyB64 = btoa(String.fromCharCode(...Array.from({ length: 32 }, (_, i) => 255 - i)));
const USER_A = '11111111-1111-1111-1111-111111111111';
const USER_B = '22222222-2222-2222-2222-222222222222';
const API_KEY = 'sk_live_abcdefghijklmnopqrstuvwxyz1234';

describe('credential encryption', () => {
  it('round-trips and never contains the plaintext', async () => {
    const key = await importCredentialKey(keyB64);
    const ct = await encryptCredential(API_KEY, key, USER_A);
    expect(ct.startsWith('v1.')).toBe(true);
    expect(ct).not.toContain(API_KEY);
    expect(ct).not.toContain('sk_live');
    expect(await decryptCredential(ct, key, USER_A)).toBe(API_KEY);
  });

  it('uses a fresh IV each time', async () => {
    const key = await importCredentialKey(keyB64);
    const a = await encryptCredential(API_KEY, key, USER_A);
    const b = await encryptCredential(API_KEY, key, USER_A);
    expect(a).not.toBe(b);
  });

  it('binds ciphertext to the owning user (copying to another row fails)', async () => {
    const key = await importCredentialKey(keyB64);
    const ct = await encryptCredential(API_KEY, key, USER_A);
    await expect(decryptCredential(ct, key, USER_B)).rejects.toThrow();
  });

  it('fails with the wrong key or tampered ciphertext', async () => {
    const key = await importCredentialKey(keyB64);
    const other = await importCredentialKey(otherKeyB64);
    const ct = await encryptCredential(API_KEY, key, USER_A);
    await expect(decryptCredential(ct, other, USER_A)).rejects.toThrow();
    const [v, iv, body] = ct.split('.');
    const flipped = body.slice(0, -2) + (body.slice(-2) === 'AA' ? 'BB' : 'AA');
    await expect(decryptCredential(`${v}.${iv}.${flipped}`, key, USER_A)).rejects.toThrow();
    await expect(decryptCredential('plaintext', key, USER_A)).rejects.toThrow(/format/);
  });

  it('requires a configured 32-byte base64 key', async () => {
    await expect(importCredentialKey(undefined)).rejects.toThrow(/not configured/);
    await expect(importCredentialKey('')).rejects.toThrow(/not configured/);
    await expect(importCredentialKey(btoa('too short'))).rejects.toThrow(/32 bytes/);
    await expect(importCredentialKey('%%%not-base64%%%')).rejects.toThrow(/base64/);
  });

  it('only exposes the last 4 characters as a hint', () => {
    expect(apiKeyHint(API_KEY)).toBe('1234');
    expect(apiKeyHint('abc')).toBe('');
  });
});
