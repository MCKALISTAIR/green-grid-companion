import { useEffect, useState } from 'react';
import { SplashScreen as CapacitorSplashScreen } from '@capacitor/splash-screen';
import { onFirstContent } from '@/lib/firstContent';
import { Capacitor } from '@capacitor/core';

interface SplashScreenProps {
  onComplete?: () => void;
}

/** Longest the web splash may stay up, even if no data has arrived (motion spec §2.5). */
export const SPLASH_CAP_MS = 1200;
/** Crossfade out. Opacity only, so it is also the Reduce Motion behaviour. */
export const SPLASH_FADE_MS = 200;

/**
 * The useful static introduction lives in index.html, not a second splash. On web,
 * leave the product information in place over the app's loading states (onboarding
 * or a home loading skeleton). It is a static shell, not a fake gauge or a skeleton.
 * Native keeps the old first-content web splash after its custom native launch screen hides.
 */
export function SplashScreen({ onComplete }: SplashScreenProps) {
  const isNative = Capacitor.isNativePlatform();
  const [fading, setFading] = useState(false);
  const [gone, setGone] = useState(!isNative);

  useEffect(() => {
    void CapacitorSplashScreen.hide().catch(() => {
      /* web or already hidden */
    });

    // Onboarding has its own branded introduction and is already mounted behind the static shell.
    if (!isNative && localStorage.getItem('onboarding_complete') !== 'true') {
      onComplete?.();
      return;
    }

    let doneTimer: ReturnType<typeof setTimeout> | undefined;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      setFading(true);
      doneTimer = setTimeout(() => {
        setGone(true);
        onComplete?.();
      }, SPLASH_FADE_MS);
    };
    const cap = setTimeout(finish, SPLASH_CAP_MS);
    const off = onFirstContent(finish);
    return () => {
      off();
      clearTimeout(cap);
      if (doneTimer) clearTimeout(doneTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only: a new onComplete must not restart the splash.
  }, []);

  if (gone) return null;

  return (
    <div
      className={`gs-splash z-[100] ${fading ? 'pointer-events-none' : 'touch-none'}`}
      style={{ opacity: fading ? 0 : 1, transition: `opacity ${SPLASH_FADE_MS}ms ease-out` }}
      role="status"
      aria-label="Loading GridSense"
      data-testid="splash"
    >
      <img src="/icon-192.png" alt="" width={72} height={72} />
      <p>GridSense</p>
      <span className="gs-dot" aria-hidden="true" />
    </div>
  );
}
