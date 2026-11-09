import { appStorage } from '@/lib/appStorage';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, MapPin, Navigation } from 'lucide-react';
import { Geolocation as CapacitorGeolocation } from '@capacitor/geolocation';
import { NotificationType } from '@capacitor/haptics';
import { Button } from '@/components/ui/button';
import { ErrorActionButton, ErrorStateCard } from '@/components/errors/ErrorStateCard';
import { OUTSIDE_COPY, POSTCODE_COPY, toneBody } from '@/lib/voice/errorStatesCopy';
import { readTone } from '@/lib/tone';
import { isRoughlyInGreatBritain } from '@/lib/gbBounds';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { logger } from '@/lib/logger';
import { TurbineSpinner } from '@/components/ui/turbine-spinner';
import { OnboardingBackdrop } from '@/components/OnboardingBackdrop';
import { TurbineLogo } from '@/components/TurbineLogo';
import { postcodesIoReverseUrl } from '@/lib/coords';
import { checkPostcodeExists } from '@/lib/location';
import { useAppLocation } from '@/contexts/LocationContext';
import { useHaptics } from '@/hooks/useHaptics';
import { markFirstNumberPending } from '@/lib/firstLaunch';
import {
  NATIONAL_POSTCODE,
  offGridArea,
  type OffGridArea,
  isValidPostcode,
  toOutwardCode,
} from '@/lib/postcode';
import { ONBOARDING_COPY } from '@/lib/voice/onboardingCopy';

type Notice = {
  kind: 'denied' | 'deniedForever' | 'failed' | 'invalid' | 'notFound' | 'offGrid' | 'outside';
  area?: OffGridArea;
} | null;

const Onboarding = () => {
  const navigate = useNavigate();
  const { setPostcode: setAppPostcode } = useAppLocation();
  const { notification } = useHaptics();
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [manualPostcode, setManualPostcode] = useState('');
  const [isCheckingPostcode, setIsCheckingPostcode] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const completeOnboarding = () => {
    appStorage.setItem('onboarding_complete', 'true');
    markFirstNumberPending();
    // Do not record consent here: the (non-blocking) cookie banner asks on the
    // home screen, and optional diagnostics stay off until the user accepts.
    navigate('/');
  };

  const finishWithPostcode = (postcode: string) => {
    const area = offGridArea(postcode);
    if (area) {
      // Not on the GB grid (NI, Channel Islands, Isle of Man, BFPO): say so before
      // switching to the GB average, never show another region's figure.
      setNotice({ kind: 'offGrid', area });
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
      } else if (response.ok && !isRoughlyInGreatBritain(latitude, longitude)) {
        // Design state 3: outside GB (or a VPN). Inside the box with no match is a plain failure.
        setNotice({ kind: 'outside' });
        void notification(NotificationType.Error);
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
    if (!isValidPostcode(value) && !offGridArea(value)) {
      setNotice({ kind: 'invalid' });
      void notification(NotificationType.Error);
      return;
    }
    setNotice(null);
    // Off-grid areas (GY/JE/IM/BFPO/BT) skip the lookup and get the off-grid notice.
    if (offGridArea(value)) {
      finishWithPostcode(value);
      return;
    }
    setIsCheckingPostcode(true);
    void checkPostcodeExists(value)
      .then((result) => {
        // 'unknown' (offline, postcodes.io down): don't block; Home flags it if NESO can't place it.
        if (result === 'missing') {
          setNotice({ kind: 'notFound' });
          void notification(NotificationType.Error);
          inputRef.current?.focus();
          return;
        }
        finishWithPostcode(value);
      })
      .finally(() => setIsCheckingPostcode(false));
  };

  const c = ONBOARDING_COPY;

  return (
    <div className="dark relative min-h-screen min-h-[100dvh] w-full flex items-center justify-center px-4 py-[max(env(safe-area-inset-top),1rem)] overflow-hidden bg-slate-950">
      <OnboardingBackdrop />
      <Card className="w-full max-w-md shadow-2xl border-white/10 bg-slate-900/75 dark:bg-slate-950/75 backdrop-blur-md text-white overflow-hidden">
        <CardContent className="p-5 sm:p-6 space-y-4">
          <div className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 text-emerald-400" aria-hidden="true">
              <TurbineLogo className="w-full h-full" />
            </div>
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-emerald-400/90">
              GridSense
            </p>
            <h1 className="text-2xl font-display font-semibold text-white tracking-tight leading-tight">
              {c.title}
            </h1>
            <p className="text-sm text-white/75 leading-relaxed">{c.body}</p>
          </div>

          <Button
            size="lg"
            haptic
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

          <div className="flex items-center gap-3 text-xs text-white/60" aria-hidden="true">
            <span className="h-px flex-1 bg-white/15" />
            or enter a postcode
            <span className="h-px flex-1 bg-white/15" />
          </div>

          <div id="onboarding-postcode-notice" aria-live="polite" className="empty:hidden">
            {notice?.kind === 'outside' && (
              <div className="space-y-2 text-left">
                <ErrorStateCard
                  testId="outside-gb"
                  tint="blue"
                  icon={MapPin}
                  title={OUTSIDE_COPY.title}
                  body={toneBody(OUTSIDE_COPY.body, readTone())}
                  actions={[
                    {
                      label: OUTSIDE_COPY.enterPostcode,
                      onClick: () => inputRef.current?.focus(),
                    },
                    { label: OUTSIDE_COPY.useAverage, onClick: showNational, kind: 'secondary' },
                  ]}
                />
                <p className="px-1 text-xs text-white/75">{OUTSIDE_COPY.niNote}</p>
              </div>
            )}
            {notice?.kind === 'notFound' && (
              <div role="alert" className="space-y-2 text-center" data-testid="postcode-not-found">
                <p className="text-sm font-semibold text-[#ffb4a8]">
                  {POSTCODE_COPY.notFound(toOutwardCode(manualPostcode).toUpperCase())}
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  <ErrorActionButton
                    label={POSTCODE_COPY.tryAgain}
                    onClick={() => {
                      inputRef.current?.focus();
                      inputRef.current?.select();
                    }}
                  />
                  <ErrorActionButton
                    kind="secondary"
                    label={POSTCODE_COPY.useAverage}
                    onClick={showNational}
                  />
                </div>
              </div>
            )}
            {notice && !['offGrid', 'outside', 'notFound'].includes(notice.kind) && (
              <p
                className="text-sm text-white/85 text-center"
                role={notice.kind === 'invalid' ? 'alert' : undefined}
              >
                {notice.kind === 'invalid'
                  ? c.invalid
                  : notice.kind === 'failed'
                    ? c.failed
                    : c.denied}
                {notice.kind === 'deniedForever' && <> {c.deniedForever}</>}
              </p>
            )}
            {notice?.kind === 'offGrid' && notice.area && (
              <div className="rounded-xl bg-white/10 p-3 space-y-2 text-center">
                <p className="text-sm text-white/90">{c[notice.area]}</p>
                <Button size="sm" variant="secondary" onClick={showNational}>
                  {c.offGridCta}
                </Button>
              </div>
            )}
          </div>

          <form onSubmit={handleManualSubmit} className="flex gap-2" noValidate>
            <label htmlFor="onboarding-postcode" className="sr-only">
              Postcode
            </label>
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
              aria-invalid={notice?.kind === 'invalid' || notice?.kind === 'notFound' || undefined}
              aria-describedby={notice ? 'onboarding-postcode-notice' : undefined}
            />
            <Button
              type="submit"
              haptic
              variant="secondary"
              size="lg"
              disabled={!manualPostcode.trim() || isCheckingPostcode}
              className="h-11 min-w-11 px-4 text-foreground"
              aria-label={isCheckingPostcode ? c.checking : c.submitLabel}
            >
              {isCheckingPostcode ? (
                <TurbineSpinner size="sm" />
              ) : (
                <ArrowRight className="w-5 h-5" strokeWidth={2.5} aria-hidden="true" />
              )}
            </Button>
          </form>

          <p className="-mt-2 text-xs text-white/65 text-center">{c.keepNote}</p>

          <button
            type="button"
            onClick={showNational}
            className="w-full min-h-11 rounded-md text-sm font-medium text-white/80 underline underline-offset-4 decoration-white/30 hover:decoration-white hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {c.skip}
          </button>
        </CardContent>
        <CardFooter className="justify-center py-4 bg-white/5 border-t border-white/5 text-xs text-white/60 text-center">
          <p className="leading-relaxed">
            By continuing you agree to the{' '}
            <a
              href="/terms"
              className="relative underline underline-offset-2 hover:text-white/95 transition-colors after:absolute after:-inset-x-2 after:-inset-y-3 after:content-['']"
            >
              Terms
            </a>{' '}
            and have read the{' '}
            <a
              href="/privacy"
              className="relative underline underline-offset-2 hover:text-white/95 transition-colors after:absolute after:-inset-x-2 after:-inset-y-3 after:content-['']"
            >
              Privacy Policy
            </a>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Onboarding;
