import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getConsent, onConsentChange, setConsent } from '@/lib/consent';
import { overlayQueue } from '@/lib/overlayQueue';
import { useOverlayTurn } from '@/hooks/useOverlayQueue';
import { hasReadingShown, onReadingShown } from '@/lib/firstLaunch';
import { readTone } from '@/lib/tone';
import { CONSENT_COPY } from '@/lib/voice/consentCopy';
import { DIAGNOSTICS_DISCLOSURE } from '@/lib/monitoring';

// While no choice has been made, every other overlay (tips, tour, notification
// ask) waits. Set at load so nothing can sneak in before the sheet appears.
overlayQueue.setConsentPending(getConsent() === null);
onConsentChange((choice) => overlayQueue.setConsentPending(choice === null));

/** On home, wait for the number before asking; give up waiting after this long (errors, offline). */
const HOME_READING_WAIT_MS = 8000;
/** Elsewhere, a short pause so it doesn't flash on load. */
const SETTLE_MS = 600;
const SPACE_VAR = '--consent-sheet-space';
const BOTTOM_VAR = '--consent-sheet-bottom';

/** Distance from the viewport bottom to just above the visible tab bar (0 if there isn't one). */
function measureTabBar(): number {
  const nav = document.querySelector<HTMLElement>('[data-testid="bottom-nav"]');
  if (!nav) return 0;
  const rect = nav.getBoundingClientRect();
  if (rect.height === 0 || getComputedStyle(nav).visibility === 'hidden') return 0;
  return Math.max(0, window.innerHeight - rect.top);
}

/**
 * Privacy choice: a non-modal sheet docked above the tab bar. No scrim, no X,
 * no focus trap; the page stays usable. Choosing is the only way to close it.
 * Consent logic (src/lib/consent.ts) is unchanged from #38.
 */
export const CookieConsent = () => {
  const location = useLocation();
  const onOnboarding = location.pathname === '/onboarding';
  const onHome = location.pathname === '/';
  const [undecided, setUndecided] = useState(() => getConsent() === null);
  const [ready, setReady] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const sheetRef = useRef<HTMLElement>(null);
  const titleId = useId();
  const detailsId = useId();

  useEffect(() => onConsentChange((c) => setUndecided(c === null)), []);

  // First-launch order: onboarding -> the number appears -> this sheet -> tips.
  useEffect(() => {
    setReady(false);
    if (!undecided || onOnboarding) return;
    let settle: ReturnType<typeof setTimeout> | undefined;
    const go = () => {
      clearTimeout(settle);
      settle = setTimeout(() => setReady(true), onHome && hasReadingShown() ? 400 : 0);
    };
    if (onHome) {
      const stop = onReadingShown(go);
      const fallback = setTimeout(go, HOME_READING_WAIT_MS);
      return () => {
        stop();
        clearTimeout(fallback);
        clearTimeout(settle);
      };
    }
    settle = setTimeout(() => setReady(true), SETTLE_MS);
    return () => clearTimeout(settle);
  }, [undecided, onOnboarding, onHome]);

  const hasTurn = useOverlayTurn('consent', undecided && !onOnboarding && ready);
  const visible = hasTurn && undecided && !onOnboarding;

  // Dock above the tab bar and reserve the sheet's height at the end of the page.
  const place = useCallback(() => {
    const root = document.documentElement;
    const tabBar = measureTabBar();
    // No tab bar (desktop): sit just above the safe area instead.
    root.style.setProperty(
      BOTTOM_VAR,
      tabBar > 0 ? `${tabBar}px` : 'calc(4px + env(safe-area-inset-bottom))',
    );
    const h = sheetRef.current?.getBoundingClientRect().height ?? 0;
    root.style.setProperty(SPACE_VAR, `${Math.ceil(h)}px`);
  }, []);

  useLayoutEffect(() => {
    if (!visible) return;
    place();
    const ro = new ResizeObserver(place);
    if (sheetRef.current) ro.observe(sheetRef.current);
    const nav = document.querySelector('[data-testid="bottom-nav"]');
    if (nav) ro.observe(nav);
    window.addEventListener('resize', place);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', place);
      document.documentElement.style.removeProperty(SPACE_VAR);
      document.documentElement.style.removeProperty(BOTTOM_VAR);
    };
  }, [visible, place, location.pathname]);

  const choose = (choice: 'accepted' | 'declined') => {
    setConsent(choice);
  };

  if (!visible) return null;
  const title = CONSENT_COPY.title[readTone()];

  return (
    <section
      ref={sheetRef}
      role="region"
      aria-label={CONSENT_COPY.regionLabel}
      aria-describedby={titleId}
      data-testid="consent-sheet"
      className="consent-sheet"
    >
      <div className="consent-sheet__scroll">
        <h2 id={titleId} className="text-base font-bold leading-snug text-card-foreground">
          {title}
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-card-foreground">
          {CONSENT_COPY.crashClause} {CONSENT_COPY.body}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <Link
            to="/privacy"
            className="inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-2"
          >
            {CONSENT_COPY.privacyLink}
          </Link>
          <button
            type="button"
            className="inline-flex min-h-11 items-center gap-1 font-semibold text-primary underline underline-offset-2"
            aria-expanded={detailsOpen}
            aria-controls={detailsId}
            onClick={() => setDetailsOpen((o) => !o)}
          >
            {CONSENT_COPY.details}
            <ChevronDown
              className={cn(
                'h-4 w-4 transition-transform motion-reduce:transition-none',
                detailsOpen && 'rotate-180',
              )}
              aria-hidden="true"
            />
          </button>
        </div>
        {detailsOpen && (
          <div
            id={detailsId}
            className="mt-1 space-y-2 text-[13px] leading-relaxed text-muted-foreground"
            data-testid="consent-details"
          >
            {(['always', 'ifAccepted', 'never'] as const).map((group) => (
              <div key={group}>
                <h3 className="font-semibold text-card-foreground">
                  {CONSENT_COPY.detailsHeadings[group]}
                </h3>
                <ul className="mt-0.5 list-disc space-y-0.5 pl-5">
                  {DIAGNOSTICS_DISCLOSURE[group].map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
        <p className="mt-2 text-xs text-muted-foreground">{CONSENT_COPY.footnote}</p>
      </div>
      {/* Equal weight: same component, variant, size and width; only the label differs. */}
      <div className="consent-sheet__actions">
        <Button
          type="button"
          variant="outline"
          className="consent-sheet__button"
          onClick={() => choose('declined')}
        >
          {CONSENT_COPY.decline}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="consent-sheet__button"
          onClick={() => choose('accepted')}
        >
          {CONSENT_COPY.accept}
        </Button>
      </div>
    </section>
  );
};
