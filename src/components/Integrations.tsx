import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlugZap, Car, Check, ExternalLink, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export function Integrations() {
    // Simple local mock state for now. In a real app this would come from a backend/hook.
    const [octopusLinked, setOctopusLinked] = useState(false);
    const [teslaLinked, setTeslaLinked] = useState(false);
    const [isLoading, setIsLoading] = useState<string | null>(null);

    const handleLink = async (service: 'octopus' | 'tesla') => {
        setIsLoading(service);

        // Simulate API delay
        setTimeout(() => {
            setIsLoading(null);
            if (service === 'octopus') {
                setOctopusLinked(!octopusLinked);
                toast.success(octopusLinked ? 'Octopus Account Disconnected' : 'Octopus Account Linked');
            } else {
                setTeslaLinked(!teslaLinked);
                toast.success(teslaLinked ? 'Tesla Account Disconnected' : 'Tesla Account Linked');
            }
        }, 1500);
    };

    return (
        <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Integrations</h2>

            {/* Octopus Energy */}
            <Card className="p-4 flex items-center justify-between border-purple-500/20 bg-purple-500/5">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                        <PlugZap className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-medium text-foreground">Octopus Energy</h3>
                            {octopusLinked && <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100">Linked</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground max-w-[200px]">
                            Sync tariffs and usage for smart charging insights.
                        </p>
                    </div>
                </div>
                <Button
                    variant={octopusLinked ? "outline" : "default"}
                    size="sm"
                    onClick={() => handleLink('octopus')}
                    disabled={!!isLoading}
                >
                    {isLoading === 'octopus' ? (
                        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : octopusLinked ? (
                        'Disconnect'
                    ) : (
                        'Connect'
                    )}
                </Button>
            </Card>

            {/* Tesla */}
            <Card className="p-4 flex items-center justify-between border-red-500/20 bg-red-500/5">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                        <Car className="w-6 h-6 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-medium text-foreground">Tesla</h3>
                            {teslaLinked && <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100">Linked</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground max-w-[200px]">
                            Control charging directly based on grid intensity.
                        </p>
                    </div>
                </div>
                <Button
                    variant={teslaLinked ? "outline" : "default"}
                    size="sm"
                    onClick={() => handleLink('tesla')}
                    disabled={!!isLoading}
                >
                    {isLoading === 'tesla' ? (
                        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : teslaLinked ? (
                        'Disconnect'
                    ) : (
                        'Connect'
                    )}
                </Button>
            </Card>

            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 text-xs text-muted-foreground flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <p>
                    Your data is processed locally where possible. Linking accounts allows for automated smart charging and personalized cost estimates.
                </p>
            </div>
        </div>
    );
}
