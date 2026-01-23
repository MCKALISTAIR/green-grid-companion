import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Loader2, Save } from 'lucide-react';
import { useOctopusEnergy } from '@/hooks/useOctopusEnergy';

export function OctopusSettings({ onSaved, onCancel }: { onSaved: () => void; onCancel?: () => void }) {
    const [apiKey, setApiKey] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [showKey, setShowKey] = useState(false);
    const { saveCredentials, isSyncing } = useOctopusEnergy();

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await saveCredentials(apiKey, accountNumber);
            onSaved();
        } catch (error) {
            // Error handled in hook toast
        }
    };

    return (
        <Card className="p-4 border-purple-500/20 bg-purple-500/5">
            <div className="space-y-4">
                <div>
                    <h3 className="font-medium text-foreground">Connect Octopus Energy</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        Enter your credentials to calculate your true carbon footprint and see if you're using energy at the greenest times.
                    </p>
                </div>

                <form onSubmit={handleSave} className="space-y-3">
                    <div className="space-y-1.5">
                        <Label htmlFor="account-number" className="text-xs">Account Number</Label>
                        <Input
                            id="account-number"
                            placeholder="A-12345678"
                            value={accountNumber}
                            onChange={(e) => setAccountNumber(e.target.value)}
                            required
                            className="h-8 bg-background/50"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="api-key" className="text-xs">API Key</Label>
                        <div className="relative">
                            <Input
                                id="api-key"
                                type={showKey ? 'text' : 'password'}
                                placeholder="sk_live_..."
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                required
                                className="h-8 pr-8 bg-background/50"
                            />
                            <button
                                type="button"
                                onClick={() => setShowKey(!showKey)}
                                className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
                            >
                                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        {onCancel && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={onCancel}
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                        )}
                        <Button
                            type="submit"
                            size="sm"
                            className={`bg-purple-600 hover:bg-purple-700 ${onCancel ? 'flex-1' : 'w-full'}`}
                            disabled={isSyncing || !apiKey || !accountNumber}
                        >
                            {isSyncing ? (
                                <>
                                    <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="w-3 h-3 mr-2" />
                                    Save
                                </>
                            )}
                        </Button>
                    </div>
                </form>

                <div className="text-[10px] text-muted-foreground mt-2">
                    Your credentials are stored securely and only used to fetch your meter data.
                    You can find your API Key in the <a href="https://octopus.energy/dashboard/developer/" target="_blank" rel="noreferrer" className="underline hover:text-purple-500">Octopus Developer Dashboard</a>.
                </div>
            </div>
        </Card>
    );
}
