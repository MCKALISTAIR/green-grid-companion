import { useNavigate, useLocation } from 'react-router-dom';
import { Home, ListOrdered, Calendar, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetTrigger, SheetContent } from '@/components/ui/sheet';
import { NotificationSettings } from '@/components/NotificationSettings';

interface BottomNavProps {
    onHomeClick?: () => void;
}

export function BottomNav({ onHomeClick }: BottomNavProps) {
    const navigate = useNavigate();
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
        <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
            {/* Gradient fade to integrate nicely */}
            <div className="absolute bottom-0 left-0 right-0 top-12 bg-gradient-to-t from-background via-background/80 to-transparent h-24 -z-10" />

            {/* Nav Bar */}
            <div className="pointer-events-auto pb-[env(safe-area-inset-bottom)] bg-background/80 backdrop-blur-lg border-t border-border/40">
                <div className="grid grid-cols-4 h-16 max-w-md mx-auto px-2">

                    <Button
                        variant="ghost"
                        className={`flex flex-col items-center gap-1 h-auto py-2 px-1 hover:bg-transparent ${isActive('/') ? 'text-primary' : 'text-muted-foreground'}`}
                        onClick={handleHome}
                    >
                        <Home className="w-5 h-5" />
                        <span className="text-[10px] font-medium">Home</span>
                    </Button>

                    <Button
                        variant="ghost"
                        className={`flex flex-col items-center gap-1 h-auto py-2 px-1 hover:bg-transparent ${isActive('/map') ? 'text-primary' : 'text-muted-foreground'}`}
                        onClick={() => navigate('/map')}
                    >
                        <ListOrdered className="w-5 h-5" />
                        <span className="text-[10px] font-medium">Leaderboard</span>
                    </Button>

                    <Button
                        variant="ghost"
                        className={`flex flex-col items-center gap-1 h-auto py-2 px-1 hover:bg-transparent ${isActive('/planner') ? 'text-primary' : 'text-muted-foreground'}`}
                        onClick={() => navigate('/planner')}
                    >
                        <Calendar className="w-5 h-5" />
                        <span className="text-[10px] font-medium">Plan</span>
                    </Button>

                    <Button
                        variant="ghost"
                        className={`flex flex-col items-center gap-1 h-auto py-2 px-1 hover:bg-transparent ${isActive('/settings') ? 'text-primary' : 'text-muted-foreground'}`}
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
