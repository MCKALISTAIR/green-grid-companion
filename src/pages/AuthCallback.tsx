import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

export default function AuthCallback() {
    const navigate = useNavigate();

    useEffect(() => {
        // The Lovable auth wrapper handles setting the session.
        // We just need to wait a brief moment to ensure the state is updated
        // and then redirect the user.
        const handleAuthCallback = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();

                if (error) {
                    logger.error('Error checking session in auth callback', error);
                    // Still redirect to home, maybe they are logged in or can try again
                    navigate("/");
                    return;
                }

                if (session) {
                    logger.info('User authenticated successfully, redirecting');
                    navigate("/");
                } else {
                    logger.warn('No session found in auth callback, redirecting to home');
                    navigate("/");
                }
            } catch (e) {
                logger.error('Unexpected error in auth callback', e);
                navigate("/");
            }
        };

        handleAuthCallback();
    }, [navigate]);

    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="text-muted-foreground">Completing sign in...</p>
            </div>
        </div>
    );
}
