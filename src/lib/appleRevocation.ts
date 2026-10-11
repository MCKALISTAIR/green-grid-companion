import { Capacitor } from '@capacitor/core';

/**
 * Before deleting an account that signed in with Apple we ask Apple for a fresh
 * authorization code, which delete-account exchanges and revokes server-side
 * (App Store Review Guideline 5.1.1(v)). Returns null when it isn't possible
 * here (Android, web without a Services ID, or the user cancelled); deletion
 * still goes ahead.
 */
export interface AppleDeletionAuth {
  apple_authorization_code: string;
  apple_client: 'native' | 'web';
}

type AuthorizeFn = (options: { clientId: string; redirectURI: string; scopes?: string }) =>
  Promise<{ response: { authorizationCode?: string | null } }>;

export async function getAppleAuthorizationForDeletion(deps: {
  platform?: string;
  webServicesId?: string;
  origin?: string;
  authorize?: AuthorizeFn;
} = {}): Promise<AppleDeletionAuth | null> {
  const platform = deps.platform ?? Capacitor.getPlatform();
  const webServicesId = deps.webServicesId ?? import.meta.env.VITE_APPLE_SERVICES_ID;
  const kind: 'native' | 'web' | null = platform === 'ios' ? 'native' : platform === 'web' && webServicesId ? 'web' : null;
  if (!kind) return null;

  try {
    const authorize: AuthorizeFn = deps.authorize ?? (async (options) => {
      const { SignInWithApple } = await import('@capacitor-community/apple-sign-in');
      return SignInWithApple.authorize(options);
    });
    const origin = deps.origin ?? window.location.origin;
    // On iOS the native prompt uses the app's bundle ID; clientId/redirectURI only matter on the web.
    const res = await authorize({ clientId: webServicesId ?? '', redirectURI: origin, scopes: '' });
    const code = res?.response?.authorizationCode;
    return code ? { apple_authorization_code: code, apple_client: kind } : null;
  } catch {
    return null;
  }
}
