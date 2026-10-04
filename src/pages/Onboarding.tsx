import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Navigation, ArrowRight, Zap } from 'lucide-react';
import { Geolocation as CapacitorGeolocation } from '@capacitor/geolocation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import { TurbineSpinner } from '@/components/ui/turbine-spinner';
import { IntensityScene } from '@/components/IntensityScene';
import { TurbineLogo } from '@/components/TurbineLogo';
import { useAppLocation } from '@/contexts/LocationContext';
import { motion, AnimatePresence } from 'framer-motion';

type OnboardingStep = 'welcome' | 'location';

const Onboarding = () => {
    const navigate = useNavigate();
    const { setPostcode: setAppPostcode } = useAppLocation();
    const [step, setStep] = useState<OnboardingStep>('welcome');
    const [isLoadingLocation, setIsLoadingLocation] = useState(false);
    const [manualPostcode, setManualPostcode] = useState('');

    const sceneProps =
        step === 'welcome'
            ? {
                intensity: 30,
                index: 'very low' as const,
                sceneTypeOverride: 'countryside' as const,
                timeOfDayOverride: 'midday' as const,
                weatherOverride: { condition: 'clear' as const, windSpeed: 8 },
            }
            : {
                intensity: 180,
                index: 'moderate' as const,
                sceneTypeOverride: 'city' as const,
                timeOfDayOverride: 'midday' as const,
                weatherOverride: { condition: 'clear' as const, windSpeed: 4 },
            };

    const finishWithPostcode = (postcode: string) => {
        setAppPostcode(postcode);
        if (postcode.toUpperCase().startsWith('BT')) {
            toast.warning('Northern Ireland grid data is not supported. GB National average will be shown.', {
                duration: 6000,
            });
        } else {
            toast.success(`Location set to ${postcode}`);
        }
        completeOnboarding();
    };

    const handleEnableLocation = async () => {
        setIsLoadingLocation(true);

        try {
            const permissionStatus = await CapacitorGeolocation.checkPermissions();

            if (permissionStatus.location === 'denied') {
                const request = await CapacitorGeolocation.requestPermissions();
                if (request.location === 'denied') {
                    toast.error('Location permission denied. Please enter postcode manually.');
                    setIsLoadingLocation(false);
                    return;
                }
            }

            const position = await CapacitorGeolocation.getCurrentPosition();
            const { latitude, longitude } = position.coords;

            const response = await fetch(`https://api.postcodes.io/postcodes?lon=${longitude}&lat=${latitude}`);
            const data = await response.json();

            if (data.status === 200 && data.result && data.result.length > 0) {
                const postcode = data.result[0].outcode as string;
                finishWithPostcode(postcode);
            } else {
                throw new Error('Could not determine postcode from location');
            }
        } catch (error) {
            logger.error('Onboarding geolocation failed', { error });
            let errorMessage = 'Failed to get location.';
            if (error instanceof Error && error.message.includes('denied')) {
                errorMessage = 'Location permission denied. Please enter postcode manually.';
            }
            toast.error(errorMessage);
        } finally {
            setIsLoadingLocation(false);
        }
    };

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualPostcode.trim()) return;

        const cleanPostcode = manualPostcode.trim().toUpperCase();
        const POSTCODE_REGEX = /^([A-Z]{1,2}\d[A-Z\d]?)(\s*\d[A-Z]{2})?$/i;

        if (!POSTCODE_REGEX.test(cleanPostcode)) {
            toast.error('Please enter a valid UK postcode (e.g., SW1A 1AA or SW1A)');
            return;
        }

        finishWithPostcode(cleanPostcode);
    };

    const completeOnboarding = () => {
        localStorage.setItem('onboarding_complete', 'true');
        // Essential storage only — treat continuing setup as consent so home is not blocked.
        if (!localStorage.getItem('cookie-consent')) {
            localStorage.setItem('cookie-consent', 'accepted');
        }
        navigate('/');
    };

    const renderWelcomeStep = () => (
        <div className="space-y-6 text-center">
            <div className="mx-auto w-20 h-20 text-emerald-400">
                <TurbineLogo className="w-full h-full" />
            </div>
            <div className="space-y-2">
                <p className="text-sm font-semibold tracking-[0.2em] uppercase text-emerald-400/90">GridSense</p>
                <h2 className="text-2xl font-display font-semibold text-white tracking-tight">
                    Know when to use energy
                </h2>
                <p className="text-sm text-white/70 leading-relaxed max-w-sm mx-auto">
                    See how clean the UK grid is right now — and whether to use power now or wait for a greener window.
                </p>
            </div>

            <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                <Button className="w-full" size="lg" onClick={() => setStep('location')}>
                    Find my grid
                    <Zap className="w-4 h-4 ml-2" />
                </Button>
            </motion.div>
        </div>
    );

    const renderLocationStep = () => (
        <div className="space-y-4">
            <div className="text-center space-y-2 mb-6">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                    <MapPin className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">Where are you?</h3>
                <p className="text-sm text-muted-foreground">We need your location to find the nearest grid region.</p>
            </div>

            <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                <Button
                    size="lg"
                    className="w-full font-semibold relative overflow-hidden group"
                    onClick={handleEnableLocation}
                    disabled={isLoadingLocation}
                >
                    {isLoadingLocation ? (
                        <>
                            <TurbineSpinner size="sm" className="mr-2" />
                            Finding you...
                        </>
                    ) : (
                        <>
                            <Navigation className="w-4 h-4 mr-2 group-hover:rotate-12 transition-transform duration-200" />
                            Use Current Location
                        </>
                    )}
                </Button>
            </motion.div>

            <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-muted" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-transparent px-2 text-muted-foreground">Or</span>
                </div>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-2">
                <div className="flex gap-2">
                    <Input
                        placeholder="Enter Postcode (e.g. SW1)"
                        value={manualPostcode}
                        onChange={(e) => setManualPostcode(e.target.value)}
                        className="bg-background/50 h-11"
                    />
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button type="submit" variant="secondary" size="lg" disabled={!manualPostcode.trim()} className="px-4 h-11">
                            <ArrowRight className="w-4 h-4" />
                        </Button>
                    </motion.div>
                </div>
            </form>

            <button
                type="button"
                onClick={() => setStep('welcome')}
                className="w-full text-xs text-white/50 hover:text-white/80 transition-colors pt-1"
            >
                Back
            </button>
        </div>
    );

    return (
        <div className="dark relative min-h-screen min-h-[100dvh] w-full flex items-center justify-center p-4 overflow-hidden bg-slate-950">
            <div className="absolute inset-0 w-full h-full -z-10 opacity-70 pointer-events-none select-none">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={sceneProps.sceneTypeOverride + '-' + sceneProps.timeOfDayOverride}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.0, ease: 'easeInOut' }}
                        className="w-full h-full"
                    >
                        <IntensityScene
                            intensity={sceneProps.intensity}
                            index={sceneProps.index}
                            sceneTypeOverride={sceneProps.sceneTypeOverride}
                            timeOfDayOverride={sceneProps.timeOfDayOverride}
                            weatherOverride={sceneProps.weatherOverride}
                            className="w-full h-full scale-105"
                            style={{ height: '100%' }}
                        />
                    </motion.div>
                </AnimatePresence>
            </div>
            <Card className="w-full max-w-md shadow-2xl border-white/10 bg-slate-900/60 dark:bg-slate-950/60 backdrop-blur-xl text-white overflow-hidden">
                <CardContent className="p-6 min-h-[360px] flex flex-col justify-center">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={step}
                            initial={{ opacity: 0, scale: 0.94, y: 15 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.94, y: -15 }}
                            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                            className="w-full"
                        >
                            {step === 'welcome' && renderWelcomeStep()}
                            {step === 'location' && renderLocationStep()}
                        </motion.div>
                    </AnimatePresence>
                </CardContent>
                <CardFooter className="justify-center py-4 bg-white/5 border-t border-white/5 text-xs text-white/60">
                    <p>
                        By continuing, you agree to our{' '}
                        <a href="/privacy" className="underline hover:text-white/95 transition-colors">
                            Privacy Policy
                        </a>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
};

export default Onboarding;
