import { Link } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { logger } from '@/lib/logger';
import { Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    logger.warn('404: User attempted to access non-existent route', { path: location.pathname });
  }, [location.pathname]);

  // Lovable hosting serves index.html with HTTP 200 for every path (SPA fallback),
  // so a real 404 status is not possible from the app. Tell crawlers not to index
  // these soft-404s instead.
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex';
    meta.setAttribute('data-gridsense', 'not-found');
    document.head.appendChild(meta);
    const previousTitle = document.title;
    document.title = 'Page not found · GridSense';
    return () => {
      meta.remove();
      document.title = previousTitle;
    };
  }, []);

  return (
    <div className="page-shell page-shell--fit flex items-center justify-center px-6 py-16">
      <div className="text-center space-y-6 max-w-md">
        <div className="space-y-2">
          <h1 className="text-6xl font-bold text-primary">404</h1>
          <h2 className="text-2xl font-semibold text-foreground">Page Not Found</h2>
          <p className="text-muted-foreground">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>
        <Button asChild size="lg">
          <Link to="/" className="gap-2">
            <Home className="w-4 h-4" />
            Return to Home
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
