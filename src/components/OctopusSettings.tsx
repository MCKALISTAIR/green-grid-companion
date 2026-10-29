import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OCTOPUS_SHEET_COPY as COPY } from '@/lib/voice/octopusLinkCopy';
import type { LinkField } from '@/lib/octopusLink';

/** True when the async clipboard read API exists (permission is only known on first use). */
function clipboardReadable(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.clipboard?.readText === 'function';
}

export interface OctopusSettingsProps {
  formId: string;
  accountNumber: string;
  apiKey: string;
  errors: Partial<Record<LinkField, string>>;
  /** Server error for the whole form (role="alert"), shown above the fields. */
  banner?: string;
  bannerAction?: { label: string; onClick: () => void; disabled?: boolean };
  busy: boolean;
  onChange: (field: LinkField, value: string) => void;
  onBlur: (field: LinkField) => void;
  onPaste: (field: LinkField, value: string) => void;
  onSubmit: () => void;
}

/**
 * The two fields, privacy line and server banner of the Octopus linking sheet
 * (brief 3.2 and 3.3). State lives in OctopusLinkSheet. The key is held in
 * React state only and never written to storage.
 */
export function OctopusSettings({
  formId,
  accountNumber,
  apiKey,
  errors,
  banner,
  bannerAction,
  busy,
  onChange,
  onBlur,
  onPaste,
  onSubmit,
}: OctopusSettingsProps) {
  const [showKey, setShowKey] = useState(false);
  const [canPaste, setCanPaste] = useState(clipboardReadable);

  useEffect(() => setCanPaste(clipboardReadable()), []);

  const paste = async (field: LinkField) => {
    try {
      const text = await navigator.clipboard.readText();
      onPaste(field, text);
    } catch {
      // Not allowed (or not supported): hide the button, long-press paste still works.
      setCanPaste(false);
    }
  };

  const accountError = errors.accountNumber;
  const keyError = errors.apiKey;

  return (
    <form
      id={formId}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="space-y-4"
      noValidate
    >
      {banner && (
        <div
          role="alert"
          data-testid="octopus-link-banner"
          className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-foreground"
        >
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
            <p className="leading-snug">{banner}</p>
          </div>
          {bannerAction && (
            <button
              type="button"
              onClick={bannerAction.onClick}
              disabled={bannerAction.disabled}
              className="mt-2 min-h-11 rounded-lg px-3 text-sm font-semibold text-primary underline-offset-2 hover:underline disabled:opacity-50"
            >
              {bannerAction.label}
            </button>
          )}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="account-number" className="text-sm font-semibold">
          {COPY.accountLabel}
        </Label>
        <div className="relative">
          <Input
            id="account-number"
            name="octopus-account-number"
            placeholder={COPY.accountPlaceholder}
            value={accountNumber}
            onChange={(e) => onChange('accountNumber', e.target.value)}
            onBlur={() => onBlur('accountNumber')}
            readOnly={busy}
            inputMode="text"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="off"
            enterKeyHint="next"
            className={cn(
              'h-12 rounded-xl bg-background text-base',
              canPaste && 'pr-20',
              accountError && 'border-destructive focus-visible:ring-destructive',
            )}
            aria-invalid={!!accountError}
            aria-describedby={accountError ? 'account-error' : 'account-help'}
          />
          {canPaste && (
            <button
              type="button"
              onClick={() => paste('accountNumber')}
              disabled={busy}
              aria-label={COPY.pasteAccountLabel}
              className="absolute right-1.5 top-1/2 h-9 -translate-y-1/2 rounded-lg bg-primary/10 px-3 text-sm font-semibold text-primary hover:bg-primary/15 disabled:opacity-50"
            >
              {COPY.paste}
            </button>
          )}
        </div>
        {accountError ? (
          <p
            id="account-error"
            className="flex items-start gap-1 text-[13px] leading-snug text-destructive"
          >
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {accountError}
          </p>
        ) : (
          <p id="account-help" className="text-xs text-muted-foreground">
            {COPY.accountHelper}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="api-key" className="text-sm font-semibold">
          {COPY.keyLabel}
        </Label>
        <div className="relative">
          <Input
            id="api-key"
            name="octopus-api-key"
            type={showKey ? 'text' : 'password'}
            placeholder={COPY.keyPlaceholder}
            value={apiKey}
            onChange={(e) => onChange('apiKey', e.target.value)}
            onBlur={() => onBlur('apiKey')}
            readOnly={busy}
            maxLength={100}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="off"
            enterKeyHint="go"
            className={cn(
              'h-12 rounded-xl bg-background text-base',
              canPaste ? 'pr-[7.5rem]' : 'pr-12',
              keyError && 'border-destructive focus-visible:ring-destructive',
            )}
            aria-invalid={!!keyError}
            aria-describedby={keyError ? 'apikey-error' : 'apikey-help'}
          />
          <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-1">
            <button
              type="button"
              onClick={() => setShowKey((v) => !v)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground"
              aria-label={showKey ? COPY.hideKey : COPY.showKey}
            >
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
            {canPaste && (
              <button
                type="button"
                onClick={() => paste('apiKey')}
                disabled={busy}
                aria-label={COPY.pasteKeyLabel}
                className="h-9 rounded-lg bg-primary/10 px-3 text-sm font-semibold text-primary hover:bg-primary/15 disabled:opacity-50"
              >
                {COPY.paste}
              </button>
            )}
          </div>
        </div>
        {keyError ? (
          <p
            id="apikey-error"
            className="flex items-start gap-1 text-[13px] leading-snug text-destructive"
          >
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {keyError}
          </p>
        ) : (
          <p id="apikey-help" className="text-xs text-muted-foreground">
            {COPY.keyHelper}
          </p>
        )}
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground" data-testid="octopus-privacy">
        {COPY.privacy}
      </p>
    </form>
  );
}
