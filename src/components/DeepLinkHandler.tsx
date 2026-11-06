import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { logger } from '@/lib/logger';
import { ROUTES } from '@/lib/routes';
import { supabase } from '@/integrations/supabase/client';
import { completeNativeCallback } from '@/lib/nativeAuth';
import { toast } from 'sonner';

export function DeepLinkHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let cleanup: (() => void) | undefined;

    const setup = async () => {
      const { App } = await import('@capacitor/app');

      const handleDeepLink = (event: { url: string }) => {
        // Never log the full URL: an OAuth return carries a single-use code.
        // Only getgridsense.com/auth/callback is accepted. Custom-scheme returns
        // with access or refresh tokens are deliberately ignored (BH-145/BH-119).
        void completeNativeCallback(event.url, { auth: supabase.auth }, (message) =>
          toast.error(`Sign in failed: ${message}`),
        )
          .then((outcome) => {
            if (outcome === 'signed-in') navigate(ROUTES.HOME);
            else if (outcome === 'not-auth') logger.warn('Ignoring unrecognised deep link');
          })
          .catch((error) => logger.error('Failed to complete sign-in from deep link', error));
      };

      const subscription = await App.addListener('appUrlOpen', handleDeepLink);
      cleanup = () => subscription.remove();

      try {
        const launchUrl = await App.getLaunchUrl();
        if (launchUrl?.url) handleDeepLink(launchUrl);
      } catch (error) {
        logger.debug('getLaunchUrl not available on this platform', { error });
      }
    };

    setup();
    return () => cleanup?.();
  }, [navigate]);

  return null;
}
