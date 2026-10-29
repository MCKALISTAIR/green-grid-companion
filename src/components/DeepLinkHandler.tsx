import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { logger } from '@/lib/logger';
import { deepLinkToRoute } from '@/lib/deepLink';

export function DeepLinkHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    // Deep links only work on native platforms
    if (!Capacitor.isNativePlatform()) return;

    let cleanup: (() => void) | undefined;

    const setup = async () => {
      const { App } = await import('@capacitor/app');

      const handleDeepLink = (event: { url: string }) => {
        // BH-146: never log the URL, it can carry sign-in tokens.
        const route = deepLinkToRoute(event.url);
        if (!route) {
          logger.warn('Ignoring unrecognised deep link');
          return;
        }
        logger.info('Deep link to auth callback', { hasHash: route.hash.length > 1 });
        navigate({ pathname: route.pathname, hash: route.hash });
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
