import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Design's error-state card (artpass/errors/SPEC.md). */
export type ErrorTint = 'amber' | 'red' | 'blue';

const TINT: Record<ErrorTint, string> = {
  amber: 'bg-[#fff1d6] text-[#9a5b00]',
  red: 'bg-[#fde4e1] text-[#a3261a]',
  blue: 'bg-[#e2ecfb] text-[#24508f]',
};

export interface ErrorAction {
  label: string;
  onClick: () => void;
  kind?: 'primary' | 'secondary' | 'destructive';
}

export function ErrorActionButton({ label, onClick, kind = 'primary' }: ErrorAction) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        kind === 'primary' && 'bg-[#2f7d5b] text-white hover:bg-[#276b4e]',
        kind === 'destructive' && 'bg-[#a3261a] text-white hover:bg-[#8a2016]',
        kind === 'secondary' && 'border border-border bg-background text-foreground hover:bg-muted',
      )}
    >
      {label}
    </button>
  );
}

interface ErrorStateCardProps {
  tint: ErrorTint;
  icon: LucideIcon;
  /** Optional: without one, the icon sits beside the body (BH-89's offline card). */
  title?: string;
  body?: ReactNode;
  actions?: ErrorAction[];
  children?: ReactNode;
  className?: string;
  testId?: string;
  /** 'alert' for failures the user just caused; 'status' otherwise. */
  role?: 'status' | 'alert';
}

export function ErrorStateCard({
  tint,
  icon: Icon,
  title,
  body,
  actions,
  children,
  className,
  testId,
  role = 'status',
}: ErrorStateCardProps) {
  const badge = (
    <span
      className={cn(
        'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
        TINT[tint],
      )}
      aria-hidden="true"
    >
      <Icon className="h-4 w-4" />
    </span>
  );
  if (!title) {
    return (
      <div
        role={role}
        data-testid={testId}
        data-tint={tint}
        className={cn(
          'flex items-start gap-2.5 rounded-[20px] border border-border/60 bg-white p-4 shadow-sm dark:bg-card',
          className,
        )}
      >
        {badge}
        <div className="min-w-0 flex-1">
          {body && (
            <p className="text-sm leading-[1.4] text-[#3c4752] dark:text-muted-foreground">
              {body}
            </p>
          )}
          {children}
          {actions && actions.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {actions.map((a) => (
                <ErrorActionButton key={a.label} {...a} />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }
  return (
    <div
      role={role}
      data-testid={testId}
      data-tint={tint}
      className={cn(
        'rounded-[20px] border border-border/60 bg-white p-4 shadow-sm dark:bg-card',
        className,
      )}
    >
      <h3 className="flex items-center gap-2.5 text-base font-extrabold leading-tight text-foreground">
        {badge}
        {title}
      </h3>
      {body && (
        <p className="mt-2 text-sm leading-[1.4] text-[#3c4752] dark:text-muted-foreground">
          {body}
        </p>
      )}
      {children}
      {actions && actions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {actions.map((a) => (
            <ErrorActionButton key={a.label} {...a} />
          ))}
        </div>
      )}
    </div>
  );
}
