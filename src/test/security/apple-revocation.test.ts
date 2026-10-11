import { describe, it, expect, vi, beforeAll } from 'vitest';
import { webcrypto } from 'node:crypto';
import {
  createAppleClientSecret,
  isAppleUser,
  loadAppleSigninConfig,
  revokeAppleSignin,
  type AppleSigninConfig,
} from '../../../supabase/functions/_shared/apple-auth.ts';

async function makeConfig(): Promise<{ config: AppleSigninConfig; publicKey: CryptoKey }> {
  const pair = await webcrypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const pkcs8 = Buffer.from(await webcrypto.subtle.exportKey('pkcs8', pair.privateKey)).toString('base64');
  const pem = `-----BEGIN PRIVATE KEY-----\n${pkcs8.match(/.{1,64}/g)!.join('\n')}\n-----END PRIVATE KEY-----`;
  return {
    config: { teamId: 'TEAM123456', keyId: 'KEY1234567', privateKeyPem: pem, clientIds: { native: 'app.bundle', web: 'app.bundle.web' } },
    publicKey: pair.publicKey as unknown as CryptoKey,
  };
}

// jsdom's crypto may lack SubtleCrypto; the edge runtime (Deno) has it.
beforeAll(() => { if (!globalThis.crypto?.subtle) vi.stubGlobal('crypto', webcrypto); });

const b64urlJson = (part: string) => JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));

describe('Sign in with Apple revocation', () => {
  it('builds a valid ES256 client secret for appleid.apple.com', async () => {
    const { config, publicKey } = await makeConfig();
    const jwt = await createAppleClientSecret(config, 'app.bundle', 1_800_000_000);
    const [h, p, s] = jwt.split('.');
    expect(b64urlJson(h)).toEqual({ alg: 'ES256', kid: 'KEY1234567', typ: 'JWT' });
    expect(b64urlJson(p)).toEqual({ iss: 'TEAM123456', iat: 1_800_000_000, exp: 1_800_000_300, aud: 'https://appleid.apple.com', sub: 'app.bundle' });
    const ok = await webcrypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' }, publicKey as never, Buffer.from(s, 'base64url'), new TextEncoder().encode(`${h}.${p}`),
    );
    expect(ok).toBe(true);
  });

  it('detects Apple users', () => {
    expect(isAppleUser({ app_metadata: { provider: 'apple' } })).toBe(true);
    expect(isAppleUser({ identities: [{ provider: 'google' }, { provider: 'apple' }] })).toBe(true);
    expect(isAppleUser({ app_metadata: { providers: ['google'] }, identities: [] })).toBe(false);
  });

  it('loads config from secrets, with APNs fallbacks', () => {
    const env: Record<string, string> = { APNS_TEAM_ID: 'T', APPLE_SIGNIN_KEY_ID: 'K', APPLE_SIGNIN_PRIVATE_KEY: 'a\\nb', APNS_BUNDLE_ID: 'bundle' };
    expect(loadAppleSigninConfig((n) => env[n])).toEqual({ teamId: 'T', keyId: 'K', privateKeyPem: 'a\nb', clientIds: { native: 'bundle' } });
    expect(loadAppleSigninConfig(() => undefined)).toBeNull();
  });

  it('exchanges the code then revokes the refresh token', async () => {
    const { config } = await makeConfig();
    const fetchFn = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ refresh_token: 'r1', access_token: 'a1' }), { status: 200 }))
      .mockResolvedValueOnce(new Response('', { status: 200 }));
    const status = await revokeAppleSignin({ config, authorizationCode: 'code1', clientKind: 'native', fetchFn, log: () => {} });
    expect(status).toBe('revoked');
    expect(fetchFn.mock.calls[0][0]).toBe('https://appleid.apple.com/auth/token');
    const tokenBody = new URLSearchParams(fetchFn.mock.calls[0][1].body);
    expect(tokenBody.get('grant_type')).toBe('authorization_code');
    expect(tokenBody.get('client_id')).toBe('app.bundle');
    expect(tokenBody.get('code')).toBe('code1');
    expect(fetchFn.mock.calls[1][0]).toBe('https://appleid.apple.com/auth/revoke');
    const revokeBody = new URLSearchParams(fetchFn.mock.calls[1][1].body);
    expect(revokeBody.get('token')).toBe('r1');
    expect(revokeBody.get('token_type_hint')).toBe('refresh_token');
  });

  it('uses the web Services ID for web codes', async () => {
    const { config } = await makeConfig();
    const fetchFn = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'a1' }), { status: 200 }))
      .mockResolvedValueOnce(new Response('', { status: 200 }));
    expect(await revokeAppleSignin({ config, authorizationCode: 'c', clientKind: 'web', fetchFn, log: () => {} })).toBe('revoked');
    expect(new URLSearchParams(fetchFn.mock.calls[0][1].body).get('client_id')).toBe('app.bundle.web');
    expect(new URLSearchParams(fetchFn.mock.calls[1][1].body).get('token_type_hint')).toBe('access_token');
  });

  it('reports, never throws, when it cannot revoke', async () => {
    const { config } = await makeConfig();
    const log = vi.fn();
    expect(await revokeAppleSignin({ config: null, authorizationCode: 'c', log })).toBe('not_configured');
    expect(await revokeAppleSignin({ config, authorizationCode: null, log })).toBe('no_authorization_code');
    const bad = vi.fn().mockResolvedValue(new Response('{"error":"invalid_grant"}', { status: 400 }));
    expect(await revokeAppleSignin({ config, authorizationCode: 'c', fetchFn: bad, log })).toBe('failed');
    const boom = vi.fn().mockRejectedValue(new Error('network'));
    expect(await revokeAppleSignin({ config, authorizationCode: 'c', fetchFn: boom, log })).toBe('failed');
    const noWeb = { ...config, clientIds: { native: 'app.bundle' } };
    expect(await revokeAppleSignin({ config: noWeb, authorizationCode: 'c', clientKind: 'web', log })).toBe('not_configured');
  });
});
