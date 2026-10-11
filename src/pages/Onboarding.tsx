import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Navigation } from 'lucide-react';
import { Geolocation as CapacitorGeolocation } from '@capacitor/geolocation';
import { NotificationType } from '@capacitor/haptics';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { logger } from '@/lib/logger';
import { TurbineSpinner } from '@/components/ui/turbine-spinner';
import { IntensityScene } from '@/components/IntensityScene';
import { TurbineLogo } from '@/components/TurbineLogo';
import { postcodesIoReverseUrl } from '@/lib/coords';
import { useAppLocation } from '@/contexts/LocationContext';
import { useHaptics } from '@/hooks/useHaptics';
import { markFirstNumberPending } from '@/lib/firstLaunch';
import {
    NATIONAL_POSTCODE,
    isNorthernIrelandPostcode,
    isValidPostcode,
    toOutwardCode,
} from '@/lib/postcode';
import { ONBOARDING_COPY } from '@/lib/voice/onboardingCopy';

type Notice = { kind: 'denied' | 'deniedForever' | 'failed' | 'invalid' | 'northernIreland' } | null;

// Neutral scene while we don't know the grid yet: no band, no celebrations.
const NEUTRAL_SCENE = {
    intensity: 150,
    index: 'moderate' as const,
    sceneTypeOverride: 'countryside' as const,
    timeOfDayOverride: 'dusk' as const,
    weatherOverride: { condition: 'clear' as const, windSpeed: 6 },
};

const Onboarding = () => {
    const navigate = useNavigate();
    const { setPostcode: setAppPostcode } = useAppLocation();
    const { notification } = useHaptics();
    const [isLoadingLocation, setIsLoadingLocation] = useState(false);
    const [manualPostcode, setManualPostcode] = useState('');
    const [notice, setNotice] = useState<Notice>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const completeOnboarding = () => {
        localStorage.setItem('onboarding_complete', 'true');
        markFirstNumberPending();
        // Do not record consent here: the (non-blocking) cookie banner asks on the
        // home screen, and optional diagnostics stay off until the user accepts.
        navigate('/');
    };

    const finishWithPostcode = (postcode: string) => {
        if (isNorthernIrelandPostcode(postcode)) {
            // Say so before switching to the GB average, rather than in a toast that vanishes.
            setNotice({ kind: 'northernIreland' });
            return;
        }
        setAppPostcode(toOutwardCode(postcode));
        completeOnboarding();
    };

    const showNational = () => {
        setAppPostcode(NATIONAL_POSTCODE);
        completeOnboarding();
    };

    const fail = (kind: 'denied' | 'deniedForever' | 'failed') => {
        setNotice({ kind });
        void notification(NotificationType.Error);
        // Hand over to the postcode field.
        setTimeout(() => inputRef.current?.focus(), 50);
    };

    const handleEnableLocation = async () => {
        setNotice(null);
        setIsLoadingLocation(true);

        try {
            let status: string | undefined;
            try {
                status = (await CapacitorGeolocation.checkPermissions()).location;
            } catch {
                status = undefined; // Permissions API missing (some browsers): just try.
            }

            if (status === 'denied') {
                // iOS won't show the prompt again once denied.
                fail('deniedForever');
                return;
            }
            if (status === 'prompt' || status === 'prompt-with-rationale') {
                try {
                    const request = await CapacitorGeolocation.requestPermissions();
                    if (request.location === 'denied') {
                        fail('denied');
                        return;
                    }
                } catch {
                    // Web: requestPermissions isn't implemented; getCurrentPosition prompts instead.
                }
            }

            const position = await CapacitorGeolocation.getCurrentPosition({ timeout: 10000 });
            const { latitude, longitude } = position.coords;

            // Only 2-dp coordinates leave the device (src/lib/coords.ts).
            const response = await fetch(postcodesIoReverseUrl(latitude, longitude));
            const data = await response.json();

            if (data.status === 200 && data.result && data.result.length > 0) {
                finishWithPostcode(data.result[0].outcode as string);
            } else {
                throw new Error('Could not determine postcode from location');
            }
        } catch (error) {
            logger.error('Onboarding geolocation failed', { error });
            const message = error instanceof Error ? error.message.toLowerCase() : '';
            fail(message.includes('denied') || message.includes('permission') ? 'denied' : 'failed');
        } finally {
            setIsLoadingLocation(false);
        }
    };

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const value = manualPostcode.trim();
        if (!value) return;
        if (!isValidPostcode(value)) {
            setNotice({ kind: 'invalid' });
            void notification(NotificationType.Error);
            return;
        }
        setNotice(null);
        finishWithPostcode(value);
    };

    const c = ONBOARDING_COPY;

    return (
        <div className="dark relative min-h-screen min-h-[100dvh] w-full flex items-center justify-center px-4 py-[max(env(safe-area-inset-top),1rem)] overflow-hidden bg-slate-950">
            <div className="absolute inset-0 w-full h-full -z-10 opacity-70 pointer-events-none select-none" aria-hidden="true">
                <IntensityScene
                    intensity={NEUTRAL_SCENE.intensity}
                    index={NEUTRAL_SCENE.index}
                    sceneTypeOverride={NEUTRAL_SCENE.sceneTypeOverride}
                    timeOfDayOverride={NEUTRAL_SCENE.timeOfDayOverride}
                    weatherOverride={NEUTRAL_SCENE.weatherOverride}
                    hasLiveReading={false}
                    className="w-full h-full scale-105"
                    style={{ height: '100%' }}
                />
            </div>
            <Card className="w-full max-w-md shadow-2xl border-white/10 bg-slate-900/70 dark:bg-slate-950/70 backdrop-blur-xl text-white overflow-hidden">
                <CardContent className="p-5 sm:p-6 space-y-4">
                    <div className="text-center space-y-2">
                        <div className="mx-auto w-12 h-12 text-emerald-400" aria-hidden="true">
                            <TurbineLogo className="w-full h-full" />
                        </div>
                        <p className="text-xs font-semibold tracking-[0.2em] uppercase text-emerald-400/90">GridSense</p>
                        <h1 className="text-2xl font-display font-semibold text-white tracking-tight leading-tight">{c.title}</h1>
                        <p className="text-sm text-white/75 leading-relaxed">{c.body}</p>
                    </div>

                    <Button
                        size="lg"
                        className="w-full font-semibold"
                        onClick={handleEnableLocation}
                        disabled={isLoadingLocation}
                    >
                        {isLoadingLocation ? (
                            <>
                                <TurbineSpinner size="sm" className="mr-2" />
                                {c.finding}
                            </>
                        ) : (
                            <>
                                <Navigation className="w-4 h-4 mr-2" aria-hidden="true" />
                                {c.useLocation}
                            </>
                        )}
                    </Button>

                    <div aria-live="polite" className="empty:hidden">
                        {notice && notice.kind !== 'northernIreland' && (
                            <p className="text-sm text-white/85 text-center" role={notice.kind === 'invalid' ? 'alert' : undefined}>
                                {notice.kind === 'invalid' ? c.invalid : notice.kind === 'failed' ? c.failed : c.denied}
                                {notice.kind === 'deniedForever' && <> {c.deniedForever}</>}
                            </p>
                        )}
                        {notice?.kind === 'northernIreland' && (
                            <div className="rounded-xl bg-white/10 p-3 space-y-2 text-center">
                                <p className="text-sm text-white/90">{c.northernIreland}</p>
                                <Button size="sm" variant="secondary" onClick={showNational}>
                                    {c.northernIrelandCta}
                                </Button>
                            </div>
                        )}
                    </div>

                    <form onSubmit={handleManualSubmit} className="flex gap-2" noValidate>
                        <label htmlFor="onboarding-postcode" className="sr-only">Postcode</label>
                        <Input
                            id="onboarding-postcode"
                            ref={inputRef}
                            placeholder={c.placeholder}
                            value={manualPostcode}
                            onChange={(e) => setManualPostcode(e.target.value)}
                            autoComplete="postal-code"
                            autoCapitalize="characters"
                            enterKeyHint="go"
                            className="bg-background/50 h-11"
                            aria-invalid={notice?.kind === 'invalid' || undefined}
                        />
                        <Button
                            type="submit"
                            variant="secondary"
                            size="lg"
                            disabled={!manualPostcode.trim()}
                            className="px-4 h-11"
                            aria-label={c.submitLabel}
                        >
                            <ArrowRight className="w-4 h-4" aria-hidden="true" />
                        </Button>
                    </form>

                    <p className="text-xs text-white/65 text-center">
                        {c.keepNote}{' '}
                        <a href="/privacy" className="underline hover:text-white/95 transition-colors">
                            Privacy Policy
                        </a>
                    </p>

                    <button
                        type="button"
                        onClick={showNational}
                        className="w-full min-h-11 text-sm font-medium text-white/80 underline-offset-4 hover:underline hover:text-white transition-colors"
                    >
                        {c.skip}
                    </button>
                </CardContent>
                <CardFooter className="justify-center py-3 bg-white/5 border-t border-white/5 text-xs text-white/60 text-center">
                    <p>
                        By continuing you agree to the{' '}
                        <a href="/terms" className="underline hover:text-white/95 transition-colors">
                            Terms
                        </a>{' '}
                        and have read the{' '}
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
