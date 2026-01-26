import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Loader2, Save, AlertCircle } from 'lucide-react';
import { useOctopusEnergy } from '@/hooks/useOctopusEnergy';
import { z } from 'zod';

// Validation schema for Octopus Energy credentials
const credentialsSchema = z.object({
    accountNumber: z
        .string()
        .trim()
        .min(1, 'Account number is required')
        .max(20, 'Account number is too long')
        .regex(
            /^A-[A-Z0-9]{8}$/i,
            'Account number must be in format A-XXXXXXXX (e.g., A-12AB34CD)'
        ),
    apiKey: z
        .string()
        .trim()
        .min(1, 'API key is required')
        .max(100, 'API key is too long')
        .regex(
            /^sk_live_[a-zA-Z0-9]{20,}$/,
            'API key must start with sk_live_ followed by alphanumeric characters'
        ),
});

type CredentialsFormData = z.infer<typeof credentialsSchema>;
type ValidationErrors = Partial<Record<keyof CredentialsFormData, string>>;

export function OctopusSettings({ onSaved, onCancel }: { onSaved: () => void; onCancel?: () => void }) {
    const [apiKey, setApiKey] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [showKey, setShowKey] = useState(false);
    const [errors, setErrors] = useState<ValidationErrors>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const { saveCredentials, isSyncing } = useOctopusEnergy();

    const validateField = (field: keyof CredentialsFormData, value: string): string | undefined => {
        const partialSchema = credentialsSchema.shape[field];
        const result = partialSchema.safeParse(value);
        return result.success ? undefined : result.error.errors[0]?.message;
    };

    const handleAccountNumberChange = (value: string) => {
        // Sanitize input - only allow alphanumeric and dash
        const sanitized = value.replace(/[^a-zA-Z0-9-]/g, '').toUpperCase();
        setAccountNumber(sanitized);
        
        if (touched.accountNumber) {
            setErrors(prev => ({
                ...prev,
                accountNumber: validateField('accountNumber', sanitized)
            }));
        }
    };

    const handleApiKeyChange = (value: string) => {
        // Sanitize input - only allow alphanumeric and underscore
        const sanitized = value.replace(/[^a-zA-Z0-9_]/g, '');
        setApiKey(sanitized);
        
        if (touched.apiKey) {
            setErrors(prev => ({
                ...prev,
                apiKey: validateField('apiKey', sanitized)
            }));
        }
    };

    const handleBlur = (field: keyof CredentialsFormData) => {
        setTouched(prev => ({ ...prev, [field]: true }));
        const value = field === 'accountNumber' ? accountNumber : apiKey;
        setErrors(prev => ({
            ...prev,
            [field]: validateField(field, value)
        }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validate all fields
        const result = credentialsSchema.safeParse({ accountNumber, apiKey });
        
        if (!result.success) {
            const fieldErrors: ValidationErrors = {};
            result.error.errors.forEach(err => {
                const field = err.path[0] as keyof CredentialsFormData;
                if (!fieldErrors[field]) {
                    fieldErrors[field] = err.message;
                }
            });
            setErrors(fieldErrors);
            setTouched({ accountNumber: true, apiKey: true });
            return;
        }
        
        try {
            await saveCredentials(result.data.apiKey, result.data.accountNumber);
            onSaved();
        } catch (error) {
            // Error handled in hook toast
        }
    };

    const isValid = !errors.accountNumber && !errors.apiKey && accountNumber && apiKey;

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
                            onChange={(e) => handleAccountNumberChange(e.target.value)}
                            onBlur={() => handleBlur('accountNumber')}
                            maxLength={11}
                            className={`h-8 bg-background/50 ${
                                errors.accountNumber && touched.accountNumber 
                                    ? 'border-destructive focus-visible:ring-destructive' 
                                    : ''
                            }`}
                            aria-invalid={!!errors.accountNumber}
                            aria-describedby={errors.accountNumber ? 'account-error' : undefined}
                        />
                        {errors.accountNumber && touched.accountNumber && (
                            <p id="account-error" className="text-[10px] text-destructive flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                {errors.accountNumber}
                            </p>
                        )}
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="api-key" className="text-xs">API Key</Label>
                        <div className="relative">
                            <Input
                                id="api-key"
                                type={showKey ? 'text' : 'password'}
                                placeholder="sk_live_..."
                                value={apiKey}
                                onChange={(e) => handleApiKeyChange(e.target.value)}
                                onBlur={() => handleBlur('apiKey')}
                                maxLength={100}
                                className={`h-8 pr-8 bg-background/50 ${
                                    errors.apiKey && touched.apiKey 
                                        ? 'border-destructive focus-visible:ring-destructive' 
                                        : ''
                                }`}
                                aria-invalid={!!errors.apiKey}
                                aria-describedby={errors.apiKey ? 'apikey-error' : undefined}
                            />
                            <button
                                type="button"
                                onClick={() => setShowKey(!showKey)}
                                className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
                                aria-label={showKey ? 'Hide API key' : 'Show API key'}
                            >
                                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                        {errors.apiKey && touched.apiKey && (
                            <p id="apikey-error" className="text-[10px] text-destructive flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                {errors.apiKey}
                            </p>
                        )}
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
                            disabled={isSyncing || !isValid}
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
