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

  it('requires a configured key: base64 32 bytes, or a passphrase of 32+ characters', async () => {
    await expect(importCredentialKey(undefined)).rejects.toThrow(/not configured/);
    await expect(importCredentialKey('')).rejects.toThrow(/not configured/);
    await expect(importCredentialKey('   ')).rejects.toThrow(/not configured/);
    await expect(importCredentialKey(btoa('too short'))).rejects.toThrow(/at least 32/);
    await expect(importCredentialKey('short-password-from-phone')).rejects.toThrow(/at least 32/);
  });

  it('accepts a password-manager style secret and derives the same key every time', async () => {
    const secret = 'Zq8v1LmN4pR7sT0wX3yA6bC9dE2fG5hJ8kM1nP4qS7uV0-x_';
    const ct = await encryptCredential(API_KEY, await importCredentialKey(secret), USER_A);
    // a fresh import (e.g. another function instance) decrypts it
    expect(await decryptCredential(ct, await importCredentialKey(` ${secret} `), USER_A)).toBe(API_KEY);
    // a different passphrase does not
    await expect(decryptCredential(ct, await importCredentialKey(secret + 'x'), USER_A)).rejects.toThrow();
    // and it is not confused with the raw base64 key path
    await expect(decryptCredential(ct, await importCredentialKey(keyB64), USER_A)).rejects.toThrow();
  });

  it('only exposes the last 4 characters as a hint', () => {
    expect(apiKeyHint(API_KEY)).toBe('1234');
    expect(apiKeyHint('abc')).toBe('');
  });
});
