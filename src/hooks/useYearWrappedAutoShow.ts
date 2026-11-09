import { useState, useEffect } from 'react';
import { londonDateKey } from '@/lib/londonTime';

// Check if Year Wrapped should auto-show (December, once per year)
function shouldShowYearWrapped(): { shouldShow: boolean; year: number } {
  const now = new Date();
  const key = londonDateKey(now);
  const currentMonth = Number(key.slice(5, 7)) - 1;
  const currentYear = Number(key.slice(0, 4));

  // Only show in December
  if (currentMonth !== 11) {
    return { shouldShow: false, year: currentYear };
  }

  // Check if already shown this year
  const storageKey = `year-wrapped-auto-shown-${currentYear}`;
  const alreadyShown = localStorage.getItem(storageKey) === 'true';

  return { shouldShow: !alreadyShown, year: currentYear };
}

function markYearWrappedShown(year: number) {
  localStorage.setItem(`year-wrapped-auto-shown-${year}`, 'true');
}

export function useYearWrappedAutoShow() {
  const [showYearWrapped, setShowYearWrapped] = useState(false);
  const [wrappedYear, setWrappedYear] = useState(Number(londonDateKey(new Date()).slice(0, 4)));

  // Auto-show Year Wrapped in December (once per year)
  useEffect(() => {
    const { shouldShow, year } = shouldShowYearWrapped();
    if (shouldShow) {
      // Delay slightly so the main UI loads first
      const timer = setTimeout(() => {
        setWrappedYear(year);
        setShowYearWrapped(true);
        markYearWrappedShown(year);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  return { showYearWrapped, setShowYearWrapped, wrappedYear };
}
