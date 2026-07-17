import { useState, useEffect } from 'react';

/**
 * Returns a live-updating relative time string for a given ISO timestamp.
 * e.g. "just now", "2 mins ago", "1 hr ago"
 * Updates every 30 seconds.
 */
export function useRelativeTime(isoTimestamp: string | null | undefined): string {
  const getLabel = () => {
    if (!isoTimestamp) return '';
    const ageMs = Date.now() - new Date(isoTimestamp).getTime();
    const ageSecs = Math.floor(ageMs / 1000);
    const ageMins = Math.floor(ageSecs / 60);
    const ageHours = Math.floor(ageMins / 60);

    if (ageSecs < 45) return 'just now';
    if (ageMins < 60) return `${ageMins} min${ageMins === 1 ? '' : 's'} ago`;
    if (ageHours < 24) return `${ageHours} hr${ageHours === 1 ? '' : 's'} ago`;
    return 'a while ago';
  };

  const [label, setLabel] = useState(getLabel);

  useEffect(() => {
    if (!isoTimestamp) return;
    setLabel(getLabel());
    const id = setInterval(() => setLabel(getLabel()), 30_000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isoTimestamp]);

  return label;
}
