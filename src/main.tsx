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
import { hydrateAppStorage } from './lib/appStorage';
import { installExternalLinkHandler } from './lib/openExternal';
import { captureOAuthRedirect, completeOAuthRedirect } from './lib/oauthRedirect';
import { supabase } from './integrations/supabase/client';
import { installStaleChunkReload } from './lib/staleChunkReload';
import { installAnonMigration } from './lib/anonMigration';
import { toast } from 'sonner';

// BH-119: read Google/Apple sign-in tokens from the URL before anything can
// navigate (the "no postcode -> /onboarding" redirect used to drop them).
const oauthReturn =
  typeof window !== 'undefined' ? captureOAuthRedirect(window.location.href) : null;

// BH-131: an open tab whose old chunks were removed by a deploy reloads once.
if (typeof window !== 'undefined') {
  installStaleChunkReload({
    target: window,
    storage: sessionStorage,
    reload: () => window.location.reload(),
  });
}

// BH-129: move anonymous Octopus data to the account after any sign-in,
// including a web OAuth return that lands outside Settings.
installAnonMigration({
  onAuthStateChange: (cb) => supabase.auth.onAuthStateChange(cb),
  invoke: (previousUserId) =>
    supabase.functions.invoke('octopus-energy', {
      body: { action: 'migrate-data', previousUserId },
    }),
  storage: localStorage,
  onMigrated: ({ credentials, meters = 0, footprint_records = 0 }) => {
    if (credentials || meters > 0) {
      toast.success(`Restored ${meters} meter(s) and ${footprint_records} records`);
    }
  },
  onError: (error) => logger.warn('Data migration failed', { error: String(error) }),
});

// Native: external links open in SFSafariViewController, not Safari (BH-51).
installExternalLinkHandler();

// Log startup in development
if (import.meta.env.DEV) {
  logger.info('GridSense starting in development mode', {
    version: import.meta.env.VITE_APP_VERSION,
  });
}

// Native: load saved settings from Preferences before the first render so the
// app never flashes default state. Web resolves immediately.
// Web OAuth return (BH-119): store the session and clean the URL first. Only
// waits when the URL actually carries sign-in tokens or an error.
void Promise.allSettled([
  hydrateAppStorage(),
  completeOAuthRedirect(oauthReturn, {
    auth: supabase.auth,
    location: window.location,
    history: window.history,
    warn: (message, context) => logger.warn(message, context),
  }),
]).finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
