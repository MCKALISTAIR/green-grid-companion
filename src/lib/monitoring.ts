/**
 * Sentry error monitoring.
 *
 * - Turns on automatically in production builds once VITE_SENTRY_DSN is set at
 *   build time (see README "Error monitoring"). No DSN is hard-coded.
 * - Crash/error reports always run when enabled. Before consent they must not
 *   touch device storage (PECR): no session tracking (BrowserSession is removed
 *   from the default integrations), no tracing, no replay buffer, no offline
 *   transport. Verified in a browser: no cookies, localStorage, sessionStorage
 *   or IndexedDB entries from Sentry before Accept (see the consent PR).
 * - No default PII and never a user (Sentry.setUser is not used anywhere);
 *   URLs, messages and breadcrumbs are scrubbed of coordinates and postcodes
 *   (src/lib/sentryScrub.ts).
 * - Native (iOS/Android): @sentry/capacitor is linked by Capacitor but its
 *   native SDK is never started (only @sentry/react is initialised), so Sentry
 *   Cocoa writes nothing to disk. Guarded by monitoring.native.test.ts.
 * - Performance tracing and Session Replay are optional diagnostics and only
 *   run after the user taps "Accept" on the cookie banner. Declining (or
 *   resetting the choice later) stops them.
 */
import * as Sentry from '@sentry/react';
import { Capacitor } from '@capacitor/core';
import { hasOptionalConsent, onConsentChange, type ConsentChoice } from './consent';
import { scrubBreadcrumb, scrubEvent } from './sentryScrub';

export const TRACES_SAMPLE_RATE = 0.1;
export const REPLAY_SESSION_SAMPLE_RATE = 0.1;
export const REPLAY_ON_ERROR_SAMPLE_RATE = 1.0;
/** Default integrations removed in every mode. */
export const EXCLUDED_DEFAULT_INTEGRATIONS = ['BrowserSession'];
export const REPLAY_PRIVACY = {
  maskAllText: true,
  maskAllInputs: true,
  blockAllMedia: true,
} as const;

const pct = (rate: number) => `${Math.round(rate * 100)}%`;

/**
 * What the app collects, for the privacy sheet's "Details". Built from the
 * values above so it stays accurate if they change.
 */
export const DIAGNOSTICS_DISCLOSURE = {
  always: [
    'Crash reports: what went wrong and where in the code, the app version, your browser or OS and device type, and the screen you were on. Locations and postcodes are removed first. They store nothing on your device.',
    'Your region, settings, sign-in and offline data, and this choice, kept on this device so the app works.',
  ],
  ifAccepted: [
    `Performance data: how long screens and requests take, for ${pct(TRACES_SAMPLE_RATE)} of visits.`,
    `Session replays: a replay of taps and screen changes for ${pct(REPLAY_SESSION_SAMPLE_RATE)} of visits${REPLAY_ON_ERROR_SAMPLE_RATE > 0 ? ', and for visits where something goes wrong' : ''}. ${REPLAY_PRIVACY.maskAllText ? 'All text is hidden' : 'Text is shown'}, ${REPLAY_PRIVACY.maskAllInputs ? 'nothing you type is recorded' : 'inputs are recorded'}${REPLAY_PRIVACY.blockAllMedia ? ' and images are blocked' : ''}.`,
    "While a replay runs, Sentry keeps a session id in this tab's session storage. It goes when you close the tab.",
  ],
  never: ['No ads, no cross-site tracking, and we never sell your data.'],
} as const;

export interface MonitoringEnv {
  dsn?: string;
  version?: string;
  isDev: boolean;
  hostname?: string;
  environment?: string;
}

export function getRelease(version?: string): string {
  return `gridsense@${version && version.trim() ? version.trim() : 'unknown'}`;
}

export function getEnvironment(env: MonitoringEnv): string {
  if (env.environment) return env.environment;
  if (env.isDev) return 'development';
  const host = env.hostname ?? '';
  // Lovable editor previews run on *.lovableproject.com / id-preview-* hosts.
  if (host.endsWith('.lovableproject.com') || host.startsWith('id-preview-')) return 'preview';
  return 'production';
}

export function isMonitoringEnabled(env: MonitoringEnv): boolean {
  return Boolean(env.dsn && env.dsn.trim()) && !env.isDev;
}

/** Sentry options derived from the build env. Exported for tests. */
export function buildSentryOptions(
  env: MonitoringEnv,
  consentGranted: () => boolean,
): Sentry.BrowserOptions {
  return {
    dsn: env.dsn?.trim() || undefined,
    enabled: isMonitoringEnabled(env),
    release: getRelease(env.version),
    environment: getEnvironment(env),
    sendDefaultPii: false,
    // Tracing and Replay are only added after consent (enableOptionalDiagnostics).
    // BrowserSession (release-health session tracking) is dropped so errors-only
    // mode sends no session pings and keeps nothing about the visit.
    integrations: (defaults) =>
      defaults.filter((i) => !EXCLUDED_DEFAULT_INTEGRATIONS.includes(i.name)),
    // Sampled per trace, so withdrawing consent takes effect for the next trace.
    tracesSampler: () => (consentGranted() ? (env.isDev ? 1.0 : TRACES_SAMPLE_RATE) : 0),
    replaysSessionSampleRate: REPLAY_SESSION_SAMPLE_RATE,
    replaysOnErrorSampleRate: REPLAY_ON_ERROR_SAMPLE_RATE,
    beforeBreadcrumb: (crumb) => scrubBreadcrumb(crumb),
    beforeSendTransaction: (event) => scrubEvent(event),
    beforeSend(rawEvent) {
      const event = scrubEvent(rawEvent);
      event.tags = {
        ...event.tags,
        platform: Capacitor.isNativePlatform() ? 'native' : 'web',
        capacitor_platform: Capacitor.getPlatform(),
      };
      return event;
    },
  };
}

let optionalDiagnosticsOn = false;

function enableOptionalDiagnostics(): void {
  if (optionalDiagnosticsOn) {
    Sentry.getReplay()?.start();
    return;
  }
  optionalDiagnosticsOn = true;
  Sentry.addIntegration(Sentry.browserTracingIntegration());
  Sentry.addIntegration(Sentry.replayIntegration({ ...REPLAY_PRIVACY }));
}

function disableOptionalDiagnostics(): void {
  const replay = Sentry.getReplay();
  if (replay) void replay.stop();
}

export function initMonitoring(env: MonitoringEnv): void {
  Sentry.init(buildSentryOptions(env, hasOptionalConsent));
  if (!isMonitoringEnabled(env)) return;

  if (hasOptionalConsent()) enableOptionalDiagnostics();
  onConsentChange((choice: ConsentChoice | null) => {
    if (choice === 'accepted') enableOptionalDiagnostics();
    else disableOptionalDiagnostics();
  });
}
