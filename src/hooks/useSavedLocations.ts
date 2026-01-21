import { useState, useEffect, useCallback } from 'react';

export interface SavedLocation {
  id: string;
  name: string;
  postcode: string;
  createdAt: number;
}

const STORAGE_KEY = 'gridgreen-saved-locations';
const RECENT_KEY = 'gridgreen-recent-locations';
const MAX_RECENT = 5;

export function useSavedLocations() {
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [recentLocations, setRecentLocations] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(RECENT_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Persist saved locations
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedLocations));
  }, [savedLocations]);

  // Persist recent locations
  useEffect(() => {
    localStorage.setItem(RECENT_KEY, JSON.stringify(recentLocations));
  }, [recentLocations]);

  const saveLocation = useCallback((name: string, postcode: string) => {
    const newLocation: SavedLocation = {
      id: crypto.randomUUID(),
      name: name.trim(),
      postcode,
      createdAt: Date.now(),
    };
    setSavedLocations((prev) => [...prev, newLocation]);
    return newLocation;
  }, []);

  const removeLocation = useCallback((id: string) => {
    setSavedLocations((prev) => prev.filter((loc) => loc.id !== id));
  }, []);

  const updateLocationName = useCallback((id: string, newName: string) => {
    setSavedLocations((prev) =>
      prev.map((loc) =>
        loc.id === id ? { ...loc, name: newName.trim() } : loc
      )
    );
  }, []);

  const addRecentLocation = useCallback((postcode: string) => {
    setRecentLocations((prev) => {
      const filtered = prev.filter((p) => p !== postcode);
      return [postcode, ...filtered].slice(0, MAX_RECENT);
    });
  }, []);

  const clearRecentLocations = useCallback(() => {
    setRecentLocations([]);
  }, []);

  const isLocationSaved = useCallback(
    (postcode: string) => savedLocations.some((loc) => loc.postcode === postcode),
    [savedLocations]
  );

  const getSavedLocationByPostcode = useCallback(
    (postcode: string) => savedLocations.find((loc) => loc.postcode === postcode),
    [savedLocations]
  );

  return {
    savedLocations,
    recentLocations,
    saveLocation,
    removeLocation,
    updateLocationName,
    addRecentLocation,
    clearRecentLocations,
    isLocationSaved,
    getSavedLocationByPostcode,
  };
}
