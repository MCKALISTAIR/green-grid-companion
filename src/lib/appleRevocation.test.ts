import { describe, it, expect, vi } from 'vitest';
import { getAppleAuthorizationForDeletion } from './appleRevocation';

describe('getAppleAuthorizationForDeletion', () => {
  it('uses the native prompt on iOS', async () => {
    const authorize = vi.fn().mockResolvedValue({ response: { authorizationCode: 'c1' } });
    expect(
      await getAppleAuthorizationForDeletion({ platform: 'ios', authorize, origin: 'https://x' }),
    ).toEqual({ apple_authorization_code: 'c1', apple_client: 'native' });
  });

  it('uses Apple JS on the web only when a Services ID is configured', async () => {
    const authorize = vi.fn().mockResolvedValue({ response: { authorizationCode: 'c2' } });
    expect(
      await getAppleAuthorizationForDeletion({ platform: 'web', webServicesId: '', authorize }),
    ).toBeNull();
    expect(authorize).not.toHaveBeenCalled();
    expect(
      await getAppleAuthorizationForDeletion({
        platform: 'web',
        webServicesId: 'svc',
        authorize,
        origin: 'https://x',
      }),
    ).toEqual({ apple_authorization_code: 'c2', apple_client: 'web' });
    expect(authorize).toHaveBeenCalledWith({
      clientId: 'svc',
      redirectURI: 'https://x',
      scopes: '',
    });
  });

  it('returns null on Android, cancel, or no code', async () => {
    expect(
      await getAppleAuthorizationForDeletion({ platform: 'android', authorize: vi.fn() }),
    ).toBeNull();
    expect(
      await getAppleAuthorizationForDeletion({
        platform: 'ios',
        authorize: vi.fn().mockRejectedValue(new Error('cancel')),
        origin: 'x',
      }),
    ).toBeNull();
    expect(
      await getAppleAuthorizationForDeletion({
        platform: 'ios',
        authorize: vi.fn().mockResolvedValue({ response: {} }),
        origin: 'x',
      }),
    ).toBeNull();
  });
});
