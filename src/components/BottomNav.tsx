import { useLocation } from 'react-router-dom';
import { useTransitionNavigate } from '@/hooks/useTransitionNavigate';
import { Home, ListOrdered, Calendar, Settings, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetTrigger, SheetContent } from '@/components/ui/sheet';
import { NotificationSettings } from '@/components/NotificationSettings';

interface BottomNavProps {
    onHomeClick?: () => void;
}

export function BottomNav({ onHomeClick }: BottomNavProps) {
    const navigate = useTransitionNavigate();
    const location = useLocation();

    const isActive = (path: string) => location.pathname === path;

    const handleHome = () => {
        if (location.pathname === '/' && onHomeClick) {
            onHomeClick();
        } else {
            navigate('/');
        }
    };

    return (
        <div id="bottom-nav" className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">

            {/* Nav Bar */}
            <div className="pointer-events-auto pb-[env(safe-area-inset-bottom)] bg-background/80 backdrop-blur-lg border-t border-border/40">
                <div className="grid grid-cols-5 h-16 max-w-md mx-auto px-1">

                    <Button
                        variant="ghost"
                        className={`flex flex-col items-center gap-1 h-auto py-2 px-1 rounded-lg transition-all ${isActive('/')
                            ? 'text-primary bg-primary/10 font-semibold'
                            : 'text-muted-foreground hover:text-foreground hover:bg-transparent'
                            }`}
                        onClick={handleHome}
                    >
                        <Home className="w-5 h-5" />
                        <span className="text-[10px] font-medium">Home</span>
                    </Button>

                    <Button
                        variant="ghost"
                        data-tour="nav-plan"
                        className={`flex flex-col items-center gap-1 h-auto py-2 px-1 rounded-lg transition-all ${isActive('/planner')
                            ? 'text-primary bg-primary/10 font-semibold'
                            : 'text-muted-foreground hover:text-foreground hover:bg-transparent'
                            }`}
                        onClick={() => navigate('/planner')}
                    >
                        <Calendar className="w-5 h-5" />
                        <span className="text-[10px] font-medium">Plan</span>
                    </Button>

                    <Button
                        variant="ghost"
                        data-tour="nav-history"
                        className={`flex flex-col items-center gap-1 h-auto py-2 px-1 rounded-lg transition-all ${isActive('/history')
                            ? 'text-primary bg-primary/10 font-semibold'
                            : 'text-muted-foreground hover:text-foreground hover:bg-transparent'
                            }`}
                        onClick={() => navigate('/history')}
                    >
                        <Clock className="w-5 h-5" />
                        <span className="text-[10px] font-medium">History</span>
                    </Button>

                    <Button
                        variant="ghost"
                        data-tour="nav-rank"
                        className={`flex flex-col items-center gap-1 h-auto py-2 px-1 rounded-lg transition-all ${isActive('/map')
                            ? 'text-primary bg-primary/10 font-semibold'
                            : 'text-muted-foreground hover:text-foreground hover:bg-transparent'
                            }`}
                        onClick={() => navigate('/map')}
                    >
                        <ListOrdered className="w-5 h-5" />
                        <span className="text-[10px] font-medium">Rank</span>
                    </Button>

                    <Button
                        variant="ghost"
                        className={`flex flex-col items-center gap-1 h-auto py-2 px-1 rounded-lg transition-all ${isActive('/settings')
                            ? 'text-primary bg-primary/10 font-semibold'
                            : 'text-muted-foreground hover:text-foreground hover:bg-transparent'
                            }`}
                        onClick={() => navigate('/settings')}
                    >
                        <Settings className="w-5 h-6" />
                        <span className="text-[10px] font-medium">Settings</span>
                    </Button>

                </div>
            </div>
        </div>
    );
}
