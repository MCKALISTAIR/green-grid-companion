import { useState, useEffect, useCallback } from 'react';
import { VERSION_STRING } from '@/lib/version';

const SEEN_VERSION_KEY = 'gridsense-seen-version';

export function useVersionCheck() {
  const [hasNewVersion, setHasNewVersion] = useState(false);

  useEffect(() => {
    const seenVersion = localStorage.getItem(SEEN_VERSION_KEY);
    setHasNewVersion(seenVersion !== VERSION_STRING);
  }, []);

  const markVersionSeen = useCallback(() => {
    localStorage.setItem(SEEN_VERSION_KEY, VERSION_STRING);
    setHasNewVersion(false);
  }, []);

  return { hasNewVersion, markVersionSeen, currentVersion: VERSION_STRING };
}
