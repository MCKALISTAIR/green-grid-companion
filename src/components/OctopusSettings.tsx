import { useState, forwardRef } from 'react';
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

interface OctopusSettingsProps {
    onSaved: () => void;
    onCancel?: () => void;
}

export const OctopusSettings = forwardRef<HTMLDivElement, OctopusSettingsProps>(({ onSaved, onCancel }, ref) => {
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

        // Clear error while typing (don't re-validate until blur)
        if (errors.accountNumber) {
            setErrors(prev => ({ ...prev, accountNumber: undefined }));
        }
    };

    const handleApiKeyChange = (value: string) => {
        // Sanitize input - only allow alphanumeric and underscore
        const sanitized = value.replace(/[^a-zA-Z0-9_]/g, '');
        setApiKey(sanitized);

        // Clear error while typing (don't re-validate until blur)
        if (errors.apiKey) {
            setErrors(prev => ({ ...prev, apiKey: undefined }));
        }
    };

    const handleBlur = (field: keyof CredentialsFormData) => {
        const value = field === 'accountNumber' ? accountNumber : apiKey;
        // Only validate on blur if the user has actually interacted (field has content or was previously touched)
        if (value || touched[field]) {
            setTouched(prev => ({ ...prev, [field]: true }));
            setErrors(prev => ({
                ...prev,
                [field]: validateField(field, value)
            }));
        }
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
        <Card ref={ref} className="p-4 border-primary/15 bg-primary/5">
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
                            className={`h-8 bg-background/50 ${errors.accountNumber && touched.accountNumber
                                    ? 'border-destructive focus-visible:ring-destructive'
                                    : ''
                                }`}
                            aria-invalid={!!(errors.accountNumber && touched.accountNumber)}
                            aria-describedby={errors.accountNumber && touched.accountNumber ? 'account-error' : undefined}
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
                                className={`h-8 pr-8 bg-background/50 ${errors.apiKey && touched.apiKey
                                        ? 'border-destructive focus-visible:ring-destructive'
                                        : ''
                                    }`}
                                aria-invalid={!!(errors.apiKey && touched.apiKey)}
                                aria-describedby={errors.apiKey && touched.apiKey ? 'apikey-error' : undefined}
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
                            className={`bg-primary hover:bg-primary/90 ${onCancel ? 'flex-1' : 'w-full'}`}
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

                <div className="text-[10px] text-muted-foreground mt-2 space-y-2">
                    <p>
                        Your API key is sent once over HTTPS and stored encrypted on our servers (never on this device). It is only used to fetch your meter data.
                        You can find your API Key in the <a href="https://octopus.energy/dashboard/developer/" target="_blank" rel="noreferrer" className="underline hover:text-primary">Octopus Developer Dashboard</a>.
                    </p>
                    <p className="pt-2 border-t border-primary/20">
                        Not with Octopus yet? <a href="https://share.octopus.energy/light-sheep-695" target="_blank" rel="noreferrer" className="underline font-medium text-primary hover:text-primary/80">Join with £50 free credit</a>
                    </p>
                </div>
            </div>
        </Card>
    );
});

OctopusSettings.displayName = 'OctopusSettings';
