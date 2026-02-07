import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Cookie, X } from 'lucide-react';

export const CookieConsent = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      // Small delay so it doesn't flash on load
      const timer = setTimeout(() => setVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const accept = () => {
    localStorage.setItem('cookie-consent', 'accepted');
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem('cookie-consent', 'declined');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-20 left-0 right-0 z-50 px-4 pb-2 animate-in slide-in-from-bottom-8 duration-700 ease-out fill-mode-forwards">
      <div className="mx-auto max-w-md rounded-xl border border-border bg-card p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <Cookie className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div className="space-y-3 flex-1">
            <p className="text-sm text-foreground">
              We use essential cookies and local storage to keep the app working.
              No tracking or advertising cookies are used.{' '}
              <Link to="/privacy" className="underline text-primary hover:text-primary/80">
                Privacy Policy
              </Link>
            </p>
            <div className="flex gap-2">
              <Button size="sm" onClick={accept} className="flex-1">
                Accept
              </Button>
              <Button size="sm" variant="outline" onClick={decline} className="flex-1">
                Decline
              </Button>
            </div>
          </div>
          <button onClick={decline} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
