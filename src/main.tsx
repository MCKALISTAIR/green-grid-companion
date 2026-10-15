import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

import { initMonitoring } from './lib/monitoring';

// Error monitoring (Sentry). Enabled in production once VITE_SENTRY_DSN is set;
// tracing + Session Replay only run after cookie-banner consent.
initMonitoring({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  version: import.meta.env.VITE_APP_VERSION,
  environment: import.meta.env.VITE_SENTRY_ENVIRONMENT,
  isDev: import.meta.env.DEV,
  hostname: typeof window !== 'undefined' ? window.location.hostname : undefined,
});

import { logger } from './lib/logger';

// Log startup in development
if (import.meta.env.DEV) {
  logger.info('GridSense starting in development mode', {
    version: import.meta.env.VITE_APP_VERSION,
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
