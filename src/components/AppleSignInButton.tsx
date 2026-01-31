import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { SignInWithApple, SignInWithAppleResponse } from '@capacitor-community/apple-sign-in';
import { lovable } from '@/integrations/lovable';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const isNativeIOS = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';

export const AppleSignInButton = () => {
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const handleAppleSignIn = async () => {
        setIsLoading(true);

        try {
            if (isNativeIOS()) {
                // Native iOS Sign in with Apple
                console.log('Starting native Apple Sign In...');

                const options = {
                    clientId: 'app.lovable.1558020f8a4c43dc9ea079533f5d485c.web',
                    redirectURI: 'https://gridsense-app.lovable.app/auth/callback',
                    scopes: 'email name',
                    state: Math.random().toString(36).substring(2),
                    nonce: Math.random().toString(36).substring(2)
                };

                const result: SignInWithAppleResponse = await SignInWithApple.authorize(options);

                console.log('Apple Sign In successful:', {
                    user: result.response.user,
                    email: result.response.email,
                    givenName: result.response.givenName,
                    familyName: result.response.familyName
                });

                toast({
                    title: 'Success',
                    description: 'Signed in with Apple successfully!',
                });

                // TODO: Send result.response.identityToken to backend
                // to complete authentication with Supabase

            } else {
                // Web-based OAuth flow via Lovable
                console.log('Starting web Apple Sign In...');

                const result = await lovable.auth.signInWithOAuth('apple', {
                    redirect_uri: 'https://gridsense-app.lovable.app/auth/callback'
                });

                if (result.error) {
                    throw result.error;
                }

                if (!result.redirected) {
                    toast({
                        title: 'Success',
                        description: 'Signed in with Apple successfully!',
                    });
                }
            }
        } catch (error) {
            console.error('Apple Sign In Error:', error);

            toast({
                variant: 'destructive',
                title: 'Sign In Failed',
                description: error instanceof Error ? error.message : 'Could not sign in with Apple. Please try again.',
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Button
            onClick={handleAppleSignIn}
            disabled={isLoading}
            className="w-full bg-black text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
            variant="outline"
        >
            <svg
                className="mr-2 h-5 w-5"
                viewBox="0 0 24 24"
                fill="currentColor"
            >
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
            </svg>
            {isLoading ? 'Signing in...' : 'Sign in with Apple'}
        </Button>
    );
};
