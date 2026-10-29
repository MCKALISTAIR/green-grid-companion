import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { ROUTES } from '@/lib/routes';
import { captureOAuthRedirect, completeOAuthRedirect } from '@/lib/oauthRedirect';
import { consumeOAuthStart } from '@/lib/oauthIntent';

/**
 * Native sign-in return (DeepLinkHandler routes GridSense://auth/callback and
 * https://getgridsense.com/auth/callback here, tokens in the hash).
 *
 * BH-145: tokens are only used if this device started a sign-in in the last
 * few minutes (oauthIntent.ts). Tokens in the query string are never used.
 * Either way the tokens are removed from the URL before we move on.
 */
export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const outcome = await completeOAuthRedirect(captureOAuthRedirect(window.location.href), {
        auth: supabase.auth,
        location: window.location,
        history: window.history,
        warn: (message, context) => logger.warn(message, context),
        consumeIntent: () => consumeOAuthStart(),
      });
      logger.info('Auth callback finished', { outcome });
      if (!cancelled) navigate(ROUTES.HOME, { replace: true });
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="text-muted-foreground">Signing you in…</p>
      </div>
    </div>
  );
}
