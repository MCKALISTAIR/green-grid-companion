import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Placeholder until Alistair signs off the final Terms of Use.
 *
 * The working draft lives in src/content/terms.md, but it still has DRAFT notes
 * and [CONFIRM] markers, so it must NOT be imported here (or anywhere in the
 * app) or it ends up in the public bundle. Terms.test.tsx guards this.
 */
export default function Terms() {
  const navigate = useNavigate();

  // Lovable serves every path with HTTP 200, so tell crawlers not to index this.
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex';
    meta.setAttribute('data-gridsense', 'terms-placeholder');
    document.head.appendChild(meta);
    const previous = document.title;
    document.title = 'Terms coming soon · GridSense';
    return () => {
      meta.remove();
      document.title = previous;
    };
  }, []);

  return (
    <div className="bg-background lg:pb-6">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border/50 px-4 pb-4 pt-[calc(max(env(safe-area-inset-top),59px)+1rem)]">
        <div className="flex items-center gap-2 max-w-2xl mx-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="-ml-2" aria-label="Back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-semibold">Terms coming soon</h1>
        </div>
      </div>

      <article className="p-4 max-w-2xl mx-auto space-y-4 text-sm text-muted-foreground leading-relaxed">
        <p>We're finishing GridSense's terms of use and will publish them here soon.</p>
        <p>
          In the meantime, our{' '}
          <Link to="/privacy" className="underline hover:text-foreground transition-colors">Privacy Policy</Link>{' '}
          explains what data GridSense uses and why.
        </p>
      </article>
    </div>
  );
}
