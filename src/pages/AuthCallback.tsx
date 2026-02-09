import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

/**
 * Handles OAuth callback by extracting tokens from the URL.
 * 
 * The broker redirects back with tokens in either:
 * - Hash fragment: #access_token=...&refresh_token=...
 * - Query params: ?access_token=...&refresh_token=...
 * - Or via DeepLinkHandler which passes them as query params
 */
export default function AuthCallback() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    useEffect(() => {
        const handleAuthCallback = async () => {
            try {
                // Try to extract tokens from hash fragment first (standard OAuth redirect)
                const hash = window.location.hash.substring(1);
                const hashParams = new URLSearchParams(hash);

                // Check hash fragment, then query params
                const accessToken = hashParams.get('access_token') || searchParams.get('access_token');
                const refreshToken = hashParams.get('refresh_token') || searchParams.get('refresh_token');

                if (accessToken && refreshToken) {
                    logger.info('Found tokens in callback URL, setting session');
                    const { error } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken,
                    });

                    if (error) {
                        logger.error('Failed to set session from callback tokens', { message: error.message });
                        navigate("/");
                        return;
                    }

                    logger.info('Session set successfully from callback tokens');
                    navigate("/");
                    return;
                }

                // Fallback: check if session already exists (e.g. web flow where broker set it)
                const { data: { session }, error } = await supabase.auth.getSession();

                if (error) {
                    logger.error('Error checking session in auth callback', { message: error.message });
                }

                if (session) {
                    logger.info('Existing session found, redirecting');
                } else {
                    logger.warn('No session or tokens found in auth callback');
                }

                navigate("/");
            } catch (e) {
                logger.error('Unexpected error in auth callback', e);
                navigate("/");
            }
        };

        handleAuthCallback();
    }, [navigate, searchParams]);

    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="text-muted-foreground">Completing sign in...</p>
            </div>
        </div>
    );
}
