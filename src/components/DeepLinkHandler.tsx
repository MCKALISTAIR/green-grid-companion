import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { App } from '@capacitor/app';
import { logger } from '@/lib/logger';

export function DeepLinkHandler() {
    const navigate = useNavigate();

    useEffect(() => {
        const handleDeepLink = async (event: { url: string }) => {
            logger.info('Deep link received:', { url: event.url });

            try {
                const url = new URL(event.url);

                // Handle custom scheme "GridSense://"
                // If the URL is something like GridSense://auth/callback?code=...
                // We want to extract the pathname and search params

                if (url.pathname.startsWith('/auth/callback')) {
                    // Construct the path with query params
                    const path = url.pathname + url.search;
                    logger.info('Navigating to deep link path:', { path });
                    navigate(path);
                }
            } catch (error) {
                logger.error('Failed to parse deep link URL', error);
            }
        };

        const subscription = App.addListener('appUrlOpen', handleDeepLink);

        // Check if app was opened with a URL (cold start)
        App.getLaunchUrl().then((launchUrl) => {
            if (launchUrl) {
                handleDeepLink(launchUrl);
            }
        });

        return () => {
            subscription.then(handle => handle.remove());
        };
    }, [navigate]);

    return null;
}
