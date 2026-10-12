import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { getConsent, onConsentChange, setConsent, type ConsentChoice } from '@/lib/consent';
import { CONSENT_COPY, CONSENT_SETTINGS_COPY } from '@/lib/voice/consentCopy';

/** Settings > Privacy: the same equal-weight choice as the sheet, showing the current state. */
export function PrivacyChoiceRow() {
  const [choice, setChoice] = useState<ConsentChoice | null>(() => getConsent());
  const descId = useId();
  useEffect(() => onConsentChange(setChoice), []);

  const choose = (next: ConsentChoice) => {
    setConsent(next);
    toast.success(CONSENT_SETTINGS_COPY.saved[next]);
  };

  return (
    <div className="sheet-surface p-4 space-y-3" data-testid="settings-privacy">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-primary/10 rounded-full">
          <ShieldCheck className="w-5 h-5 text-primary" aria-hidden="true" />
        </div>
        <div>
          <h3 className="font-medium">{CONSENT_SETTINGS_COPY.title}</h3>
          <p className="text-sm text-muted-foreground">{CONSENT_SETTINGS_COPY.helper}</p>
          <p id={descId} className="mt-1 text-sm font-medium text-foreground">
            {CONSENT_SETTINGS_COPY.current[choice ?? 'unset']}{' '}
            <Link to="/privacy" className="text-primary underline underline-offset-2">
              {CONSENT_COPY.privacyLink}
            </Link>
          </p>
        </div>
      </div>
      {/* Same style for both; the current one is marked with aria-pressed, not colour alone. */}
      <div className="grid grid-cols-2 gap-2" role="group" aria-labelledby={descId}>
        {(['declined', 'accepted'] as const).map((c) => (
          <Button
            key={c}
            type="button"
            variant="outline"
            className="min-h-11 h-auto"
            aria-pressed={choice === c}
            onClick={() => choose(c)}
          >
            {choice === c && <Check className="h-4 w-4" aria-hidden="true" />}
            {c === 'accepted' ? CONSENT_COPY.accept : CONSENT_COPY.decline}
          </Button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{CONSENT_SETTINGS_COPY.footnote}</p>
    </div>
  );
}
