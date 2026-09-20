/**
 * @deprecated Legacy stub — Settings uses OctopusIntegration instead.
 * Kept only so old imports do not break; Tesla product surface is parked
 * behind FEATURES.tesla in src/config.ts.
 */
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

const OctopusLogo = ({ className }: { className?: string }) => (
    <img
        src="/octopus_logo.png"
        alt="Octopus Energy Logo"
        className={`${className} object-contain`}
    />
);

export function Integrations() {
    return (
        <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Integrations</h2>

            <Card className="p-4 flex items-center justify-between border-primary/15 bg-primary/5">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <OctopusLogo className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-medium text-foreground">Octopus Energy</h3>
                        </div>
                        <p className="text-xs text-muted-foreground max-w-[200px]">
                            Track the impact of using energy at the greenest times.
                        </p>
                    </div>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    disabled={true}
                >
                    Use Settings
                </Button>
            </Card>

            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 text-xs text-muted-foreground flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <p>
                    Prefer Settings → Energy Integrations to link Octopus. Other vehicle integrations are not offered in this release.
                </p>
            </div>
        </div>
    );
}
