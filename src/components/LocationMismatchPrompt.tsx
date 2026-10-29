import { useState, useEffect } from 'react';
import { MapPin, Navigation, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { resolvePostcode, getDistance, getRegionFromCoordinates } from '@/lib/location';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { logger } from '@/lib/logger';
import { isNationalMode } from '@/lib/postcode';
import { appStorage } from '@/lib/appStorage';
import { useOverlayTurn } from '@/hooks/useOverlayQueue';
import { LocationManager } from '@/components/LocationManager';

/** Set once a National-mode user dismisses (or acts on) the "your area" opt-in. */
export const NATIONAL_OPT_IN_DISMISSED_KEY = 'gridsense-national-optin-dismissed';
/** Wait after load before offering anything, so the reading lands first. */
export const PROMPT_DELAY_MS = 3000;

export const LOCATION_PROMPT_COPY = {
  mismatchTitle: 'New location?',
  // Design-final (same for Cheeky and Plain tones).
  optInTitle: 'Showing the GB average',
  optInAction: 'Use my area',
  optInActionLabel: 'Set your region for local figures',
  optInDismiss: 'Not now',
} as const;

/** Above the tab bar (and its safe area) on phones/tablets; no tab bar from lg. */
const PLACEMENT =
  'fixed left-4 right-4 z-50 bottom-[calc(var(--bottom-content-inset)-0.5rem)] md:left-auto md:right-8 md:w-96 lg:bottom-8';

interface LocationMismatchPromptProps {
  currentPostcode: string;
  onUpdate: (newPostcode: string) => void;
}

export function LocationMismatchPrompt({ currentPostcode, onUpdate }: LocationMismatchPromptProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [detectedRegion, setDetectedRegion] = useState<{ name: string; postcode: string } | null>(
    null,
  );
  const [hasChecked, setHasChecked] = useState(false);
  const national = isNationalMode(currentPostcode);
  const [optInDue, setOptInDue] = useState(false);
  const [optInDismissed, setOptInDismissed] = useState(
    () => appStorage.getItem(NATIONAL_OPT_IN_DISMISSED_KEY) === '1',
  );

  // National was picked on purpose: never ask for GPS or say "it looks like
  // you're in…"; at most offer one gentle, dismissible opt-in.
  useEffect(() => {
    if (!national || optInDismissed) {
      setOptInDue(false);
      return;
    }
    const timer = setTimeout(() => setOptInDue(true), PROMPT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [national, optInDismissed]);

  const dismissOptIn = () => {
    appStorage.setItem(NATIONAL_OPT_IN_DISMISSED_KEY, '1');
    setOptInDismissed(true);
  };

  const showOptIn = national && optInDue && !optInDismissed;
  const wantsMismatch = !national && isVisible && !!detectedRegion;
  const hasTurn = useOverlayTurn('location', showOptIn || wantsMismatch);

  useEffect(() => {
    // Don't check if we've already checked this session, if no postcode is set,
    // or if the user chose National.
    if (hasChecked || !currentPostcode || national) return;

    async function checkLocation() {
      try {
        // 1. Get current device location
        let lat, lon;

        if (Capacitor.isNativePlatform()) {
          const pos = await Geolocation.getCurrentPosition({ timeout: 5000 });
          lat = pos.coords.latitude;
          lon = pos.coords.longitude;
        } else if ('geolocation' in navigator) {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
          });
          lat = pos.coords.latitude;
          lon = pos.coords.longitude;
        } else {
          return; // No geolocation available
        }

        // 2. Resolve current postcode to coords
        const currentCoords = await resolvePostcode(currentPostcode);
        if (!currentCoords) return;

        // 3. Calculate distance
        const dist = getDistance(lat, lon, currentCoords.lat, currentCoords.lon);

        // 4. If distance > 20km, suggest switch
        if (dist > 20) {
          logger.info(
            `Location mismatch detected (${dist.toFixed(1)}km). checking for local region...`,
          );
          const localRegion = await getRegionFromCoordinates(lat, lon);

          if (localRegion && localRegion.regionPostcode !== currentPostcode) {
            setDetectedRegion({
              name: localRegion.regionName,
              postcode: localRegion.regionPostcode,
            });
            setIsVisible(true);
          }
        }
      } catch (error) {
        logger.debug('Failed to check location mismatch', { error });
      } finally {
        setHasChecked(true);
      }
    }

    // Small delay to let app load first
    const timer = setTimeout(checkLocation, PROMPT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [currentPostcode, hasChecked, national]);

  if (!hasTurn) return null;

  if (showOptIn) {
    return (
      <div className={PLACEMENT} data-testid="national-optin-prompt">
        <Card className="p-4 shadow-xl border-primary/20 bg-background/95 backdrop-blur-md">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-full shrink-0">
              <MapPin className="w-5 h-5 text-primary" aria-hidden="true" />
            </div>
            <div className="flex-1 space-y-1">
              <h4 className="font-medium text-sm">{LOCATION_PROMPT_COPY.optInTitle}</h4>
              <div className="flex gap-2 mt-3">
                <LocationManager
                  value={currentPostcode}
                  onChange={(next) => {
                    dismissOptIn();
                    onUpdate(next);
                  }}
                  trigger={
                    <Button
                      size="sm"
                      className="min-h-11 min-w-11 flex-1 text-sm font-medium"
                      aria-label={LOCATION_PROMPT_COPY.optInActionLabel}
                    >
                      {LOCATION_PROMPT_COPY.optInAction}
                    </Button>
                  }
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={dismissOptIn}
                  className="min-h-11 min-w-11 flex-1 text-sm font-medium"
                >
                  {LOCATION_PROMPT_COPY.optInDismiss}
                </Button>
              </div>
            </div>
            <button
              onClick={dismissOptIn}
              className="-m-3 p-3 min-h-11 min-w-11 flex items-center justify-center text-muted-foreground hover:text-foreground"
              aria-label="Dismiss region suggestion"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </Card>
      </div>
    );
  }

  if (!wantsMismatch || !detectedRegion) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className={PLACEMENT}
          data-testid="location-mismatch-prompt"
        >
          <Card className="p-4 shadow-xl border-primary/20 bg-background/95 backdrop-blur-md">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-full shrink-0">
                <Navigation className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 space-y-1">
                <h4 className="font-medium text-sm">{LOCATION_PROMPT_COPY.mismatchTitle}</h4>
                <p className="text-xs text-muted-foreground">
                  Looks like you&apos;re in <strong>{detectedRegion.name}</strong>. Want to see the
                  grid there instead?
                </p>
                <div className="flex gap-2 mt-3 block">
                  <Button
                    size="sm"
                    onClick={() => {
                      onUpdate(detectedRegion.postcode);
                      setIsVisible(false);
                    }}
                    className="h-8 text-xs"
                  >
                    Use this region
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsVisible(false)}
                    className="h-8 text-xs"
                  >
                    No thanks
                  </Button>
                </div>
              </div>
              <button
                onClick={() => setIsVisible(false)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Dismiss location prompt"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
