import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MarkdownDocument } from '@/components/MarkdownDocument';
import termsSource from '@/content/terms.md?raw';

export default function Terms() {
  const navigate = useNavigate();

  useEffect(() => {
    const previous = document.title;
    document.title = 'Terms of Use · GridSense';
    return () => {
      document.title = previous;
    };
  }, []);

  return (
    <div className="bg-background lg:pb-6">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border/50 px-4 pb-4 pt-[calc(max(env(safe-area-inset-top),59px)+1rem)]">
        <div className="flex items-center gap-2 max-w-2xl mx-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="-ml-2"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-semibold">Terms of Use</h1>
        </div>
      </div>

      <article className="p-4 max-w-2xl mx-auto space-y-4 animate-page-enter">
        <MarkdownDocument source={termsSource} />
      </article>
    </div>
  );
}
