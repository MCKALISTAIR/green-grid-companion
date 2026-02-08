import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { logger } from '@/lib/logger';
import { APP_SCHEME } from '@/config';

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

                    if (url.pathname.startsWith('/auth/callback')) {
                        const path = url.pathname + url.search;
                        logger.info('Navigating to deep link path:', { path });
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
            } catch {
                // getLaunchUrl can fail on some platforms — safe to ignore
            }
        };

        setup();

        return () => cleanup?.();
    }, [navigate]);

    return null;
}
