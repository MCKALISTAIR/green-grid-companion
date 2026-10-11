import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Link, useLocation } from 'react-router-dom';
import { Cookie, X } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { cn } from '@/lib/utils';
import { getConsent, setConsent } from '@/lib/consent';

export const CookieConsent = () => {
  const [visible, setVisible] = useState(false);
  const { theme } = useTheme();
  const location = useLocation();

  const isDark = useMemo(() => {
    // Onboarding forces a dark immersive background even when the global theme is light,
    // so the banner must follow the visual context, not just the stored theme preference.
    if (location.pathname === '/onboarding') return true;
    if (theme === 'dark') return true;
    if (theme === 'light') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }, [theme, location.pathname]);

  // Keep cookie chrome off immersive onboarding so the first CTA stays clear.
  const onOnboarding = location.pathname === '/onboarding';

  useEffect(() => {
    if (onOnboarding) {
      setVisible(false);
      return;
    }
    const consent = getConsent();
    if (!consent) {
      // Small delay so it doesn't flash on load
      const timer = setTimeout(() => setVisible(true), 1000);
      return () => clearTimeout(timer);
    }
    setVisible(false);
  }, [onOnboarding]);

  const accept = () => {
    setConsent('accepted');
    setVisible(false);
  };

  const decline = () => {
    setConsent('declined');
    setVisible(false);
  };

  if (!visible || onOnboarding) return null;

  return (
    <div
      role="region"
      aria-label="Cookie and diagnostics choice"
      className="fixed bottom-20 sm:bottom-4 left-0 right-0 z-50 px-4 pb-2 animate-in slide-in-from-bottom-8 duration-700 ease-out fill-mode-forwards"
    >
      <div
        className={cn(
          'mx-auto max-w-md rounded-xl border p-4 shadow-lg backdrop-blur-md',
          isDark
            ? 'border-white/10 bg-slate-900/90 text-white'
            : 'border-border bg-card/95 text-foreground'
        )}
      >
        <div className="flex items-start gap-3">
          <Cookie className={cn('h-5 w-5 mt-0.5 shrink-0', isDark ? 'text-green-400' : 'text-primary')} />
          <div className="space-y-3 flex-1">
            <p className={cn('text-sm', isDark ? 'text-white/90' : 'text-foreground')}>
              We store your settings on this device and send anonymous crash reports so we
              can fix bugs. If you accept, we also collect performance data and occasional
              privacy-masked session recordings (via Sentry) to improve the app. Decline
              keeps it to the essentials. No advertising cookies.{' '}
              <Link to="/privacy" className={cn('underline', isDark ? 'text-green-400 hover:text-green-300' : 'text-primary hover:text-primary/80')}>
                Privacy Policy
              </Link>
            </p>
            <div className="flex gap-2">
              <Button size="sm" onClick={accept} className="flex-1">
                Accept
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={decline}
                className={cn('flex-1', isDark && 'border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white')}
              >
                Decline
              </Button>
            </div>
          </div>
          <button
            onClick={decline}
            className={cn('hover:text-foreground', isDark ? 'text-white/60 hover:text-white' : 'text-muted-foreground')}
            aria-label="Close cookie consent banner (Decline)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
