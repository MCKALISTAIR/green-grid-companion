import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { buildSentryOptions, getEnvironment, getRelease, isMonitoringEnabled } from './monitoring';
import { APP_VERSION } from './version';

const DSN = 'https://public@o0.ingest.sentry.io/0';

describe('monitoring', () => {
  it('stays off without a DSN and in dev', () => {
    expect(isMonitoringEnabled({ isDev: false })).toBe(false);
    expect(isMonitoringEnabled({ isDev: false, dsn: '  ' })).toBe(false);
    expect(isMonitoringEnabled({ isDev: true, dsn: DSN })).toBe(false);
    expect(isMonitoringEnabled({ isDev: false, dsn: DSN })).toBe(true);
  });

  it('tags the release with the real version', () => {
    expect(getRelease('1.6.0')).toBe('gridsense@1.6.0');
    expect(getRelease(undefined)).toBe('gridsense@unknown');
  });

  it('build injects package.json version and version.ts agrees', () => {
    const pkg = JSON.parse(readFileSync(resolve(__dirname, '../../package.json'), 'utf-8'));
    expect(`${APP_VERSION.major}.${APP_VERSION.minor}.${APP_VERSION.patch}`).toBe(pkg.version);
    expect(import.meta.env.VITE_APP_VERSION).toBe(pkg.version);
  });

  it('detects preview vs production', () => {
    expect(getEnvironment({ isDev: false, hostname: 'gridsense-app.lovable.app' })).toBe(
      'production',
    );
    expect(getEnvironment({ isDev: false, hostname: 'abc.lovableproject.com' })).toBe('preview');
    expect(getEnvironment({ isDev: true })).toBe('development');
  });

  it('samples no traces without consent', () => {
    let consent = false;
    const opts = buildSentryOptions({ isDev: false, dsn: DSN, version: '1.6.0' }, () => consent);
    const sampler = opts.tracesSampler as (ctx: unknown) => number;
    expect(sampler({})).toBe(0);
    consent = true;
    expect(sampler({})).toBe(0.1);
    expect(opts.sendDefaultPii).toBe(false);
    // Defaults minus session tracking; tracing/replay are never in the initial list.
    const fake = ['InboundFilters', 'BrowserSession', 'GlobalHandlers', 'Dedupe'].map((name) => ({
      name,
      setupOnce() {},
    }));
    const kept = (opts.integrations as (d: typeof fake) => typeof fake)(fake).map((i) => i.name);
    expect(kept).toEqual(['InboundFilters', 'GlobalHandlers', 'Dedupe']);
    expect(opts.release).toBe('gridsense@1.6.0');
  });
});
