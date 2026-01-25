import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

import * as Sentry from "@sentry/react";
import { Capacitor } from "@capacitor/core";

// Initialize Sentry with enhanced configuration
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  // Environment detection
  environment: import.meta.env.DEV ? 'development' : 'production',
  // Release tracking
  release: `gridsense@${import.meta.env.VITE_APP_VERSION || '0.0.0'}`,
  // Performance Monitoring
  tracesSampleRate: import.meta.env.DEV ? 1.0 : 0.1, // 100% in dev, 10% in prod
  // Session Replay
  replaysSessionSampleRate: 0.1, // 10% of sessions
  replaysOnErrorSampleRate: 1.0, // 100% when errors occur
  // Only enable if DSN is present
  enabled: !!import.meta.env.VITE_SENTRY_DSN && !import.meta.env.DEV,
  // Add platform tag
  beforeSend(event) {
    if (event) {
      event.tags = {
        ...event.tags,
        platform: Capacitor.isNativePlatform() ? 'native' : 'web',
        capacitor_platform: Capacitor.getPlatform(),
      };
    }
    return event;
  },
});

import { logger } from "./lib/logger";

// Log startup in development
if (import.meta.env.DEV) {
  logger.info('GridSense starting in development mode', {
    version: import.meta.env.VITE_APP_VERSION || '0.0.0',
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
