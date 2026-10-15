import { appStorage } from '@/lib/appStorage';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { resolvePostcode } from '@/lib/location';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { logger } from '@/lib/logger';
import { toOutwardCode } from '@/lib/postcode';
import { roundCoords } from '@/lib/coords';

interface Coordinates {
  lat: number;
  lon: number;
}

interface LocationContextType {
  postcode: string;
  setPostcode: (postcode: string) => void;
  coordinates: Coordinates | null;
  isLoading: boolean;
  error: string | null;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

const POSTCODE_KEY = 'gridgreen-postcode';
const COORDS_KEY = 'gridgreen-coords';
// Default UK coordinates (London) as fallback
const DEFAULT_COORDS = { lat: 51.5074, lon: -0.1278 };

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [postcode, setPostcodeState] = useState<string>(() => {
    // Only the outward code is kept. Older installs may have a full postcode
    // saved, so trim it on first read.
    const saved = appStorage.getItem(POSTCODE_KEY) || '';
    const outward = saved ? toOutwardCode(saved) : '';
    if (outward !== saved) appStorage.setItem(POSTCODE_KEY, outward);
    return outward;
  });

  const [coordinates, setCoordinates] = useState<Coordinates | null>(() => {
    // If we have a postcode, we wait for effect to resolve it
    const savedPostcode = appStorage.getItem(POSTCODE_KEY);
    if (savedPostcode) return null;

    // Otherwise try to load cached device location
    const cached = appStorage.getItem(COORDS_KEY);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setPostcode = useCallback((input: string) => {
    const newPostcode = input ? toOutwardCode(input) : '';
    setPostcodeState(newPostcode);
    if (newPostcode) {
      appStorage.setItem(POSTCODE_KEY, newPostcode);
    } else {
      appStorage.removeItem(POSTCODE_KEY);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function updateLocation() {
      setIsLoading(true);
      setError(null);

      try {
        if (postcode) {
          // Resolve postcode
          const resolved = await resolvePostcode(postcode);
          if (!isMounted) return;

          if (resolved) {
            setCoordinates(resolved);
          } else {
            logger.warn('Could not resolve postcode', { postcode });
            setError('Could not resolve location from postcode');
            // Fallback to default if we can't resolve?
            // Or keep previous? Let's set to null or default to indicate failure.
            // If we set to default (London), it might be misleading if the user typed "Edinburgh".
            // But existing code seems to just log warning.
          }
        } else {
          // No postcode, try device location

          let latitude: number;
          let longitude: number;

          try {
            if (Capacitor.isNativePlatform()) {
              const position = await Geolocation.getCurrentPosition({ timeout: 5000 });
              latitude = position.coords.latitude;
              longitude = position.coords.longitude;
            } else if ('geolocation' in navigator) {
              const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
              });
              latitude = position.coords.latitude;
              longitude = position.coords.longitude;
            } else {
              throw new Error('Geolocation not available');
            }

            if (!isMounted) return;

            // Kept at 2 dp: these feed the weather call, so round before storing.
            const newCoords = roundCoords({ lat: latitude, lon: longitude });
            appStorage.setItem(COORDS_KEY, JSON.stringify(newCoords));
            setCoordinates(newCoords);
          } catch (e) {
            if (!isMounted) return;
            logger.debug('Could not get device location', { error: e });
            setError('Location unavailable');

            // Only fallback to default if we don't have coordinates yet
            setCoordinates((prev) => {
              if (!prev) return DEFAULT_COORDS;
              return prev;
            });
          }
        }
      } catch (err) {
        if (!isMounted) return;
        logger.error('Error updating location', { error: err });
        setError('Failed to update location');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    updateLocation();

    return () => {
      isMounted = false;
    };
  }, [postcode]); // Re-run when postcode changes

  return (
    <LocationContext.Provider value={{ postcode, setPostcode, coordinates, isLoading, error }}>
      {children}
    </LocationContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAppLocation() {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useAppLocation must be used within a LocationProvider');
  }
  return context;
}
