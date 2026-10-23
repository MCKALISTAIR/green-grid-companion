import { useState, useEffect } from 'react';

/**
 * Returns a live countdown string to a future Date, updating every minute.
 * e.g. "in 2h 15m", "in 42m", "now"
 */
export function useCountdown(target: Date | null): string {
  const getLabel = () => {
    if (!target) return '';
    const diffMs = target.getTime() - Date.now();
    if (diffMs <= 0) return 'now';
    const totalMins = Math.round(diffMs / 60_000);
    const hrs = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    if (hrs > 0 && mins > 0) return `in ${hrs}h ${mins}m`;
    if (hrs > 0) return `in ${hrs}h`;
    return `in ${mins}m`;
  };

  const [label, setLabel] = useState(getLabel);

  useEffect(() => {
    if (!target) return;
    setLabel(getLabel());
    const id = setInterval(() => setLabel(getLabel()), 60_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- getLabel is rebuilt every render; re-run only when the target changes.
  }, [target]);

  return label;
}
