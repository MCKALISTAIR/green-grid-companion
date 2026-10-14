import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { logger } from '@/lib/logger';
import { APP_SCHEME } from '@/config';
import { ROUTES } from '@/lib/routes';

export function DeepLinkHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    // Deep links only work on native platforms
    if (!Capacitor.isNativePlatform()) return;

    let cleanup: (() => void) | undefined;

    const setup = async () => {
      const { App } = await import('@capacitor/app');

      const handleDeepLink = (event: { url: string }) => {
        logger.info('Deep link received:', { url: event.url });

        try {
          const url = new URL(event.url);

          // Verify scheme to prevent handling unexpected links
          if (url.protocol !== `${APP_SCHEME.toLowerCase()}:`) {
            logger.warn('Ignoring deep link with unknown scheme:', { scheme: url.protocol });
            return;
          }

          if (url.pathname.startsWith(ROUTES.AUTH_CALLBACK)) {
            // Forward hash fragment as query params so React Router can access them
            // The broker returns tokens in the hash: #access_token=...&refresh_token=...
            const hashFragment = url.hash ? url.hash.substring(1) : '';
            const existingSearch = url.search ? url.search.substring(1) : '';

            // Merge hash params into query params (hash takes priority)
            const mergedParams = new URLSearchParams(existingSearch);
            if (hashFragment) {
              const hashParams = new URLSearchParams(hashFragment);
              hashParams.forEach((value, key) => {
                mergedParams.set(key, value);
              });
            }

            const queryString = mergedParams.toString();
            const path = url.pathname + (queryString ? `?${queryString}` : '');
            logger.info('Navigating to auth callback with tokens:', {
              path,
              hasHash: !!hashFragment,
            });
            navigate(path);
          }
        } catch (error) {
          logger.error('Failed to parse deep link URL', error);
        }
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
