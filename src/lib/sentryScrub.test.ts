import { describe, it, expect } from 'vitest';
import type { ErrorEvent } from '@sentry/react';
import { redactLocation, scrubBreadcrumb, scrubEvent, REDACTED } from './sentryScrub';

describe('redactLocation', () => {
  it.each([
    [
      'https://api.carbonintensity.org.uk/regional/postcode/EH1',
      `https://api.carbonintensity.org.uk/regional/postcode/${REDACTED}`,
    ],
    ['https://api.postcodes.io/outcodes/SW1A', `https://api.postcodes.io/outcodes/${REDACTED}`],
    [
      'https://api.postcodes.io/postcodes/SW1A1AA',
      `https://api.postcodes.io/postcodes/${REDACTED}`,
    ],
    [
      'https://api.postcodes.io/postcodes?lon=-3.1883&lat=55.9533',
      `https://api.postcodes.io/postcodes?lon=${REDACTED}&lat=${REDACTED}`,
    ],
    [
      'https://api.open-meteo.com/v1/forecast?latitude=55.95&longitude=-3.19&hourly=x',
      `https://api.open-meteo.com/v1/forecast?latitude=${REDACTED}&longitude=${REDACTED}&hourly=x`,
    ],
    [
      'https://nominatim.openstreetmap.org/search?q=EH1%201YZ&format=json',
      `https://nominatim.openstreetmap.org/search?q=${REDACTED}&format=json`,
    ],
    ['https://example.com/tiles/55.9533/-3.1883', `https://example.com/tiles/${REDACTED}`],
    ['/map/55.953/-3.188?x=1', `/map/${REDACTED}?x=1`],
  ])('%s', (input, expected) => {
    expect(redactLocation(input)).toBe(expected);
  });

  it('redacts full postcodes and coordinate pairs in free text', () => {
    expect(redactLocation('Could not resolve EH1 1YZ')).toBe(`Could not resolve ${REDACTED}`);
    expect(redactLocation('bad postcode sw1a1aa')).toBe(`bad postcode ${REDACTED}`);
    expect(redactLocation('at 55.9533, -3.1883 now')).toBe(`at ${REDACTED} now`);
  });

  it('leaves ordinary text, versions and API paths alone', () => {
    for (const s of [
      'gridsense@1.6.0',
      'https://api.open-meteo.com/v1/forecast',
      'TypeError: x is undefined',
      'v2 of the A1 road',
      '/regional/intensity/2026-10-11T12:00Z/fw24h',
    ]) {
      expect(redactLocation(s)).toBe(s);
    }
  });
});

describe('scrubEvent / scrubBreadcrumb', () => {
  it('scrubs message, exception, request, breadcrumbs and drops the user', () => {
    const event = {
      type: undefined,
      message: 'Failed for EH1 1YZ',
      exception: {
        values: [{ type: 'Error', value: 'GET https://api.postcodes.io/outcodes/EH1 failed' }],
      },
      request: {
        url: 'https://gridsense.app/?lat=55.95&lon=-3.19',
        query_string: 'lat=55.95&lon=-3.19',
      },
      breadcrumbs: [
        {
          category: 'fetch',
          data: {
            url: 'https://api.carbonintensity.org.uk/regional/postcode/EH1',
            status_code: 200,
          },
        },
      ],
      user: { id: 'abc', ip_address: '1.2.3.4' },
    } as unknown as ErrorEvent;
    const out = scrubEvent(event);
    const json = JSON.stringify(out);
    expect(json).not.toMatch(/EH1|55\.95|-3\.19/);
    expect(out.user).toBeUndefined();
    expect(out.breadcrumbs?.[0].data?.status_code).toBe(200);
  });

  it('scrubs breadcrumb urls', () => {
    const crumb = scrubBreadcrumb({
      category: 'navigation',
      data: { from: '/', to: '/map?lat=51.5&lon=-0.12' },
    });
    expect(crumb.data?.to).toBe(`/map?lat=${REDACTED}&lon=${REDACTED}`);
  });
});

describe('BH-146: sign-in tokens and secrets', () => {
  const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhYmMifQ.c2lnbmF0dXJl';

  it('redacts tokens from the deep link URL in a breadcrumb message', () => {
    const crumb = scrubBreadcrumb({
      message: `gridsense://auth/callback#access_token=${jwt}&refresh_token=r3fr3sh&expires_in=3600`,
    });
    expect(crumb.message).not.toContain('r3fr3sh');
    expect(crumb.message).not.toContain('eyJ');
    expect(crumb.message).toContain('expires_in=3600');
  });

  it('redacts query-string tokens on navigation breadcrumbs', () => {
    const crumb = scrubBreadcrumb({
      category: 'navigation',
      data: {
        from: '/',
        to: '/auth/callback?access_token=aaa&refresh_token=bbb&provider_token=ccc&code=ddd',
      },
    });
    expect(crumb.data?.to).toBe(
      `/auth/callback?access_token=${REDACTED}&refresh_token=${REDACTED}&provider_token=${REDACTED}&code=${REDACTED}`,
    );
  });

  it('redacts secret-named keys, JSON bodies, bearer headers, JWTs and Octopus keys', () => {
    const out = scrubEvent({
      type: undefined,
      message: `Authorization: Bearer ${jwt} failed`,
      extra: {
        refresh_token: 'plain',
        nested: { apiKey: 'sk_live_abcDEF123', body: '{"access_token":"zzz","ok":1}' },
        note: 'key sk_live_XYZ987 rejected',
      },
    } as unknown as ErrorEvent);
    const json = JSON.stringify(out);
    expect(json).not.toMatch(/plain|sk_live_|zzz|eyJ/);
    const extra = out.extra as { nested: { body: string } };
    expect(extra.nested.body).toBe(`{"access_token":"${REDACTED}","ok":1}`);
  });

  it('leaves ordinary data alone', () => {
    const crumb = scrubBreadcrumb({ data: { code: 'octopus_timeout', status_code: 500 } });
    expect(crumb.data).toEqual({ code: 'octopus_timeout', status_code: 500 });
  });
});
