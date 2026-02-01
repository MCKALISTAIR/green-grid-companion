import { useEffect, useState } from 'react';
import { SplashScreen as CapacitorSplashScreen } from '@capacitor/splash-screen';
import { TurbineLogo } from './TurbineLogo';

interface SplashScreenProps {
    onComplete?: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
    const [isVisible, setIsVisible] = useState(true);
    const [opacity, setOpacity] = useState(1);

    useEffect(() => {
        // Hide native splash screen immediately when this component mounts
        const hideNativeSplash = async () => {
            try {
                await CapacitorSplashScreen.hide();
            } catch (e) {
                console.error('Error hiding splash screen', e);
            }
        };

        hideNativeSplash();

        // Minimum display time for splash to prevent flashing
        const timer = setTimeout(() => {
            setOpacity(0);
            setTimeout(() => {
                setIsVisible(false);
                onComplete?.();
            }, 500); // Fade out duration
        }, 2000); // Show for at least 2 seconds

        return () => clearTimeout(timer);
    }, [onComplete]);

    if (!isVisible) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background touch-none transition-opacity duration-500"
            style={{ opacity }}
        >
            <div className="flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-500">
                <div className="text-primary w-32 h-32 relative">
                    <TurbineLogo className="w-full h-full text-emerald-500" />
                </div>

                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground font-sans">
                        GridSense
                    </h1>
                    <p className="text-xs text-muted-foreground tracking-widest uppercase">
                        Powering a Greener Future
                    </p>
                </div>
            </div>

            <div className="absolute bottom-12 text-[10px] text-muted-foreground/40 font-mono">
                v{import.meta.env.PACKAGE_VERSION || '1.0.0'}
            </div>
        </div>
    );
}
