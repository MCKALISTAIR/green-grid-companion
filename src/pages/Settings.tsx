import { NotificationSettings } from '@/components/NotificationSettings';
import { Integrations } from '@/components/Integrations';
import { BottomNav } from '@/components/BottomNav';

export default function Settings() {
    return (
        <div className="min-h-screen bg-background pb-[calc(6rem+env(safe-area-inset-bottom))]">
            <div className="p-4 pt-[max(2rem,env(safe-area-inset-top))] space-y-8">
                <div>
                    <h1 className="text-2xl font-bold">Settings</h1>
                    <p className="text-muted-foreground">Manage notifications and preferences.</p>
                </div>

                <Integrations />
                <NotificationSettings />
            </div>
            <BottomNav />
        </div>
    );
}
