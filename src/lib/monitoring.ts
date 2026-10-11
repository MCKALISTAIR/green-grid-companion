/**
 * Sentry error monitoring.
 *
 * - Turns on automatically in production builds once VITE_SENTRY_DSN is set at
 *   build time (see README "Error monitoring"). No DSN is hard-coded.
 * - Crash/error reports always run when enabled: they set no cookies, store
 *   nothing on the device and send no default PII.
 * - Performance tracing and Session Replay are optional diagnostics and only
 *   run after the user taps "Accept" on the cookie banner. Declining (or
 *   resetting the choice later) stops them.
 */
import * as Sentry from '@sentry/react';
import { Capacitor } from '@capacitor/core';
import { hasOptionalConsent, onConsentChange, type ConsentChoice } from './consent';

export const TRACES_SAMPLE_RATE = 0.1;
export const REPLAY_SESSION_SAMPLE_RATE = 0.1;
export const REPLAY_ON_ERROR_SAMPLE_RATE = 1.0;

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
export function buildSentryOptions(env: MonitoringEnv, consentGranted: () => boolean): Sentry.BrowserOptions {
  return {
    dsn: env.dsn?.trim() || undefined,
    enabled: isMonitoringEnabled(env),
    release: getRelease(env.version),
    environment: getEnvironment(env),
    sendDefaultPii: false,
    // Tracing and Replay integrations are only added after consent (enableOptionalDiagnostics).
    integrations: [],
    // Sampled per trace, so withdrawing consent takes effect for the next trace.
    tracesSampler: () => (consentGranted() ? (env.isDev ? 1.0 : TRACES_SAMPLE_RATE) : 0),
    replaysSessionSampleRate: REPLAY_SESSION_SAMPLE_RATE,
    replaysOnErrorSampleRate: REPLAY_ON_ERROR_SAMPLE_RATE,
    beforeSend(event) {
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
  Sentry.addIntegration(
    Sentry.replayIntegration({
      maskAllText: true,
      maskAllInputs: true,
      blockAllMedia: true,
    }),
  );
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
