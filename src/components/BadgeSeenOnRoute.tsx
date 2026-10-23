import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { BADGE_SEEN_PATHS, markBadgesSeen } from '@/lib/trophyChip';

/** Opening the Trophy Room or the Rank tab clears the New badge pill and tab dot. */
export function BadgeSeenOnRoute() {
  const { pathname } = useLocation();
  useEffect(() => {
    if (BADGE_SEEN_PATHS.includes(pathname)) markBadgesSeen();
  }, [pathname]);
  return null;
}
