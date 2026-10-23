import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { NotificationType } from '@capacitor/haptics';
import { Check, ChevronDown, ExternalLink, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { TurbineSpinner } from '@/components/ui/turbine-spinner';
import { OctopusSettings } from '@/components/OctopusSettings';
import { OctopusReferralLine } from '@/components/OctopusReferralLine';
import { useOctopusEnergy, type FirstSyncResult } from '@/hooks/useOctopusEnergy';
import { useOffline } from '@/hooks/useOffline';
import { hapticNotification } from '@/lib/haptics';
import { readTone } from '@/lib/tone';
import { syncFailureMessage } from '@/lib/octopusSyncOutcome';
import {
  accountNumberError,
  apiKeyError,
  bannerMessage,
  fieldMessage,
  mpanEnding,
  normaliseAccountNumber,
  sanitiseApiKey,
  type LinkField,
  type LinkResult,
  type LinkedMeter,
} from '@/lib/octopusLink';
import {
  OCTOPUS_API_PAGE_URL,
  OCTOPUS_BANNER_COPY,
  OCTOPUS_DASHBOARD_URL,
  OCTOPUS_SHEET_COPY as COPY,
  OCTOPUS_SUCCESS_COPY as DONE,
} from '@/lib/voice/octopusLinkCopy';
import { cn } from '@/lib/utils';

const FORM_ID = 'octopus-link-form';

interface OctopusLinkSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Octopus linking sheet (brief 3.2 to 3.5): two guided steps, the form, then
 * the success screen with the first sync. Bottom sheet on phones, dialog at
 * 768 and up, steps side by side at 1024 and up.
 */
export function OctopusLinkSheet({ open, onOpenChange }: OctopusLinkSheetProps) {
  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-[480px] lg:max-w-3xl"
        data-testid="octopus-link-sheet"
      >
        {/* Mounted only while open, so the typed key is dropped on close. */}
        {open && <LinkSheetBody onClose={() => onOpenChange(false)} />}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

type Phase =
  | { kind: 'form' }
  | {
      kind: 'success';
      meters: LinkedMeter[];
      account: string;
      sync: FirstSyncResult | 'running';
    };

function LinkSheetBody({ onClose }: { onClose: () => void }) {
  const { saveCredentials, recheckMeters, firstSync } = useOctopusEnergy();
  const { isOffline } = useOffline();
  const navigate = useNavigate();

  const [accountNumber, setAccountNumber] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [errors, setErrors] = useState<Partial<Record<LinkField, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<LinkField, boolean>>>({});
  const [failure, setFailure] = useState<LinkResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [rechecking, setRechecking] = useState(false);
  const [stepsOpen, setStepsOpen] = useState({ one: true, two: true });
  const [phase, setPhase] = useState<Phase>({ kind: 'form' });

  // The success screen keeps syncing after the sheet closes; this tells the
  // sync result where to go (in place, or a toast).
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const syncRunning = phase.kind === 'success' && phase.sync === 'running';
  const syncRunningRef = useRef(false);
  syncRunningRef.current = syncRunning;
  useEffect(
    () => () => {
      if (syncRunningRef.current) toast.success(DONE.closedEarlyToast);
    },
    [],
  );

  const formatOk = !accountNumberError(accountNumber) && !apiKeyError(apiKey);
  const validate = (field: LinkField, value: string) =>
    field === 'accountNumber' ? accountNumberError(value) : apiKeyError(value);
  const normalise = (field: LinkField, raw: string) =>
    field === 'accountNumber' ? normaliseAccountNumber(raw) : sanitiseApiKey(raw);
  const setValue = (field: LinkField, v: string) =>
    field === 'accountNumber' ? setAccountNumber(v) : setApiKey(v);

  const onChange = (field: LinkField, raw: string) => {
    setValue(field, normalise(field, raw));
    // Clear the error while typing; check again on blur.
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
    if (failure && !failure.ok && failure.field === field) setFailure(null);
  };

  const onBlur = (field: LinkField) => {
    const value = field === 'accountNumber' ? accountNumber : apiKey;
    if (!value && !touched[field]) return;
    setTouched((t) => ({ ...t, [field]: true }));
    setErrors((e) => ({ ...e, [field]: validate(field, value) }));
  };

  const onPaste = (field: LinkField, raw: string) => {
    const v = normalise(field, raw);
    setValue(field, v);
    setTouched((t) => ({ ...t, [field]: true }));
    setErrors((e) => ({ ...e, [field]: v ? validate(field, v) : undefined }));
    if (failure && !failure.ok && failure.field === field) setFailure(null);
  };

  const showFailure = (result: LinkResult) => {
    setFailure(result);
    const msg = fieldMessage(result);
    if (msg && !result.ok && result.field) setErrors((e) => ({ ...e, [result.field!]: msg }));
    // Fold the steps away so the error and the fields are in view (mock: form-error).
    setStepsOpen({ one: false, two: false });
    void hapticNotification(NotificationType.Error);
  };

  const startFirstSync = async (meters: LinkedMeter[], account: string) => {
    setPhase({ kind: 'success', meters, account, sync: 'running' });
    void hapticNotification(NotificationType.Success);
    const result = await firstSync();
    if (mounted.current) {
      setPhase({ kind: 'success', meters, account, sync: result });
    } else if (result.outcome !== 'ok') {
      // The sheet was closed before the sync finished: the result still needs saying.
      toast.error(syncFailureMessage(result.outcome, readTone()));
    }
  };

  const submit = async () => {
    if (busy || isOffline) return;
    const accErr = accountNumberError(accountNumber);
    const keyErr = apiKeyError(apiKey);
    if (accErr || keyErr) {
      setErrors({ accountNumber: accErr, apiKey: keyErr });
      setTouched({ accountNumber: true, apiKey: true });
      return;
    }
    setBusy(true);
    setFailure(null);
    const account = accountNumber.trim();
    const result = await saveCredentials(apiKey.trim(), account);
    if (!mounted.current) return;
    setBusy(false);
    if (result.ok) void startFirstSync(result.meters, account);
    else showFailure(result);
  };

  const checkAgain = async () => {
    setRechecking(true);
    const result = await recheckMeters();
    if (!mounted.current) return;
    setRechecking(false);
    if (result.ok) {
      setFailure(null);
      void startFirstSync(result.meters, accountNumber.trim());
    } else {
      showFailure(result);
    }
  };

  if (phase.kind === 'success') {
    return (
      <SuccessView
        phase={phase}
        onDone={onClose}
        onSeeFootprint={() => {
          onClose();
          navigate('/', { state: { dashboardView: 'footprint' } });
        }}
      />
    );
  }

  const banner = isOffline ? OCTOPUS_BANNER_COPY.offline : failure && bannerMessage(failure);
  const bannerAction =
    !isOffline && failure && !failure.ok && failure.reason === 'no_meter'
      ? { label: OCTOPUS_BANNER_COPY.checkAgain, onClick: checkAgain, disabled: rechecking }
      : undefined;
  const fieldErrors = {
    accountNumber: touched.accountNumber || errors.accountNumber ? errors.accountNumber : undefined,
    apiKey: touched.apiKey || errors.apiKey ? errors.apiKey : undefined,
  };

  return (
    <>
      <ResponsiveDialogHeader className="text-left">
        <ResponsiveDialogTitle className="font-display text-xl">{COPY.title}</ResponsiveDialogTitle>
        <ResponsiveDialogDescription>{COPY.subtitle}</ResponsiveDialogDescription>
      </ResponsiveDialogHeader>

      <div className="grid gap-3 lg:grid-cols-2 lg:items-start">
        <Step
          testId="octopus-step-1"
          title={COPY.step1Title}
          open={stepsOpen.one}
          onOpenChange={(one) => setStepsOpen((s) => ({ ...s, one }))}
        >
          <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-foreground">
            <li>
              {COPY.step1Items.signIn}{' '}
              <span className="text-xs text-muted-foreground">{COPY.step1Items.signInNote}</span>
            </li>
            <li>
              {COPY.step1Items.openPage}
              <ExternalButton href={OCTOPUS_API_PAGE_URL} label={COPY.apiPageButton} />
            </li>
            <li>
              {COPY.step1Items.regenerate}
              <div className="mt-2 rounded-lg bg-amber-100 px-3 py-2 text-[13px] leading-snug text-amber-950 dark:bg-amber-400/15 dark:text-amber-100">
                <strong>{COPY.tipLead}</strong> {COPY.tip}
              </div>
            </li>
            <li>
              {COPY.step1Items.copyKeyLead} <strong className="font-semibold">sk_live_</strong>.
            </li>
          </ol>
          <p className="mt-2 text-xs leading-snug text-muted-foreground">{COPY.smallPrint}</p>
        </Step>

        <Step
          testId="octopus-step-2"
          title={COPY.step2Title}
          open={stepsOpen.two}
          onOpenChange={(two) => setStepsOpen((s) => ({ ...s, two }))}
        >
          <p className="text-sm leading-relaxed text-foreground">{COPY.step2Body}</p>
          <ExternalButton href={OCTOPUS_DASHBOARD_URL} label={COPY.dashboardButton} />
        </Step>
      </div>

      <OctopusSettings
        formId={FORM_ID}
        accountNumber={accountNumber}
        apiKey={apiKey}
        errors={fieldErrors}
        banner={banner || undefined}
        bannerAction={bannerAction}
        busy={busy}
        onChange={onChange}
        onBlur={onBlur}
        onPaste={onPaste}
        onSubmit={submit}
      />

      <OctopusReferralLine className="text-xs text-muted-foreground" />

      <SheetFooter>
        <Button
          type="submit"
          form={FORM_ID}
          className="h-12 w-full rounded-xl text-base font-semibold"
          disabled={busy || isOffline || !formatOk}
          aria-busy={busy}
          data-testid="octopus-link-submit"
        >
          {busy ? (
            <>
              <TurbineSpinner size="sm" className="mr-2" />
              {COPY.submitting}
            </>
          ) : (
            COPY.submit
          )}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="h-11 w-full text-primary"
          onClick={onClose}
        >
          {COPY.cancel}
        </Button>
      </SheetFooter>
    </>
  );
}

/**
 * Sticky at the bottom of the sheet's scroll area, so the main button stays in
 * the thumb zone. The negative bottom cancels the scroll area's padding (sheet
 * 1rem, dialog 1.5rem), so nothing scrolls past underneath it.
 */
function SheetFooter({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="sticky -bottom-4 z-10 -mx-4 -mb-4 mt-auto space-y-1 border-t border-border/50 bg-background px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 md:-bottom-6 md:-mx-6 md:-mb-6 md:px-6"
      data-testid="octopus-sheet-footer"
    >
      {children}
    </div>
  );
}

function Step({
  title,
  open,
  onOpenChange,
  testId,
  children,
}: {
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  testId: string;
  children: React.ReactNode;
}) {
  return (
    <Collapsible
      open={open}
      onOpenChange={onOpenChange}
      className="rounded-2xl border border-border bg-card/60 px-4 py-3"
      data-testid={testId}
    >
      <CollapsibleTrigger className="flex min-h-11 w-full items-center justify-between gap-2 text-left">
        <h3 className="text-[15px] font-semibold text-foreground">{title}</h3>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
            open && 'rotate-180',
          )}
          aria-hidden="true"
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="pb-1 pt-1">{children}</CollapsibleContent>
    </Collapsible>
  );
}

function ExternalButton({ href, label }: { href: string; label: string }) {
  // A plain link: on iOS the app-wide external-link handler opens it in the system browser.
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="mt-2 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border-[1.5px] border-primary px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/5"
    >
      {label}
      <ExternalLink className="h-4 w-4" aria-hidden="true" />
    </a>
  );
}

function SuccessView({
  phase,
  onDone,
  onSeeFootprint,
}: {
  phase: Extract<Phase, { kind: 'success' }>;
  onDone: () => void;
  onSeeFootprint: () => void;
}) {
  const { meters, account, sync } = phase;
  const running = sync === 'running';
  const readingsIn = !running && sync.outcome === 'ok' && sync.readings > 0;
  const syncLine = running
    ? DONE.syncing
    : sync.outcome === 'ok'
      ? sync.readings > 0
        ? DONE.readingsIn(sync.readings)
        : DONE.zeroReadings
      : syncFailureMessage(sync.outcome, readTone());

  return (
    <>
      <ResponsiveDialogHeader className="text-left">
        <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Check className="h-6 w-6" aria-hidden="true" />
        </div>
        <ResponsiveDialogTitle className="font-display text-xl">{DONE.title}</ResponsiveDialogTitle>
        <ResponsiveDialogDescription>
          {DONE.found(meters.length, account)}
        </ResponsiveDialogDescription>
      </ResponsiveDialogHeader>

      <ul className="space-y-2" data-testid="octopus-linked-meters">
        {meters.map((m) => (
          <li
            key={`${m.mpan}-${m.serial_number ?? ''}`}
            className="flex items-center justify-between gap-2 rounded-xl border border-border px-3 py-2.5 text-sm"
          >
            <span className="flex items-center gap-2">
              <Zap className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              {DONE.meterRow(mpanEnding(m.mpan))}
            </span>
            {m.meter_type === 'export' && (
              <Badge
                variant="outline"
                className="border-primary/20 bg-primary/10 text-[11px] text-primary"
              >
                {DONE.exportBadge}
              </Badge>
            )}
          </li>
        ))}
      </ul>

      <p className="text-xs leading-relaxed text-muted-foreground">{DONE.gasLine}</p>

      <div
        role="status"
        aria-live="polite"
        data-testid="octopus-first-sync"
        className="flex items-start gap-2 rounded-xl bg-primary/5 px-3 py-2.5 text-sm leading-snug text-foreground"
      >
        {running && <TurbineSpinner size="sm" className="mt-0.5 shrink-0" />}
        <span>{syncLine}</span>
      </div>

      <SheetFooter>
        {readingsIn ? (
          <>
            <Button
              className="h-12 w-full rounded-xl text-base font-semibold"
              onClick={onSeeFootprint}
            >
              {DONE.seeFootprint}
            </Button>
            <Button variant="ghost" className="h-11 w-full text-primary" onClick={onDone}>
              {DONE.done}
            </Button>
          </>
        ) : (
          <Button
            className="h-12 w-full rounded-xl text-base font-semibold"
            onClick={onDone}
            variant={running ? 'outline' : 'default'}
          >
            {DONE.done}
          </Button>
        )}
      </SheetFooter>
    </>
  );
}
