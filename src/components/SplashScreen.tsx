import { useEffect, useState } from 'react';
import { SplashScreen as CapacitorSplashScreen } from '@capacitor/splash-screen';
import { onFirstContent } from '@/lib/firstContent';

interface SplashScreenProps {
  onComplete?: () => void;
}

/** Longest the web splash may stay up, even if no data has arrived (motion spec §2.5). */
export const SPLASH_CAP_MS = 1200;
/** Crossfade out. Opacity only, so it is also the Reduce Motion behaviour. */
export const SPLASH_FADE_MS = 200;

/**
 * Web splash. No minimum display time: the native splash hands straight to this,
 * and it crossfades out as soon as the home screen has a number to show (fresh or
 * cached), or after SPLASH_CAP_MS at the latest. Same markup/styles as the inline
 * splash in index.html (`.gs-splash`), so the JS taking over is not a visible jump.
 */
export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [fading, setFading] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    CapacitorSplashScreen.hide().catch(() => {
      /* web or already hidden */
    });

    let doneTimer: ReturnType<typeof setTimeout> | undefined;
    let started = false;
    const finish = () => {
      if (started) return;
      started = true;
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
