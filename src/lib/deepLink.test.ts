import { describe, expect, it } from 'vitest';
import { deepLinkToRoute } from './deepLink';

describe('deepLinkToRoute (BH-145)', () => {
  it('routes the custom-scheme callback and keeps tokens in the hash', () => {
    expect(deepLinkToRoute('GridSense://auth/callback#access_token=a&refresh_token=r')).toEqual({
      pathname: '/auth/callback',
      hash: '#access_token=a&refresh_token=r',
    });
  });

  it('routes the universal-link callback on getgridsense.com', () => {
    expect(deepLinkToRoute('https://getgridsense.com/auth/callback/#x=1')).toEqual({
      pathname: '/auth/callback',
      hash: '#x=1',
    });
  });

  it('never moves query-string tokens into the route', () => {
    expect(deepLinkToRoute('gridsense://auth/callback?access_token=a&refresh_token=r')).toEqual({
      pathname: '/auth/callback',
      hash: '',
    });
  });

  it('ignores other hosts, schemes and paths', () => {
    expect(deepLinkToRoute('https://evil.example/auth/callback#access_token=a')).toBeNull();
    expect(deepLinkToRoute('otherapp://auth/callback')).toBeNull();
    expect(deepLinkToRoute('gridsense://settings')).toBeNull();
    expect(deepLinkToRoute('not a url')).toBeNull();
  });
});
