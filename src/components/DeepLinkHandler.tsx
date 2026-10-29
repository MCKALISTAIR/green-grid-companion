import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { logger } from '@/lib/logger';
import { APP_SCHEME } from '@/config';
import { ROUTES } from '@/lib/routes';
import { supabase } from '@/integrations/supabase/client';
import { completeNativeCallback } from '@/lib/nativeAuth';
import { toast } from 'sonner';

export function DeepLinkHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    // Deep links only work on native platforms
    if (!Capacitor.isNativePlatform()) return;

    let cleanup: (() => void) | undefined;

    const setup = async () => {
      const { App } = await import('@capacitor/app');

      const handleDeepLink = (event: { url: string }) => {
        // Never log the full URL: a sign-in return carries session tokens.
        logger.info('Deep link received:', { url: event.url.split(/[?#]/)[0] });

        // BH-119: sign-in return, as a universal link
        // (https://getgridsense.com/auth/callback) or the GridSense:// handoff.
        void completeNativeCallback(event.url, { auth: supabase.auth }, (message) =>
          toast.error(`Sign in failed: ${message}`),
        )
          .then((outcome) => {
            if (outcome === 'signed-in') navigate(ROUTES.HOME);
            else if (outcome === 'not-auth') {
              try {
                const url = new URL(event.url);
                if (url.protocol !== `${APP_SCHEME.toLowerCase()}:`) {
                  logger.warn('Ignoring deep link with unknown scheme:', { scheme: url.protocol });
                }
              } catch (error) {
                logger.error('Failed to parse deep link URL', error);
              }
            }
          })
          .catch((error) => logger.error('Failed to complete sign-in from deep link', error));
      };

      const subscription = await App.addListener('appUrlOpen', handleDeepLink);
      cleanup = () => subscription.remove();

      // Check if app was opened with a URL (cold start)
      try {
        const launchUrl = await App.getLaunchUrl();
        if (launchUrl?.url) {
          handleDeepLink(launchUrl);
        }
      } catch (error) {
        // getLaunchUrl can fail on some platforms — safe to ignore, but log for debugging
        logger.debug('getLaunchUrl not available on this platform', { error });
      }
    };

    setup();

    return () => cleanup?.();
  }, [navigate]);

  return null;
}
