import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FEATURE_GUIDES } from '@/data/feature-guides';

export default function GuideDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const guide = FEATURE_GUIDES.find((g) => g.id === id);

  if (!guide) {
    return <Navigate to="/feature-guides" replace />;
  }

  return (
    <div className="page-shell page-shell--fit">
      <div className="page-shell-inner space-y-6 max-w-2xl mx-auto animate-page-enter">
        <Button variant="ghost" onClick={() => navigate(-1)} className="-ml-4">
          <ChevronLeft className="w-4 h-4 mr-1" /> Back
        </Button>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-full shrink-0">
              <guide.icon className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{guide.title}</h1>
              <p className="text-muted-foreground">{guide.description}</p>
            </div>
          </div>

          <Card className="p-6">
            <div className="prose prose-sm dark:prose-invert max-w-none">{guide.content}</div>
          </Card>
        </div>
      </div>
    </div>
  );
}
