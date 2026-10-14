import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Home, Calendar, Bell, Map, LineChart, Sparkles, Plug, MapPin, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

import { FEATURE_GUIDES } from '@/data/feature-guides';

// Removed local definition


export default function FeatureGuides() {
    const navigate = useNavigate();

    return (
        <div className="page-shell page-shell--fit">
            <div className="page-shell-inner space-y-6 animate-page-enter">
                <Button variant="ghost" onClick={() => navigate(-1)} className="-ml-4">
                    <ChevronLeft className="w-4 h-4 mr-1" /> Back
                </Button>

                <div>
                    <h1 className="text-2xl font-bold">Feature Guides</h1>
                    <p className="text-muted-foreground">In-depth guides for each major feature</p>
                </div>

                <div className="grid gap-3">
                    {FEATURE_GUIDES.map((guide) => (
                        <Card
                            key={guide.id}
                            className="p-4 cursor-pointer hover:bg-accent transition-colors"
                            onClick={() => navigate(`/guides/${guide.id}`)}
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-full shrink-0">
                                    <guide.icon className="w-5 h-5 text-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-medium">{guide.title}</h3>
                                    <p className="text-sm text-muted-foreground line-clamp-2">{guide.description}</p>
                                </div>
                                <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                            </div>
                        </Card>
                    ))}
                </div>

                <div className="pt-4 text-center text-sm text-muted-foreground">
                    <p>Need quick answers? Check out <Button variant="link" onClick={() => navigate('/help')} className="h-auto p-0">Help & Tips</Button></p>
                </div>
            </div>
        </div>
    );
}
