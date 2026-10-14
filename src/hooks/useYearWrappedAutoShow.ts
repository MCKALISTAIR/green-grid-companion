import { useState, useEffect } from 'react';

// Check if Year Wrapped should auto-show (December, once per year)
function shouldShowYearWrapped(): { shouldShow: boolean; year: number } {
  const now = new Date();
  const currentMonth = now.getMonth(); // 0-indexed, December = 11
  const currentYear = now.getFullYear();

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
  const [wrappedYear, setWrappedYear] = useState(new Date().getFullYear());

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
